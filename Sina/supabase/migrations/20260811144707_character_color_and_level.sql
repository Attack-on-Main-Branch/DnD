-- Avatar colour and level for characters.
--
-- color_theme stores a palette slug rather than a hex value: the rendered
-- colour stays a front-end decision, so the app can restyle or add a dark
-- variant without a data migration.

alter table public.characters
  add column if not exists color_theme text,
  add column if not exists level int not null default 1;

-- Backfill before the NOT NULL, so existing rows survive. Derived from the id,
-- which means it is stable across re-runs and spreads the palette instead of
-- opening the dashboard on three identical avatars.
update public.characters
set color_theme = (array[
  'rose', 'orange', 'amber', 'lime', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'violet', 'fuchsia', 'pink'
])[(get_byte(decode(md5(id::text), 'hex'), 0) % 12) + 1]
where color_theme is null;

alter table public.characters
  alter column color_theme set default 'violet',
  alter column color_theme set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'characters_color_theme_check'
  ) then
    alter table public.characters
      add constraint characters_color_theme_check check (color_theme in (
        'rose', 'orange', 'amber', 'lime', 'emerald', 'teal',
        'cyan', 'sky', 'blue', 'violet', 'fuchsia', 'pink'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'characters_level_check'
  ) then
    alter table public.characters
      add constraint characters_level_check check (level between 1 and 20);
  end if;
end
$$;
