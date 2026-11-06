import { readItemDocument } from "sina/data/item-documents";
import { isItemDocumentId } from "sina/rules/item-document";

import { logFailure } from "@/lib/errors";
import { createClient, getCurrentUser } from "@/lib/supabase";

const HEADERS = { "Cache-Control": "private, no-store" };

export async function GET(request) {
  const id = new URL(request.url).searchParams.get("id");

  if (!isItemDocumentId(id)) {
    return Response.json(
      { message: "That item has no HTML file." },
      { status: 404, headers: HEADERS },
    );
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError) {
    logFailure("itemDocument/auth", authError);
    return Response.json(
      {
        message: "Could not reach the sign-in service. Try again in a moment.",
      },
      { status: 503, headers: HEADERS },
    );
  }

  if (!user) {
    return Response.json(
      { message: "Sign in to check this item." },
      { status: 401, headers: HEADERS },
    );
  }

  const { data, error } = await readItemDocument(supabase, id);

  if (error) {
    if (error.reason !== "not_found") logFailure("itemDocument/read", error);
    return Response.json(
      {
        message:
          error.reason === "not_found"
            ? "That file is no longer available to you."
            : "Could not open that file. Try again.",
      },
      { status: error.reason === "not_found" ? 404 : 500, headers: HEADERS },
    );
  }

  return Response.json(data, { headers: HEADERS });
}
