
-- 1. อัปเดตโครงสร้างตาราง (Schema Updates)


-- เพิ่มสถานะ CLOSED ให้กับรอบนำเที่ยว
ALTER TABLE public.tour_schedules DROP CONSTRAINT IF EXISTS tour_schedules_status_check;
ALTER TABLE public.tour_schedules ADD CONSTRAINT tour_schedules_status_check 
  CHECK (status IN ('OPEN', 'FULL', 'CLOSED', 'CANCELLED', 'COMPLETED'));

-- เพิ่มระบบเช็กชื่อ (Attendance) ให้กับตาราง Bookings ตาม Decision 10
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS attendance_status text NOT NULL DEFAULT 'NOT_CHECKED_IN' 
  CHECK (attendance_status IN ('NOT_CHECKED_IN', 'CHECKED_IN', 'NO_SHOW'));
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;


-- 2. ฟังก์ชันกดยอมรับ/ปฏิเสธงาน (Persisted Accept/Decline)

CREATE OR REPLACE FUNCTION public.update_my_assignment_status(
  p_assignment_id uuid,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('ACCEPTED', 'DECLINED') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Invalid status';
  END IF;

  UPDATE public.guide_assignments
  SET status = p_status,
      assigned_at = now() -- อัปเดต timestamp 
  WHERE id = p_assignment_id
    AND guide_id = auth.uid() -- ล็อกให้เฉพาะเจ้าตัวแก้ได้
    AND status = 'ASSIGNED'; -- ต้องเป็นสถานะรอรับงานเท่านั้นถึงจะแก้ได้

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FORBIDDEN: Cannot update assignment';
  END IF;

  RETURN true;
END;
$$;


-- 3. ฟังก์ชันดึงรายชื่อลูกทัวร์ (Manifest - Strict Privacy)

CREATE OR REPLACE FUNCTION public.get_my_tour_manifest(p_schedule_id uuid)
RETURNS TABLE (
  booking_id uuid,
  full_name text,
  phone text,
  participant_count integer,
  special_request text,
  booking_status text,
  attendance_status text,
  checked_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- เช็กสิทธิ์: ต้องเป็นแอดมิน หรือไกด์ที่ได้รับมอบหมายงานนี้
  IF NOT (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.guide_assignments 
    WHERE schedule_id = p_schedule_id AND guide_id = auth.uid()
  )) THEN
    RAISE EXCEPTION 'FORBIDDEN: Unauthorized to view this manifest';
  END IF;

  RETURN QUERY
  SELECT 
    b.id,
    p.full_name,
    p.phone,
    b.participant_count,
    b.special_request,
    b.status,
    b.attendance_status,
    b.checked_in_at
  FROM public.bookings b
  JOIN public.profiles p ON b.user_id = p.id
  WHERE b.schedule_id = p_schedule_id;
END;
$$;

-- ==========================================
-- 4. ฟังก์ชันเช็กชื่อหน้างาน (Attendance)

CREATE OR REPLACE FUNCTION public.update_tour_attendance(
  p_booking_id uuid,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule_id uuid;
BEGIN
  IF p_status NOT IN ('NOT_CHECKED_IN', 'CHECKED_IN', 'NO_SHOW') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Invalid attendance status';
  END IF;

  -- หา schedule_id ของการจองนี้
  SELECT schedule_id INTO v_schedule_id FROM public.bookings WHERE id = p_booking_id;

  -- เช็กสิทธิ์: แอดมิน หรือไกด์เจ้าของทัวร์
  IF NOT (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.guide_assignments 
    WHERE schedule_id = v_schedule_id AND guide_id = auth.uid()
  )) THEN
    RAISE EXCEPTION 'FORBIDDEN: Unauthorized to update attendance';
  END IF;

  UPDATE public.bookings
  SET attendance_status = p_status,
      checked_in_at = CASE WHEN p_status = 'CHECKED_IN' THEN now() ELSE null END,
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN true;
END;
$$;


-- 5. ฟังก์ชันจบงานรวดเดียว (Atomic Complete Tour)

CREATE OR REPLACE FUNCTION public.complete_tour(p_schedule_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. เช็กสิทธิ์ (ต้องเป็น Admin หรือ ไกด์ที่ ACCEPTED งานนี้แล้วเท่านั้น)
  IF NOT (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.guide_assignments 
    WHERE schedule_id = p_schedule_id 
      AND guide_id = auth.uid() 
      AND status = 'ACCEPTED'
  )) THEN
    RAISE EXCEPTION 'FORBIDDEN: Only assigned guide or admin can complete this tour';
  END IF;

  -- 2. อัปเดตสถานะตารางทัวร์ 
  UPDATE public.tour_schedules
  SET status = 'COMPLETED', updated_at = now()
  WHERE id = p_schedule_id;

  -- 3. อัปเดตสถานะงานของไกด์ (Atomic Step 2)
  UPDATE public.guide_assignments
  SET status = 'COMPLETED'
  WHERE schedule_id = p_schedule_id AND status = 'ACCEPTED';

  -- 4. อัปเดตสถานะลูกทัวร์เฉพาะคนที่ CONFIRMED (Atomic Step 3)
  UPDATE public.bookings
  SET status = 'COMPLETED', updated_at = now()
  WHERE schedule_id = p_schedule_id AND status = 'CONFIRMED';

  RETURN true;
END;
$$;