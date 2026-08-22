-- The dice a table shares with itself.
--
-- Broadcast, not a table: a roll is an event, not a record. Nothing here is
-- worth writing down -- the number matters for the few seconds it is on the
-- board and the ledger a party keeps is its own notes -- so this goes the same
-- way presence does, over the socket and nowhere else.
--
-- Its own topic rather than the presence one. Two channels on a single topic is
-- a join per topic per socket, and the two answers have different shapes; a
-- second topic costs a subscription and keeps the questions separate.
--
-- What a subscriber MAY do is the point of this file, and it is exactly what
-- 20260821240000_table_presence.sql established: `at_this_table` below is that
-- file's function widened by one prefix, so a roll is put to the same two
-- definer functions a seat at the table already is. A secret roll never carries
-- its number over this channel at all -- the Dungeon Master's client keeps the
-- value and sends only the fact that something is being rolled, which is what
-- lights the board violet for everybody without telling them the answer.

-- `table:<uuid>` and `rolls:<uuid>`, which are the same question about the same
-- campaign. Both prefixes are six characters, so the uuid starts at the same
-- place in either.
create or replace function public.at_this_table(topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if topic is null or left(topic, 6) not in ('table:', 'rolls:') then
    return false;
  end if;

  begin
    target := substring(topic from 7)::uuid;
  exception
    when others then
      return false;
  end;

  return public.owns_campaign(target)
      or public.my_character_in_campaign(target);
end;
$$;

revoke all on function public.at_this_table(text) from public;
revoke all on function public.at_this_table(text) from anon;
grant execute on function public.at_this_table(text) to authenticated;

-- Additive: RLS ORs permissive policies together, so the presence pair next
-- door is untouched and neither of these widens it. Hearing the table's rolls
-- and making one are two permissions, and Realtime asks for both.
drop policy if exists "Hear the table's rolls" on realtime.messages;

create policy "Hear the table's rolls"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and public.at_this_table(realtime.topic())
  );

drop policy if exists "Roll at the table" on realtime.messages;

create policy "Roll at the table"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and public.at_this_table(realtime.topic())
  );
