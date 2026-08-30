-- H-M4-M3-002: Transaction-safe capacity enforcement
create or replace function public.book_tour_safe(
  p_schedule_id uuid,
  p_participant_count integer,
  p_special_request text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_schedule_status text;
  v_max_participants integer;
  v_current_booked integer;
  v_new_booking_id uuid;
begin
  -- 1. ดึง ID ของผู้ใช้ที่ล็อกอินอยู่
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- 2. ล็อกแถวของตาราง tour_schedules (FOR UPDATE)
  select status, max_participants
  into v_schedule_status, v_max_participants
  from public.tour_schedules
  where id = p_schedule_id
  for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  -- 3. ตรวจสอบสถานะรอบทัวร์
  if v_schedule_status != 'OPEN' then
    raise exception 'SCHEDULE_NOT_OPEN';
  end if;

  -- 4. รวมยอดผู้เข้าร่วม
  select coalesce(sum(participant_count), 0)
  into v_current_booked
  from public.bookings
  where schedule_id = p_schedule_id
    and status in ('CONFIRMED', 'COMPLETED');

  -- 5. ตรวจสอบความจุ
  if (v_current_booked + p_participant_count) > v_max_participants then
    raise exception 'CAPACITY_EXCEEDED';
  end if;

  -- 6. บันทึกการจองและส่ง ID กลับ
  insert into public.bookings (user_id, schedule_id, participant_count, special_request, status)
  values (v_user_id, p_schedule_id, p_participant_count, p_special_request, 'CONFIRMED')
  returning id into v_new_booking_id;

  return v_new_booking_id;
end;
$$;