create or replace function public.write_table_log(
  p_campaign uuid,
  p_seat uuid,
  p_action text,
  p_target uuid,
  p_body jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  head_of_table boolean := p_seat is null;
  actor text;
  target text;
  body jsonb := p_body;
begin
  if head_of_table then
    actor := 'Dungeon Master';
  else
    select c.name into actor
    from public.characters c
    where c.id = p_seat;

    if actor is null then
      return;
    end if;
  end if;

  if p_target is not null and p_target is distinct from p_seat then
    select c.name into target
    from public.characters c
    join public.campaign_members m on m.character_id = c.id
    where c.id = p_target
      and m.campaign_id = p_campaign;

    if target is null then
      return;
    end if;

    body := body || jsonb_build_object('targetName', target);
  end if;

  insert into public.campaign_activity_logs (
    campaign_id, actor_character, actor_name, actor_type, action_type, payload
  )
  values (
    p_campaign,
    p_seat,
    left(actor, 80),
    case when head_of_table then 'dm' else 'player' end,
    p_action,
    body
  );
exception
  -- A failed log must not roll back the deed it describes.
  when others then
    return;
end;
$fn$;

revoke all on function public.write_table_log(uuid, uuid, text, uuid, jsonb) from public, anon, authenticated;
