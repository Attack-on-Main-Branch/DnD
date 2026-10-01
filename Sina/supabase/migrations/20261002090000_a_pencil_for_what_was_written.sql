-- A pencil for what was written down: items, spells, containers, pieces and
-- features can be edited in place instead of struck out and written again.
--
-- Five tables that each said "no UPDATE policy" get one, and EVERY ONE IS
-- NARROWED BY COLUMN. RLS grants rows, never columns, so the policy alone would
-- let PostgREST set anything on a row it admits. The table-wide UPDATE grant
-- Supabase hands `authenticated` is taken back and only the columns a form
-- writes are granted again, which keeps the deeds deeds:
--
--   containers            name and type only. `owner_character_id`,
--                         `is_revealed` and `visible_to_character_ids` stay
--                         transfer_container's, reveal_chest's and
--                         hide_chest's -- all security definer, so the revoke
--                         does not reach them. `containers_bounds_check`
--                         refuses a carried bag turned into a chest.
--   character_features    name and description; never whose it is.
--   campaign_*            never which campaign.
--
-- What the party already holds is untouched: pack rows and spellbook rows are
-- copies made when they were handed over (see 20260822160000). A renamed
-- catalogue item re-derives its slug, so the next grant of it starts a new
-- stack under the new name, exactly as writing it afresh would have.
--
-- The limit triggers fire on INSERT only, so an edit never counts against one.

-- ---------------------------------------------------------------------------
-- campaign_items
-- ---------------------------------------------------------------------------
revoke update on public.campaign_items from anon, authenticated;
grant update (
  item_slug, name, category, description, cost_quantity, cost_unit, weight,
  damage_dice, damage_type, armor_class, properties
) on public.campaign_items to authenticated;

drop policy if exists "DMs edit their own catalogue" on public.campaign_items;
create policy "DMs edit their own catalogue"
  on public.campaign_items for update to authenticated
  using (public.owns_campaign(campaign_id))
  with check (public.owns_campaign(campaign_id));

-- ---------------------------------------------------------------------------
-- campaign_spells
-- ---------------------------------------------------------------------------
revoke update on public.campaign_spells from anon, authenticated;
grant update (
  spell_slug, name, level, school, casting_time, range_text, components,
  material, duration, concentration, ritual, attack_save, damage, description,
  higher_level, classes
) on public.campaign_spells to authenticated;

drop policy if exists "DMs edit their own spellbook" on public.campaign_spells;
create policy "DMs edit their own spellbook"
  on public.campaign_spells for update to authenticated
  using (public.owns_campaign(campaign_id))
  with check (public.owns_campaign(campaign_id));

-- ---------------------------------------------------------------------------
-- containers
-- ---------------------------------------------------------------------------
revoke update on public.containers from anon, authenticated;
grant update (name, type) on public.containers to authenticated;

drop policy if exists "DMs rename their own containers" on public.containers;
create policy "DMs rename their own containers"
  on public.containers for update to authenticated
  using (public.owns_campaign(campaign_id))
  with check (public.owns_campaign(campaign_id));

-- ---------------------------------------------------------------------------
-- campaign_token_templates
-- ---------------------------------------------------------------------------
revoke update on public.campaign_token_templates from anon, authenticated;
grant update (name, image_url)
  on public.campaign_token_templates to authenticated;

drop policy if exists "Dungeon Masters redraw their own pieces" on public.campaign_token_templates;
create policy "Dungeon Masters redraw their own pieces"
  on public.campaign_token_templates for update to authenticated
  using (public.owns_campaign(campaign_id))
  with check (public.owns_campaign(campaign_id));

-- ---------------------------------------------------------------------------
-- character_features
-- ---------------------------------------------------------------------------
-- The pencil 20260913090000 promised. The same two writers its INSERT and
-- DELETE policies name: the owner, or the Dungeon Master of a table this
-- character plays at.
revoke update on public.character_features from anon, authenticated;
grant update (name, description)
  on public.character_features to authenticated;

drop policy if exists "Owners and their DM rewrite a feature" on public.character_features;
create policy "Owners and their DM rewrite a feature"
  on public.character_features for update to authenticated
  using (
    public.owns_character(character_id)
    or exists (
      select 1 from public.campaign_members m
      where m.character_id = character_features.character_id
        and public.owns_campaign(m.campaign_id)
    )
  )
  with check (
    public.owns_character(character_id)
    or exists (
      select 1 from public.campaign_members m
      where m.character_id = character_features.character_id
        and public.owns_campaign(m.campaign_id)
    )
  );
