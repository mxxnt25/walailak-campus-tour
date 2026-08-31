-- =====================================================
-- M6: Evaluation and Review Module
-- =====================================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ใช้ TEXT ชั่วคราวจนกว่าจะทราบชนิด Primary Key
  -- ของตารางการจองจากสมาชิกที่ทำระบบ Booking
  booking_id TEXT NOT NULL,

  user_id UUID NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  reviewer_name TEXT NOT NULL DEFAULT 'ผู้ใช้งาน',

  overall_rating SMALLINT NOT NULL
    CHECK (overall_rating BETWEEN 1 AND 5),

  guide_rating SMALLINT NOT NULL
    CHECK (guide_rating BETWEEN 1 AND 5),

  route_rating SMALLINT NOT NULL
    CHECK (route_rating BETWEEN 1 AND 5),

  comment TEXT NOT NULL
    CHECK (
      char_length(trim(comment)) BETWEEN 1 AND 500
    ),

  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ผู้ใช้หนึ่งคนรีวิวการจองหนึ่งรายการได้ครั้งเดียว
  CONSTRAINT reviews_booking_user_unique
    UNIQUE (booking_id, user_id)
);

CREATE INDEX IF NOT EXISTS reviews_booking_id_index
  ON public.reviews (booking_id);

CREATE INDEX IF NOT EXISTS reviews_user_id_index
  ON public.reviews (user_id);

CREATE INDEX IF NOT EXISTS reviews_created_at_index
  ON public.reviews (created_at DESC);

-- =====================================================
-- Updated-at trigger
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_review_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_review_updated_at
  ON public.reviews;

CREATE TRIGGER set_review_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_review_updated_at();

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
  "Everyone can read visible reviews"
  ON public.reviews;

DROP POLICY IF EXISTS
  "Users can create own reviews"
  ON public.reviews;

DROP POLICY IF EXISTS
  "Users can update own reviews"
  ON public.reviews;

DROP POLICY IF EXISTS
  "Users can delete own reviews"
  ON public.reviews;

DROP POLICY IF EXISTS
  "Admins can manage every review"
  ON public.reviews;

-- ทุกคนสามารถอ่านรีวิวที่ไม่ถูกซ่อนได้
CREATE POLICY "Everyone can read visible reviews"
ON public.reviews
FOR SELECT
USING (is_hidden = FALSE);

-- ผู้ใช้เพิ่มรีวิวในชื่อของตัวเองเท่านั้น
CREATE POLICY "Users can create own reviews"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ผู้ใช้แก้ไขรีวิวของตัวเองเท่านั้น
CREATE POLICY "Users can update own reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ผู้ใช้ลบรีวิวของตัวเองเท่านั้น
CREATE POLICY "Users can delete own reviews"
ON public.reviews
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ใช้นโยบายนี้เมื่อโปรเจกต์มีฟังก์ชัน public.is_admin()
-- ตามไฟล์ RLS Baseline ของทีม
CREATE POLICY "Admins can manage every review"
ON public.reviews
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());