BEGIN;

-- ============================================================
-- 0017_review_insert_rls_fix.sql
--
-- Purpose:
-- Fix review INSERT RLS evaluation without exposing
-- guide_assignments to MEMBER users.
--
-- Background:
-- 0015 review INSERT policy directly reads guide_assignments.
-- 0016 intentionally restricts guide_assignments SELECT to:
--   - the assigned GUIDE
--   - ADMIN / SUPER_ADMIN
--
-- Therefore a MEMBER with an otherwise valid completed booking
-- cannot satisfy the review INSERT policy.
--
-- Solution:
-- Keep guide_assignments private.
-- Move the cross-table eligibility check into a narrow
-- SECURITY DEFINER boolean helper.
-- ============================================================


-- ============================================================
-- 1) TRUSTED REVIEW ELIGIBILITY HELPER
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_review_insert_eligible(
  target_booking_id UUID,
  target_user_id UUID,
  target_route_id UUID,
  target_guide_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL

    -- The review row must belong to the authenticated user.
    AND target_user_id = auth.uid()

    -- Booking / schedule / actual completed guide must match.
    AND EXISTS (
      SELECT 1
      FROM public.bookings AS b
      JOIN public.tour_schedules AS ts
        ON ts.id = b.schedule_id
      JOIN public.guide_assignments AS ga
        ON ga.schedule_id = ts.id
      WHERE b.id = target_booking_id

        -- Booking ownership
        AND b.user_id = auth.uid()

        -- Final lifecycle state
        AND b.status = 'COMPLETED'
        AND ts.status = 'COMPLETED'
        AND ga.status = 'COMPLETED'

        -- References must be the authoritative references
        -- derived by prepare_review().
        AND ts.route_id = target_route_id
        AND ga.guide_id = target_guide_id
    );
$$;


-- Do not expose this helper publicly.
REVOKE ALL
ON FUNCTION public.is_review_insert_eligible(
  UUID,
  UUID,
  UUID,
  UUID
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.is_review_insert_eligible(
  UUID,
  UUID,
  UUID,
  UUID
)
TO authenticated;


-- ============================================================
-- 2) REPLACE ONLY THE MEMBER REVIEW INSERT POLICY
-- ============================================================

DROP POLICY IF EXISTS
  "M6 eligible completed booking insert"
ON public.reviews;

CREATE POLICY "M6 eligible completed booking insert"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_review_insert_eligible(
    booking_id,
    user_id,
    route_id,
    guide_id
  )
);


-- ============================================================
-- 3) NOTES
-- ============================================================
--
-- prepare_review() remains authoritative for INSERT:
--   - verifies authenticated booking owner
--   - requires booking = COMPLETED
--   - requires schedule = COMPLETED
--   - derives route_id
--   - derives guide_id from COMPLETED assignment
--   - derives reviewer_name
--   - forces is_hidden = FALSE
--   - enforces one booking / one review
--
-- This migration does NOT grant MEMBER users SELECT access
-- to guide_assignments.
--
-- Existing review SELECT / UPDATE / DELETE policies remain
-- unchanged.
-- ============================================================

COMMIT;