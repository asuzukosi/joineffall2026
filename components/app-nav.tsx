import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EfMark } from "@/components/ef-mark";
import { memberByEmail } from "@/lib/roster";
import { currentEmail } from "@/lib/session";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export async function AppNav() {
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
        </div>
      </div>
    </nav>
  );
}
