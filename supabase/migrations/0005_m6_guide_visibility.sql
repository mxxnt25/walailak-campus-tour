drop policy if exists "assignments booking owner read"
on public.guide_assignments;

create policy "assignments booking owner read"
on public.guide_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings b
    where b.schedule_id = guide_assignments.schedule_id
      and b.user_id = auth.uid()
  )
);

create or replace function public.get_guide_name_for_schedule(
  target_schedule_id uuid
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.full_name
  from public.guide_assignments ga
  join public.profiles p
    on p.id = ga.guide_id
  where ga.schedule_id = target_schedule_id
    and ga.status in ('ACCEPTED', 'COMPLETED')
    and exists (
      select 1
      from public.bookings b
      where b.schedule_id = target_schedule_id
        and b.user_id = auth.uid()
    )
  limit 1;
$$;

revoke all on function public.get_guide_name_for_schedule(uuid)
from public;

grant execute on function public.get_guide_name_for_schedule(uuid)
to authenticated;