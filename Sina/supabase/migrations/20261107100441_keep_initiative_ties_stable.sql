-- Moving a token must not change the placement time used to break initiative ties.
create or replace function public.keep_token_placement_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.placed_at := old.placed_at;
  return new;
end;
$$;

revoke all on function public.keep_token_placement_time() from public, anon, authenticated;

drop trigger if exists keep_token_placement_time on public.map_placed_tokens;
create trigger keep_token_placement_time
  before update of placed_at on public.map_placed_tokens
  for each row execute function public.keep_token_placement_time();
