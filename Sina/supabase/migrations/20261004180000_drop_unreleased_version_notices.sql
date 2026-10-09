-- Removes the announcements for versions that were never released.
--
-- The work after 1.4.0 was numbered release by release, 1.5.0 up to 1.16.2,
-- before it was gathered into the single 1.5.0 it ships as. A dev server
-- announces whatever tops its changelog to whoever opens the dashboard, so
-- some of those numbers reached the inbox — and `shouldAnnounce` is strictly
-- newer, so an account told about 1.16.2 would hear nothing of 1.5.0, or of
-- anything after it short of 1.16.3. See 20260821090000, the same accident
-- with 0.10.0.
--
-- 1.5.0 goes too: a row for it was posted under a title the release no longer
-- has, and deleting it lets the real one be announced in its place.

delete from public.notifications
where type = 'system_changelog'
  and data ->> 'version' in (
    '1.5.0',
    '1.6.0',
    '1.7.0',
    '1.8.0',
    '1.9.0',
    '1.10.0',
    '1.11.0',
    '1.12.0',
    '1.13.0',
    '1.13.1',
    '1.14.0',
    '1.15.0',
    '1.16.0',
    '1.16.1',
    '1.16.2'
  );
