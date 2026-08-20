-- Removes the announcement for a version that was never released.
--
-- 0.10.0 was posted while this work was briefly numbered as a minor release. It
-- went back to 0.9.1 before shipping, and the notice stayed behind.
--
-- `latestAnnouncedVersion` reads the newest system_changelog row, and
-- `shouldAnnounce` is strictly newer so that a rollback cannot re-announce an
-- older release. Together those left every reader recorded as already told
-- about a version ahead of the one they are running: 0.9.1 would never arrive,
-- and neither would anything else short of 0.10.1.
--
-- Deleted rather than rewritten, which is the opposite of what 20260820160000
-- and 20260820180000 do, and for a reason that does not apply to them: those
-- rows record releases that happened. This one records a release that does not
-- exist, so there is nothing in it worth keeping.
delete from public.notifications
where type = 'system_changelog'
  and data ->> 'version' = '0.10.0';
