-- RLS baseline reference. Review in Supabase before production/demo.
-- Helper: admin check through profiles.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN');
$$;

create or replace function public.is_guide()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'GUIDE');
$$;

alter table public.profiles enable row level security;
alter table public.routes enable row level security;
alter table public.route_stops enable row level security;
alter table public.tour_schedules enable row level security;
alter table public.bookings enable row level security;
alter table public.guide_assignments enable row level security;
alter table public.incidents enable row level security;
alter table public.reviews enable row level security;

create policy "profiles self read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles self update" on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- Prevent privilege escalation even if a client submits role in an update payload.
create or replace function public.protect_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'ROLE_CHANGE_FORBIDDEN';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_profile_privileges on public.profiles;
create trigger trg_protect_profile_privileges before update on public.profiles
for each row execute function public.protect_profile_privileges();

create policy "routes public active read" on public.routes for select using (status = 'ACTIVE' or public.is_admin());
create policy "routes admin all" on public.routes for all using (public.is_admin()) with check (public.is_admin());
create policy "stops public read" on public.route_stops for select using (true);
create policy "stops admin all" on public.route_stops for all using (public.is_admin()) with check (public.is_admin());

create policy "schedules public read" on public.tour_schedules for select using (true);
create policy "schedules admin all" on public.tour_schedules for all using (public.is_admin()) with check (public.is_admin());

create policy "bookings own read" on public.bookings for select using (user_id = auth.uid() or public.is_admin());
create policy "bookings own insert" on public.bookings for insert with check (user_id = auth.uid());
create policy "bookings own update" on public.bookings for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

-- A Visitor may cancel their own booking but may not rewrite identity/schedule/count
-- or mark it COMPLETED themselves. Admin can perform operational updates.
create or replace function public.protect_booking_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if auth.uid() is null or auth.uid() <> old.user_id then
    raise exception 'BOOKING_UPDATE_FORBIDDEN';
  end if;
  if new.user_id is distinct from old.user_id
     or new.schedule_id is distinct from old.schedule_id
     or new.participant_count is distinct from old.participant_count then
    raise exception 'BOOKING_IMMUTABLE_FIELDS';
  end if;
  if new.status is distinct from old.status and new.status <> 'CANCELLED' then
    raise exception 'BOOKING_STATUS_FORBIDDEN';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_booking_update on public.bookings;
create trigger trg_protect_booking_update before update on public.bookings
for each row execute function public.protect_booking_update();

create policy "assignments own/admin read" on public.guide_assignments for select using (guide_id = auth.uid() or public.is_admin());
create policy "assignments admin write" on public.guide_assignments for all using (public.is_admin()) with check (public.is_admin());

create policy "incidents guide/admin read" on public.incidents for select using (public.is_admin() or public.is_guide());
create policy "incidents guide/admin insert" on public.incidents for insert with check (
  public.is_admin()
  or (
    reported_by = auth.uid()
    and public.is_guide()
    and exists (
      select 1 from public.guide_assignments ga
      where ga.schedule_id = incidents.schedule_id and ga.guide_id = auth.uid()
    )
  )
);
create policy "incidents admin update" on public.incidents for update using (public.is_admin()) with check (public.is_admin());

create policy "reviews public read" on public.reviews for select using (true);
create policy "reviews eligible own insert" on public.reviews for insert with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.bookings b
    join public.tour_schedules ts on ts.id = b.schedule_id
    join public.guide_assignments ga on ga.schedule_id = ts.id
    where b.id = reviews.booking_id
      and b.user_id = auth.uid()
      and b.status = 'COMPLETED'
      and ts.status = 'COMPLETED'
      and ts.route_id = reviews.route_id
      and ga.guide_id = reviews.guide_id
  )
);
create policy "reviews admin delete" on public.reviews for delete using (public.is_admin());

-- IMPORTANT: review eligibility and booking capacity need stronger transactional enforcement
-- before final demo. Do not rely only on client checks. See SECURITY-BASELINE.md.