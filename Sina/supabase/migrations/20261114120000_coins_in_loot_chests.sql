alter table public.containers
  add column if not exists cp integer not null default 0,
  add column if not exists sp integer not null default 0,
  add column if not exists ep integer not null default 0,
  add column if not exists gp integer not null default 0,
  add column if not exists pp integer not null default 0;

do $ck$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.containers'::regclass
      and conname = 'containers_currency_check'
  ) then
    alter table public.containers add constraint containers_currency_check check (
      cp between 0 and 9999999 and sp between 0 and 9999999
      and ep between 0 and 9999999 and gp between 0 and 9999999
      and pp between 0 and 9999999
      and (type = 'chest' or cp + sp + ep + gp + pp = 0)
    );
  end if;
end;
$ck$;

create or replace function public.stock_chest_coins(
  p_campaign_id uuid,
  p_container_id uuid,
  p_coin text,
  p_amount integer
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_have integer;
  v_added integer;
begin
  if p_amount is null or p_amount not between 1 and 9999999
     or not coalesce(public.is_coin(p_coin), false)
     or not coalesce(public.owns_campaign(p_campaign_id), false) then
    return null;
  end if;

  select case p_coin when 'cp' then cp when 'sp' then sp when 'ep' then ep
                            when 'gp' then gp when 'pp' then pp end
    into v_have
  from public.containers
  where id = p_container_id and campaign_id = p_campaign_id and type = 'chest'
  for update;

  if not found then return null; end if;
  v_added := least(p_amount, 9999999 - v_have);
  if v_added = 0 then return 0; end if;

  update public.containers
    set cp = cp + case when p_coin = 'cp' then v_added else 0 end,
        sp = sp + case when p_coin = 'sp' then v_added else 0 end,
        ep = ep + case when p_coin = 'ep' then v_added else 0 end,
        gp = gp + case when p_coin = 'gp' then v_added else 0 end,
        pp = pp + case when p_coin = 'pp' then v_added else 0 end
  where id = p_container_id;

  return v_added;
end;
$fn$;

create or replace function public.take_chest_coins(
  p_campaign_id uuid,
  p_container_id uuid,
  p_character_id uuid,
  p_coin text,
  p_amount integer
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_chest text;
  v_have integer;
  v_balance integer;
  v_taken integer;
  v_seat uuid;
begin
  if p_amount is null or p_amount not between 1 and 9999999
     or not coalesce(public.is_coin(p_coin), false) then
    return null;
  end if;

  if public.my_seat_at_table(p_campaign_id, p_character_id) then
    v_seat := p_character_id;
  elsif not coalesce(public.owns_campaign(p_campaign_id), false) then
    return null;
  end if;

  -- The lock also keeps a concurrent Hide or audience edit from racing a claim.
  select name, case p_coin when 'cp' then cp when 'sp' then sp
    when 'ep' then ep when 'gp' then gp when 'pp' then pp end
    into v_chest, v_have
  from public.containers
  where id = p_container_id and campaign_id = p_campaign_id and type = 'chest'
    and is_revealed and p_character_id = any (visible_to_character_ids)
  for update;

  if not found then return null; end if;

  select case p_coin when 'cp' then c.cp when 'sp' then c.sp when 'ep' then c.ep
                            when 'gp' then c.gp when 'pp' then c.pp end
    into v_balance
  from public.characters c
  join public.campaign_members m on m.character_id = c.id
  where c.id = p_character_id and m.campaign_id = p_campaign_id
  for update of c for key share of m;

  if not found then return null; end if;
  v_taken := least(p_amount, v_have, 9999999 - v_balance);
  if v_taken = 0 then return 0; end if;

  update public.containers
    set cp = cp - case when p_coin = 'cp' then v_taken else 0 end,
        sp = sp - case when p_coin = 'sp' then v_taken else 0 end,
        ep = ep - case when p_coin = 'ep' then v_taken else 0 end,
        gp = gp - case when p_coin = 'gp' then v_taken else 0 end,
        pp = pp - case when p_coin = 'pp' then v_taken else 0 end
  where id = p_container_id;

  update public.characters
    set cp = cp + case when p_coin = 'cp' then v_taken else 0 end,
        sp = sp + case when p_coin = 'sp' then v_taken else 0 end,
        ep = ep + case when p_coin = 'ep' then v_taken else 0 end,
        gp = gp + case when p_coin = 'gp' then v_taken else 0 end,
        pp = pp + case when p_coin = 'pp' then v_taken else 0 end
  where id = p_character_id;

  perform public.write_table_log(
    p_campaign_id, v_seat, 'chest_looted',
    case when v_seat is null then p_character_id end,
    jsonb_build_object('containerName', v_chest, 'coin', p_coin, 'quantity', v_taken)
  );
  return v_taken;
end;
$fn$;

revoke all on function public.stock_chest_coins(uuid, uuid, text, integer) from public, anon;
grant execute on function public.stock_chest_coins(uuid, uuid, text, integer) to authenticated;
revoke all on function public.take_chest_coins(uuid, uuid, uuid, text, integer) from public, anon;
grant execute on function public.take_chest_coins(uuid, uuid, uuid, text, integer) to authenticated;
