BEGIN;

-- ============================================================
-- M6 v1.2 FINAL REVIEW ALIGNMENT
-- Canonical migration for Review & Rating final fixes.
--
-- IMPORTANT:
-- - Do not modify historical 0004 / 0005.
-- - All final M6 database corrections live here.
-- ============================================================


-- ============================================================
-- 1) REVIEW MODERATOR CHECK
-- ============================================================
-- Use the shared final admin helper only.
-- public.is_admin() is the authoritative project-level helper
-- for ACTIVE ADMIN + ACTIVE SUPER_ADMIN.
--
-- M6 must not create a separate or weaker SUPER_ADMIN path.

CREATE OR REPLACE FUNCTION public.is_review_moderator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.is_admin();
$$;

REVOKE ALL
ON FUNCTION public.is_review_moderator()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.is_review_moderator()
TO authenticated;


-- ============================================================
-- 2) FINAL ONE BOOKING = ONE REVIEW
-- ============================================================
-- 0001 already defines reviews.booking_id as UNIQUE.
-- 0004 later added a redundant booking_id + user_id unique
-- index. The booking-only uniqueness is the stronger and final
-- contract, so remove only the redundant M6 index.
--
-- The historical UNIQUE constraint on booking_id remains intact.

DROP INDEX IF EXISTS public.idx_reviews_booking_user_unique;


-- ============================================================
-- 3) FINAL SERVER-AUTHORITATIVE REVIEW PREPARATION
-- ============================================================
-- Review eligibility must be decided by the database.
--
-- Final requirements:
-- - authenticated user
-- - booking belongs to authenticated user
-- - booking = COMPLETED
-- - schedule = COMPLETED
-- - actual guide assignment = COMPLETED
-- - route_id comes from completed schedule
-- - guide_id comes from completed assignment
-- - reviewer_name comes from booking owner profile
-- - client cannot choose identity/reference fields
-- - one booking remains one review

CREATE OR REPLACE FUNCTION public.prepare_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id UUID;
  v_booking_user_id UUID;
  v_schedule_id UUID;
  v_booking_status TEXT;
  v_schedule_status TEXT;
  v_route_id UUID;
  v_guide_id UUID;
  v_reviewer_name TEXT;
