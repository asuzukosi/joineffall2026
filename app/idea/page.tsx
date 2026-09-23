import { requireSession } from "@/lib/session";
import { IdeaForm } from "./idea-form";

export default async function IdeaPage() {
  await requireSession();
  return <IdeaForm />;
}
