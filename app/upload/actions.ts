"use server";

import { getDb } from "@/lib/db";
import { ingest, type IngestResult } from "@/lib/bank";
import { parseConnections } from "@/lib/linkedin";
import { requireSession } from "@/lib/session";

export type UploadState = { error?: string; result?: IngestResult };

const LIMIT = 20 * 1024 * 1024;

export async function upload(
  _: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const { email } = await requireSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose your Connections.csv first." };
  }
  if (file.size > LIMIT) {
    return { error: "That file is far larger than any connections export." };
  }

  let rows;
  try {
    rows = parseConnections(await file.text());
  } catch {
    return {
      error:
        "That is not a LinkedIn connections export. Look for Connections.csv inside the zip LinkedIn emails you.",
    };
  }

  if (rows.length === 0) {
    return { error: "That export has no connections with a profile link in it." };
  }

  return { result: await ingest(getDb(), email, rows) };
}
