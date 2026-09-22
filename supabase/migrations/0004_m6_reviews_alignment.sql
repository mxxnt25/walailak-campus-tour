BEGIN;

-- เปลี่ยนคอลัมน์คะแนนเดิมให้เป็นคะแนนภาพรวม
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reviews'
      AND column_name = 'rating'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reviews'
      AND column_name = 'overall_rating'
  ) THEN
    ALTER TABLE public.reviews
      RENAME COLUMN rating TO overall_rating;
  END IF;
END;
$$;

-- เพิ่มคอลัมน์ที่ M6 ต้องใช้
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS reviewer_name TEXT,
  ADD COLUMN IF NOT EXISTS guide_rating SMALLINT,
  ADD COLUMN IF NOT EXISTS route_rating SMALLINT,
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- รองรับกรณีมีข้อมูลเก่าในอนาคต
UPDATE public.reviews AS r
SET reviewer_name = COALESCE(
  NULLIF(BTRIM(p.full_name), ''),
  'ผู้ใช้งาน'
)
FROM public.profiles AS p
WHERE p.id = r.user_id
  AND (
    r.reviewer_name IS NULL
    OR BTRIM(r.reviewer_name) = ''
  );

UPDATE public.reviews
SET
  reviewer_name = COALESCE(reviewer_name, 'ผู้ใช้งาน'),
  guide_rating = COALESCE(guide_rating, overall_rating),
  route_rating = COALESCE(route_rating, overall_rating),
  comment = CASE
    WHEN comment IS NULL OR BTRIM(comment) = ''
      THEN 'ไม่มีความคิดเห็น'
    ELSE BTRIM(comment)
  END,
  is_hidden = COALESCE(is_hidden, FALSE),
  updated_at = COALESCE(updated_at, created_at, NOW());

-- ลบข้อกำหนดคะแนนเดิมก่อนสร้างข้อกำหนดใหม่
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_rating_check,
  DROP CONSTRAINT IF EXISTS reviews_overall_rating_check,
  DROP CONSTRAINT IF EXISTS reviews_guide_rating_check,
  DROP CONSTRAINT IF EXISTS reviews_route_rating_check,
  DROP CONSTRAINT IF EXISTS reviews_comment_length_check;

ALTER TABLE public.reviews
  ALTER COLUMN overall_rating
    TYPE SMALLINT USING overall_rating::SMALLINT,
  ALTER COLUMN overall_rating SET NOT NULL,
  ALTER COLUMN reviewer_name
    SET DEFAULT 'ผู้ใช้งาน',
  ALTER COLUMN reviewer_name SET NOT NULL,
  ALTER COLUMN guide_rating SET NOT NULL,
  ALTER COLUMN route_rating SET NOT NULL,
  ALTER COLUMN comment SET NOT NULL,
  ALTER COLUMN is_hidden SET DEFAULT FALSE,
  ALTER COLUMN is_hidden SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_overall_rating_check
    CHECK (overall_rating BETWEEN 1 AND 5),
  ADD CONSTRAINT reviews_guide_rating_check
    CHECK (guide_rating BETWEEN 1 AND 5),
  ADD CONSTRAINT reviews_route_rating_check
    CHECK (route_rating BETWEEN 1 AND 5),
  ADD CONSTRAINT reviews_comment_length_check
    CHECK (CHAR_LENGTH(BTRIM(comment)) BETWEEN 1 AND 500);
    -- หนึ่งผู้ใช้ส่งรีวิวต่อหนึ่งการจองได้ครั้งเดียว
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_booking_user_unique
  ON public.reviews(booking_id, user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_booking
  ON public.reviews(booking_id);

CREATE INDEX IF NOT EXISTS idx_reviews_user
  ON public.reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_route
  ON public.reviews(route_id);

CREATE INDEX IF NOT EXISTS idx_reviews_created_at
  ON public.reviews(created_at DESC);

-- ให้ฐานข้อมูลเติมข้อมูลเส้นทาง ไกด์ และชื่อผู้รีวิว
-- จาก booking จริงโดยอัตโนมัติ
CREATE OR REPLACE FUNCTION public.prepare_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route_id UUID;
  v_guide_id UUID;
  v_reviewer_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT
      ts.route_id,
      ga.guide_id,
      COALESCE(
        NULLIF(BTRIM(p.full_name), ''),
        'ผู้ใช้งาน'
      )
    INTO
      v_route_id,
      v_guide_id,
      v_reviewer_name
    FROM public.bookings AS b
    JOIN public.tour_schedules AS ts
      ON ts.id = b.schedule_id
    JOIN public.guide_assignments AS ga
      ON ga.schedule_id = ts.id
    JOIN public.profiles AS p
      ON p.id = b.user_id
    WHERE b.id = NEW.booking_id
      AND b.user_id = NEW.user_id
      AND b.status = 'COMPLETED'
      AND ga.status IN (
        'ASSIGNED',
        'ACCEPTED',
        'COMPLETED'
      )
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'ไม่พบการจองที่เดินทางเสร็จสิ้นหรือข้อมูลไกด์ยังไม่พร้อม'
        USING ERRCODE = 'P0001';
    END IF;

    NEW.route_id := v_route_id;
    NEW.guide_id := v_guide_id;
    NEW.reviewer_name := v_reviewer_name;
  ELSE
    -- ไม่อนุญาตให้เปลี่ยนเจ้าของหรือข้อมูลอ้างอิงตอนแก้รีวิว
    NEW.booking_id := OLD.booking_id;
    NEW.user_id := OLD.user_id;
    NEW.route_id := OLD.route_id;
    NEW.guide_id := OLD.guide_id;
    NEW.reviewer_name := OLD.reviewer_name;
  END IF;

  NEW.comment := BTRIM(NEW.comment);
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_review_updated_at
  ON public.reviews;

DROP TRIGGER IF EXISTS prepare_review_before_write
  ON public.reviews;

CREATE TRIGGER prepare_review_before_write
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.prepare_review();

-- เปิด RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- แทนที่ Policies เดิมของตาราง reviews
DO $$
DECLARE
  v_policy RECORD;
BEGIN
  FOR v_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reviews'
  LOOP
    EXECUTE FORMAT(
      'DROP POLICY %I ON public.reviews',
      v_policy.policyname
    );
  END LOOP;
END;
$$;

CREATE POLICY "Reviews are readable when visible or owned"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (
  is_hidden = FALSE
  OR auth.uid() = user_id
);

CREATE POLICY "Users can create own completed booking reviews"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.bookings AS b
    WHERE b.id = booking_id
      AND b.user_id = auth.uid()
      AND b.status = 'COMPLETED'
  )
);

CREATE POLICY "Users can update own reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
ON public.reviews
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage every review"
ON public.reviews
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE
  ON public.reviews TO authenticated;

COMMIT;