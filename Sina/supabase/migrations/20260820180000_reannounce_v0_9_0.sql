-- Puts the v0.9.0 notice back in front of anyone who was handed it before the
-- release shipped.
--
-- A release chore rather than a schema change, and the only kind of thing in
-- this directory that is. The notice was posted to whoever was signed in while
-- 0.9.0 was still being built, with wording 20260820160000 has since corrected,
-- and the whole point of `notifications_version_idx` is that a version is
-- announced once -- so those accounts would never see the finished one.
--
-- A status back to 'pending' rather than a delete: the row is the record of
-- which release its reader has been told about, and removing it would have
-- `announce_version` write a fresh one, which is a second row saying the same
-- thing. This way the same row simply becomes unread again.
--
-- A no-op on a database that never ran a pre-release build, which is every
-- fresh clone.
update public.notifications
set status = 'pending'
where type = 'system_changelog'
  and data ->> 'version' = '0.9.0'
  and status <> 'pending';
