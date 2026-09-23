import { requireSession } from "@/lib/session";
import { SearchForm } from "./search-form";

// The form is a client component, so the gate has to live here. Without it the
// page renders for anyone; only the action was ever checking.
export default async function SearchPage() {
  await requireSession();
  return <SearchForm />;
}
