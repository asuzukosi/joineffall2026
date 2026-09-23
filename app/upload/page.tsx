import { requireSession } from "@/lib/session";
import { UploadForm } from "./upload-form";

export default async function UploadPage() {
  await requireSession();
  return <UploadForm />;
}
