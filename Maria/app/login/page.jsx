import AuthForm from "./auth-form";

export const metadata = {
  title: "Sign in · Dungeons and Demons",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12 font-sans">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-semibold tracking-tight">
          Dungeons &amp; Demons
        </h1>

        <AuthForm />
      </div>
    </main>
  );
}
