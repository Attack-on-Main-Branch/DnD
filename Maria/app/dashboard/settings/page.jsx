import Link from "next/link";
import { redirect } from "next/navigation";

import { PANEL_CLASSES, surfaceClasses } from "@/app/components/ui/surface";
import { logFailure } from "@/lib/errors";
import { currentUser } from "@/lib/supabase";

import EmailForm from "./email-form";
import PasswordForm from "./password-form";
import SettingsSection from "./settings-section";
import UsernameForm from "./username-form";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { user, error: authError } = await currentUser();

  // See the note in dashboard/page.jsx: an unreachable auth service must not be
  // reported as a session that ran out.
  if (authError) {
    logFailure("settings/auth", authError);
    throw new Error("Could not verify your session (auth_unavailable)");
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <div data-fade className="float-in">
        <Link
          href="/dashboard"
          className="cursor-pointer font-sans text-sm text-ink/60 transition hover:text-gold"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-4 font-display text-3xl font-semibold">
          Account settings
        </h1>
      </div>

      {/* `panel-in` is the sheet's opening; `data-fold` is its closing, played
          by the layout on any way out of this page. */}
      <div
        data-fold
        className={surfaceClasses({
          glow: true,
          className: `panel-in ${PANEL_CLASSES}`,
        })}
      >
        {/* One element child, which is what the opening fades and lifts. */}
        <div className="flex flex-col gap-8">
          <SettingsSection
            title="Display name"
            description="The name shown on your dashboard. It is not your character's name."
          >
            <UsernameForm
              currentDisplayName={user.user_metadata?.display_name}
            />
          </SettingsSection>

          <SettingsSection
            title="Email address"
            description="Used to sign in. Changing it needs your current password."
          >
            <EmailForm currentEmail={user.email} />
          </SettingsSection>

          <SettingsSection
            title="Password"
            description="Changing your password needs the current one, even though you are already signed in."
          >
            <PasswordForm />
          </SettingsSection>
        </div>
      </div>
    </main>
  );
}
