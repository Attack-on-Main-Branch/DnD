import { redirect } from "next/navigation";

import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase";

import EmailForm from "./email-form";
import PasswordForm from "./password-form";
import SettingsCard from "./settings-card";
import UsernameForm from "./username-form";

export const metadata = {
  title: "Settings · Dungeons and Demons",
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const user = await getCurrentUser(supabase);

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12 font-sans">
      <div>
        <Link
          href="/dashboard"
          className="cursor-pointer text-sm text-neutral-600 transition hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          ← Back to characters
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
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
