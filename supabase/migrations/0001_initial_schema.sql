-- Reference schema for Walailak Campus Tour v1.0.0
-- Apply via Supabase migrations after team review.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role text not null default 'VISITOR' check (role in ('ADMIN','GUIDE','VISITOR')),
  visitor_type text check (visitor_type is null or visitor_type in ('STUDENT','STAFF','EXTERNAL')),
  organization text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- Automatically create a safe VISITOR profile after email signup.
-- Never trust client metadata for authorization role.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_visitor_type text;
begin
  v_visitor_type := case
    when new.raw_user_meta_data ->> 'visitor_type' in ('STUDENT','STAFF','EXTERNAL')
      then new.raw_user_meta_data ->> 'visitor_type'
    else 'EXTERNAL'
  end;

  insert into public.profiles (id, full_name, email, role, visitor_type, organization)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name',''), new.email, 'Visitor'),
    coalesce(new.email, ''),
    'VISITOR',
    v_visitor_type,
    nullif(new.raw_user_meta_data ->> 'organization','')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  name text not null,
  description text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  stop_order integer not null check (stop_order >= 1),
  image_url text,
  unique(route_id, stop_order)
);

create table if not exists public.tour_schedules (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id),
  tour_date date not null,
  start_time time not null,
  end_time time,
  max_participants integer not null check (max_participants >= 1),
  status text not null default 'OPEN' check (status in ('OPEN','FULL','CANCELLED','COMPLETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  schedule_id uuid not null references public.tour_schedules(id),
  participant_count integer not null check (participant_count >= 1),
  special_request text,
  status text not null default 'CONFIRMED' check (status in ('CONFIRMED','CANCELLED','COMPLETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guide_assignments (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.profiles(id),
  schedule_id uuid not null references public.tour_schedules(id),
  status text not null default 'ASSIGNED' check (status in ('ASSIGNED','ACCEPTED','DECLINED','COMPLETED')),
  assigned_at timestamptz not null default now(),
  unique(schedule_id)
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.tour_schedules(id),
  reported_by uuid not null references public.profiles(id),
  type text not null,
  description text not null,
  severity text not null check (severity in ('LOW','MEDIUM','HIGH','EMERGENCY')),
  status text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','RESOLVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id),
  user_id uuid not null references public.profiles(id),
  guide_id uuid not null references public.profiles(id),
  route_id uuid not null references public.routes(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_route_stops_route on public.route_stops(route_id, stop_order);
create index if not exists idx_schedules_route_date on public.tour_schedules(route_id, tour_date);
create index if not exists idx_bookings_user on public.bookings(user_id);
create index if not exists idx_bookings_schedule on public.bookings(schedule_id);
create index if not exists idx_assignments_guide on public.guide_assignments(guide_id);
create index if not exists idx_incidents_schedule on public.incidents(schedule_id);
create index if not exists idx_reviews_guide on public.reviews(guide_id);