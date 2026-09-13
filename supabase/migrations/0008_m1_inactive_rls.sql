-- =========================================================
-- M1 — Inactive Account RLS Protection
-- SoT v1.2
-- =========================================================


-- =========================================================
-- 1. Active-user helper
-- =========================================================

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
  );
$$;


-- =========================================================
-- 2. Profile read
-- Inactive users may no longer read their private profile.
-- ADMIN / SUPER_ADMIN retain operational access.
-- =========================================================

drop policy if exists "profiles self read"
on public.profiles;

create policy "profiles self read"
on public.profiles
for select
using (
  (
    id = auth.uid()
    and public.is_active_user()
  )
  or public.is_admin()
);


-- =========================================================
-- 3. Booking policies
-- =========================================================

drop policy if exists "bookings own read"
on public.bookings;

create policy "bookings own read"
on public.bookings
for select
using (
  (
    user_id = auth.uid()
    and public.is_active_user()
  )
  or public.is_admin()
);


drop policy if exists "bookings own insert"
on public.bookings;

create policy "bookings own insert"
on public.bookings
for insert
with check (
  user_id = auth.uid()
  and public.is_active_user()
);


drop policy if exists "bookings own update"
on public.bookings;

create policy "bookings own update"
on public.bookings
for update
using (
  (
    user_id = auth.uid()
    and public.is_active_user()
  )
  or public.is_admin()
)
with check (
  (
    user_id = auth.uid()
    and public.is_active_user()
  )
  or public.is_admin()
);


-- =========================================================
-- 4. Guide assignments
-- =========================================================

drop policy if exists "assignments own/admin read"
on public.guide_assignments;

create policy "assignments own/admin read"
on public.guide_assignments
for select
using (
  (
    guide_id = auth.uid()
    and public.is_active_user()
  )
  or public.is_admin()
);


-- =========================================================
-- 5. Reviews
-- Inactive MEMBER cannot submit a review.
-- =========================================================

drop policy if exists "reviews eligible own insert"
on public.reviews;

create policy "reviews eligible own insert"
on public.reviews
for insert
with check (
  public.is_active_user()

  and user_id = auth.uid()

  and exists (
    select 1
    from public.bookings b

    join public.tour_schedules ts
      on ts.id = b.schedule_id

    join public.guide_assignments ga
      on ga.schedule_id = ts.id

    where b.id = reviews.booking_id

      and b.user_id = auth.uid()

      and b.status = 'COMPLETED'

      and ts.status = 'COMPLETED'

      and ts.route_id = reviews.route_id

      and ga.guide_id = reviews.guide_id
  )
);