BEGIN
  v_auth_user_id := auth.uid();

  -- ----------------------------------------------------------
  -- INSERT
  -- ----------------------------------------------------------
  IF TG_OP = 'INSERT' THEN

    IF v_auth_user_id IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED'
        USING ERRCODE = 'P0001';
    END IF;

    IF NEW.booking_id IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_ERROR'
        USING ERRCODE = 'P0001';
    END IF;

    -- Read authoritative booking + schedule data.
    SELECT
      b.user_id,
      b.schedule_id,
      b.status,
      ts.status,
      ts.route_id,
      COALESCE(
        NULLIF(BTRIM(p.full_name), ''),
        'ผู้ใช้งาน'
      )
    INTO
      v_booking_user_id,
      v_schedule_id,
      v_booking_status,
      v_schedule_status,
      v_route_id,
      v_reviewer_name
    FROM public.bookings AS b
    JOIN public.tour_schedules AS ts
      ON ts.id = b.schedule_id
    JOIN public.profiles AS p
      ON p.id = b.user_id
    WHERE b.id = NEW.booking_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND'
        USING ERRCODE = 'P0001';
    END IF;

    -- The authenticated user must own the booking.
    IF v_booking_user_id IS DISTINCT FROM v_auth_user_id THEN
      RAISE EXCEPTION 'FORBIDDEN'
        USING ERRCODE = 'P0001';
    END IF;

    -- Booking and tour schedule must both be completed.
    IF v_booking_status <> 'COMPLETED'
       OR v_schedule_status <> 'COMPLETED' THEN
      RAISE EXCEPTION 'VALIDATION_ERROR'
        USING ERRCODE = 'P0001';
    END IF;

    -- Use only the guide who actually completed the tour.
    -- ASSIGNED / ACCEPTED / DECLINED are not valid for final
    -- review derivation.
    SELECT ga.guide_id
    INTO v_guide_id
    FROM public.guide_assignments AS ga
    WHERE ga.schedule_id = v_schedule_id
      AND ga.status = 'COMPLETED'
    LIMIT 1;

    IF NOT FOUND OR v_guide_id IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_ERROR'
        USING ERRCODE = 'P0001';
    END IF;

    -- Friendly duplicate detection.
    -- The UNIQUE booking_id constraint still provides the final
    -- concurrency-safe enforcement.
    IF EXISTS (
      SELECT 1
      FROM public.reviews AS r
      WHERE r.booking_id = NEW.booking_id
    ) THEN
      RAISE EXCEPTION 'ALREADY_EXISTS'
        USING ERRCODE = 'P0001';
    END IF;

    -- Server-controlled identity/reference data.
    NEW.user_id := v_auth_user_id;
    NEW.route_id := v_route_id;
    NEW.guide_id := v_guide_id;
    NEW.reviewer_name := v_reviewer_name;

    -- Review visibility is controlled by moderation, not client.
    NEW.is_hidden := FALSE;

    -- Server-controlled timestamps.
    NEW.created_at := NOW();
    NEW.updated_at := NOW();

  -- ----------------------------------------------------------
  -- UPDATE
  -- ----------------------------------------------------------
  ELSIF TG_OP = 'UPDATE' THEN

    -- Identity/reference fields are immutable.
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.booking_id IS DISTINCT FROM OLD.booking_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.route_id IS DISTINCT FROM OLD.route_id
       OR NEW.guide_id IS DISTINCT FROM OLD.guide_id
       OR NEW.reviewer_name IS DISTINCT FROM OLD.reviewer_name THEN
      RAISE EXCEPTION 'FORBIDDEN'
        USING ERRCODE = 'P0001';
    END IF;

    -- Only moderators may change review visibility.
    IF NEW.is_hidden IS DISTINCT FROM OLD.is_hidden
       AND NOT public.is_review_moderator() THEN
      RAISE EXCEPTION 'FORBIDDEN'
        USING ERRCODE = 'P0001';
    END IF;

    -- Moderators managing another user's review may moderate
    -- visibility, but may not rewrite that user's rating/comment.
    IF public.is_review_moderator()
       AND v_auth_user_id IS DISTINCT FROM OLD.user_id
       AND (
         NEW.overall_rating IS DISTINCT FROM OLD.overall_rating
         OR NEW.guide_rating IS DISTINCT FROM OLD.guide_rating
         OR NEW.route_rating IS DISTINCT FROM OLD.route_rating
         OR NEW.comment IS DISTINCT FROM OLD.comment
       ) THEN
      RAISE EXCEPTION 'FORBIDDEN'
        USING ERRCODE = 'P0001';
    END IF;

    -- Preserve server-controlled identity data.
    NEW.booking_id := OLD.booking_id;
    NEW.user_id := OLD.user_id;
    NEW.route_id := OLD.route_id;
    NEW.guide_id := OLD.guide_id;
    NEW.reviewer_name := OLD.reviewer_name;
    NEW.created_at := OLD.created_at;

    NEW.updated_at := NOW();
  END IF;

  -- Normalize comment before constraints are evaluated.
  NEW.comment := BTRIM(COALESCE(NEW.comment, ''));

  RETURN NEW;
END;
$$;


-- Ensure the final trigger points to the v1.2 implementation.
DROP TRIGGER IF EXISTS set_review_updated_at
ON public.reviews;

DROP TRIGGER IF EXISTS prepare_review_before_write
ON public.reviews;

CREATE TRIGGER prepare_review_before_write
BEFORE INSERT OR UPDATE
ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.prepare_review();


-- ============================================================
-- 4) FINAL GUIDE NAME DERIVATION
-- ============================================================
-- The member review UI should derive the guide from the guide
-- who actually completed the tour.

