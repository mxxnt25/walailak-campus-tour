-- READ ONLY. Run against the project test database before applying 0018.
SELECT to_regprocedure('public.assign_guide(uuid,uuid)') AS assign_rpc,
       to_regprocedure('public.update_my_assignment_status(uuid,text)') AS accept_rpc,
       to_regprocedure('public.change_user_role(uuid,text)') AS baseline_m1_rpc;
-- Legacy invalid rows: review, do not auto-delete or silently repair.
SELECT id,tour_date,start_time,end_time,status FROM public.tour_schedules
WHERE end_time IS NULL OR end_time <= start_time;
SELECT id,tour_date,start_time,status FROM public.tour_schedules
WHERE status='OPEN' AND (tour_date+start_time) AT TIME ZONE 'Asia/Bangkok' <= now();
-- Existing overlaps must be reviewed before adopting the proposed [start,end) rule.
SELECT a.guide_id,a.schedule_id AS first_schedule,b.schedule_id AS second_schedule
FROM public.guide_assignments a JOIN public.guide_assignments b ON a.guide_id=b.guide_id AND a.schedule_id<b.schedule_id
JOIN public.tour_schedules x ON x.id=a.schedule_id JOIN public.tour_schedules y ON y.id=b.schedule_id
WHERE a.status IN ('ASSIGNED','ACCEPTED') AND b.status IN ('ASSIGNED','ACCEPTED')
 AND x.status IN ('OPEN','FULL','CLOSED') AND y.status IN ('OPEN','FULL','CLOSED')
 AND x.tour_date=y.tour_date AND x.start_time<COALESCE(y.end_time,'24:00'::time) AND y.start_time<COALESCE(x.end_time,'24:00'::time);
-- AFTER applying: verify objects and grants. This does not replace role-based tests.
SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE 'm4_%' ORDER BY tgname;
SELECT has_function_privilege('anon','public.m4_replace_route_stops(uuid,jsonb)','EXECUTE') AS anon_should_be_false,
       has_function_privilege('authenticated','public.m4_replace_route_stops(uuid,jsonb)','EXECUTE') AS authenticated_should_be_true;

-- AFTER 0020: completion RPC exists, timing trigger/helper are absent.
SELECT to_regprocedure('public.complete_tour(uuid)') AS completion_rpc;
SELECT count(*) AS should_be_zero FROM pg_trigger WHERE tgname='m4_guard_completion_time';
SELECT to_regprocedure('public.m4_completion_due(date,time without time zone,time without time zone,timestamp with time zone)') AS should_be_null;
