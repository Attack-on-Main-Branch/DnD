-- Mirrors MAX_ACTIVITY_ENTRIES in Sina/src/rules/activity.js.
create or replace function public.purge_campaign_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.campaign_id::text, 3));

  delete from public.campaign_activity_logs
  where campaign_id = new.campaign_id
    and id not in (
      select keep.id
      from public.campaign_activity_logs keep
      where keep.campaign_id = new.campaign_id
      order by keep.created_at desc, keep.id desc
      limit 15
    );

  return null;
end;
$$;
