import Link from "next/link";
import { redirect } from "next/navigation";

import { logFailure } from "@/lib/errors";
import { currentUser } from "@/lib/supabase";

import EmailForm from "./email-form";
import PasswordForm from "./password-form";
import SettingsCard from "./settings-card";
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
      <div>
        <Link
          href="/dashboard"
          className="cursor-pointer font-sans text-sm text-ink/60 transition hover:text-gold"
        >
          ← Back to characters
        </Link>

        <h1 className="mt-4 font-display text-3xl font-semibold">
          Account settings
        </h1>
      </div>

      <SettingsCard
        title="Display name"
        description="The name shown on your dashboard. It is not your character's name."
      >
        <UsernameForm currentDisplayName={user.user_metadata?.display_name} />
      </SettingsCard>

      <SettingsCard
        title="Email address"
        description="Used to sign in. Changing it needs your current password."
      >
        <EmailForm currentEmail={user.email} />
      </SettingsCard>

      <SettingsCard
        title="Password"
        description="Changing your password needs the current one, even though you are already signed in."
      >
        <PasswordForm />
      </SettingsCard>
    </main>
  );
}
