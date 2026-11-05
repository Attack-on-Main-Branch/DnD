import { notFound, redirect } from "next/navigation";

import { loadTableDisplay } from "@/app/dashboard/campaign/[id]/play/load-table-display";
import TableDisplay from "@/app/dashboard/campaign/[id]/play/table-display";
import { createClient, currentUser } from "@/lib/supabase";

export const metadata = { title: "Table display" };

export default async function TableDisplayPage({ params }) {
  const { id } = await params;
  const { user, error } = await currentUser();

  if (error) throw new Error("Could not verify your session");
  if (!user) redirect("/login");

  const display = await loadTableDisplay(await createClient(), id);
  if (!display) notFound();

  return <TableDisplay campaignId={id} {...display} />;
}
