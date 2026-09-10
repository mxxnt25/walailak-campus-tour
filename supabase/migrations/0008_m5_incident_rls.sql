-- M5 Incident Reporting
-- Restrict GUIDE users to incidents belonging to schedules
-- where they are assigned as the guide.
-- ADMIN users may continue to read all incidents.

drop policy if exists "incidents guide/admin read"
on public.incidents;

create policy "incidents assigned guide/admin read"
on public.incidents
for select
using (
  public.is_admin()
  or (
    public.is_guide()
    and exists (
      select 1
      from public.guide_assignments ga
      where ga.schedule_id = incidents.schedule_id
        and ga.guide_id = auth.uid()
    )
  )
);