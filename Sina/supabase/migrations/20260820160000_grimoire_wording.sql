-- "Chronicle" became "Grimoire" in the release notice.
--
-- An announcement carries the sentence it was written with, so renaming it in
-- Maria does not reach a row already posted -- and the unique index on
-- (recipient, version) means the notice is never posted a second time to say it
-- again. Rewritten in place rather than deleted: this is our own copy rather
-- than anybody's data, and a row that vanished would be announced afresh.
--
-- Idempotent, and a no-op on any database that never saw the old wording.
update public.notifications
set title = replace(title, 'Chronicle Version', 'Grimoire Version'),
    message = replace(message, 'chronicle', 'grimoire')
where type = 'system_changelog'
  and (title like '%Chronicle Version%' or message like '%chronicle%');
