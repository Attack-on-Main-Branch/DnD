import { updateSession } from "@/utils/supabase/middleware";

/**
 * Next.js 16 renamed the `middleware` file convention to `proxy`; the old name
 * still works but logs a deprecation warning on every build. The function
 * itself is unchanged — it must be the default export, or a named export
 * matching the file name.
 */
export async function proxy(request) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every request except static assets, so the Supabase auth token
     * is refreshed before any page, action or route handler executes.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
