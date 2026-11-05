import { readPartyExport } from "sina/data/party-export";

import { logFailure } from "@/lib/errors";
import { createClient, getCurrentUser } from "@/lib/supabase";

const HEADERS = { "Cache-Control": "private, no-store" };

export async function GET(_request, { params }) {
  const { id: campaignId } = await params;
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);
  if (authError) {
    logFailure("partyExport/auth", authError);
    return Response.json(
      { message: "Could not verify your session. Try again in a moment." },
      { status: 503, headers: HEADERS },
    );
  }
  if (!user) {
    return Response.json(
      { message: "Sign in to download party information." },
      { status: 401, headers: HEADERS },
    );
  }

  const { data, error } = await readPartyExport(supabase, {
    campaignId,
    userId: user.id,
  });
  if (error) {
    if (["not_found", "bad_id"].includes(error.reason)) {
      return Response.json(
        { message: "That campaign is no longer yours." },
        { status: 404, headers: HEADERS },
      );
    }
    logFailure("partyExport/read", error);
    return Response.json(
      { message: "Could not load the complete party information. Try again." },
      { status: 503, headers: HEADERS },
    );
  }

  return new Response(`${JSON.stringify(data, null, 2)}\n`, {
    headers: {
      ...HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="party-${data.campaign.id}-${data.exportedAt.slice(0, 10)}.json"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
