-- Who is sitting at the table right now.
--
-- Presence, not a column: nobody's chair survives a closed laptop, so there is
-- nothing here worth writing down. Realtime keeps the roster for as long as the
-- socket is open and forgets it the moment it closes, which is precisely the
-- lifetime the answer has.
--
-- The channel is PRIVATE, and that is the whole of this file. A public channel
-- is reachable by anyone holding the publishable key and the campaign's id, and
-- the read is the smaller half of the problem: `track` is a write, so a
-- stranger could seat characters who are not there and light up every card in
-- the rail. Private channels put the same question to Row Level Security that
-- every other read in this schema goes through -- Realtime evaluates the
-- policies below against the subscriber's own JWT before it will let them join.
--
-- Policies on `realtime.messages` are the project's, not one feature's: they
-- are consulted for every private channel there will ever be. `at_this_table`
-- is what keeps this one narrow -- a topic that is not `table:<uuid>` matches
-- nothing here, and with no other policy on the table it is refused.

-- The topic is a string off the wire and is treated as one. `owns_campaign` and
-- `my_character_in_campaign` are the same two definer functions the party's
-- reads already go through, so a chair at this table is the same question here
-- as it is in `campaign_party`.
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
  if topic is null or left(topic, 6) <> 'table:' then
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

-- Reading the roster and joining it are two permissions, and Realtime asks for
-- both: a subscriber has to pass the SELECT check to hear who else is seated
-- and the INSERT check to say that they are. Confined to `presence` -- nothing
-- in this app broadcasts, and a policy is not the place to leave room for
-- something that does not exist yet.
drop policy if exists "Read the table's presence" on realtime.messages;

create policy "Read the table's presence"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'presence'
    and public.at_this_table(realtime.topic())
  );

drop policy if exists "Take a chair at the table" on realtime.messages;

create policy "Take a chair at the table"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'presence'
    and public.at_this_table(realtime.topic())
  );
