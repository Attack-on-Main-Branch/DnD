import AuthForm from "./auth-form";

export const metadata = {
  title: "Sign in · Grimoire Tales",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-center font-display text-3xl font-semibold tracking-wide text-ink drop-shadow-[0_0_24px_rgba(255,223,156,0.35)]">
          Grimoire Tales
        </h1>

        <AuthForm />
      </div>
    </main>
  );
}