CREATE OR REPLACE FUNCTION public.get_guide_name_for_schedule(
  target_schedule_id UUID
)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.full_name
  FROM public.guide_assignments AS ga
  JOIN public.profiles AS p
    ON p.id = ga.guide_id
  JOIN public.tour_schedules AS ts
    ON ts.id = ga.schedule_id
  WHERE ga.schedule_id = target_schedule_id
    AND ga.status = 'COMPLETED'
    AND ts.status = 'COMPLETED'
    AND EXISTS (
      SELECT 1
      FROM public.bookings AS b
      WHERE b.schedule_id = target_schedule_id
        AND b.user_id = auth.uid()
        AND b.status = 'COMPLETED'
    )
  LIMIT 1;
$$;

REVOKE ALL
ON FUNCTION public.get_guide_name_for_schedule(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_guide_name_for_schedule(UUID)
TO authenticated;


-- ============================================================
-- 5) FINAL REVIEW RLS
-- ============================================================

ALTER TABLE public.reviews
ENABLE ROW LEVEL SECURITY;

-- M6 owns the final access contract for the reviews table.
-- Remove historical review policies before recreating the final
-- v1.2 contract.

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


-- ------------------------------------------------------------
-- PUBLIC VISIBLE REVIEW READ
-- ------------------------------------------------------------

CREATE POLICY "M6 visible reviews public read"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (
  is_hidden = FALSE
);


-- ------------------------------------------------------------
-- REVIEW OWNER READ
-- ------------------------------------------------------------
-- Owner may still retrieve their own review record.

CREATE POLICY "M6 review owner read"
ON public.reviews
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);


-- ------------------------------------------------------------
-- ADMIN + SUPER_ADMIN READ
-- ------------------------------------------------------------

CREATE POLICY "M6 review moderators read"
ON public.reviews
FOR SELECT
TO authenticated
USING (
  public.is_review_moderator()
);


-- ------------------------------------------------------------
-- MEMBER REVIEW CREATE
-- ------------------------------------------------------------
-- The trigger is authoritative and derives route/guide.
-- This policy independently verifies the final stored values.

CREATE POLICY "M6 eligible completed booking insert"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id

  AND EXISTS (
    SELECT 1
    FROM public.bookings AS b
    JOIN public.tour_schedules AS ts
      ON ts.id = b.schedule_id
    JOIN public.guide_assignments AS ga
      ON ga.schedule_id = ts.id
    WHERE b.id = reviews.booking_id
      AND b.user_id = auth.uid()
      AND b.status = 'COMPLETED'
      AND ts.status = 'COMPLETED'
      AND ts.route_id = reviews.route_id
      AND ga.guide_id = reviews.guide_id
      AND ga.status = 'COMPLETED'
  )
);


-- ------------------------------------------------------------
-- REVIEW OWNER UPDATE
-- ------------------------------------------------------------
-- Identity fields and moderation state are additionally protected
-- by prepare_review().

CREATE POLICY "M6 review owner update"
ON public.reviews
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);


-- ------------------------------------------------------------
-- ADMIN + SUPER_ADMIN MODERATION UPDATE
-- ------------------------------------------------------------

CREATE POLICY "M6 review moderators update"
ON public.reviews
FOR UPDATE
TO authenticated
USING (
  public.is_review_moderator()
)
WITH CHECK (
  public.is_review_moderator()
);


-- ------------------------------------------------------------
-- REVIEW OWNER DELETE
-- ------------------------------------------------------------

CREATE POLICY "M6 review owner delete"
ON public.reviews
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);


-- ------------------------------------------------------------
-- ADMIN + SUPER_ADMIN DELETE
-- ------------------------------------------------------------

CREATE POLICY "M6 review moderators delete"
ON public.reviews
FOR DELETE
TO authenticated
USING (
  public.is_review_moderator()
);


-- ============================================================
-- 6) TABLE PRIVILEGES
-- ============================================================

GRANT SELECT
ON public.reviews
TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE
ON public.reviews
TO authenticated;


COMMIT;