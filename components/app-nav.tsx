import { headers } from "next/headers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EfMark } from "@/components/ef-mark";
import { memberByEmail } from "@/lib/roster";
import { currentEmail } from "@/lib/session";
import { signOut } from "@/app/session/actions";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export async function AppNav() {
  // The root domain is the landing page: no nav, no mark, nothing but the
  // headline and the video. The session cookie is scoped to the app host too,
  // but this says it rather than relying on that.
  const host = (await headers()).get("host")?.split(":")[0];
  if (host !== (process.env.APP_HOST ?? "localhost")) return null;

  const email = await currentEmail();
  if (!email) return null;

  const member = memberByEmail(email);

  return (
    <nav className="border-b">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-4 px-4">
        <a href="/search" className="flex items-center gap-2">
          <EfMark />
          <span className="text-sm font-semibold">Fall 2026</span>
        </a>

        <div className="ml-auto flex items-center gap-4">
          <a href="/upload" className="text-sm text-muted-foreground hover:text-foreground">
            Add your connections
          </a>
          <Avatar className="size-8">
            <AvatarImage src={member?.photo} alt={member?.name ?? email} />
            <AvatarFallback className="text-xs">
              {initials(member?.name ?? email)}
            </AvatarFallback>
          </Avatar>

          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
