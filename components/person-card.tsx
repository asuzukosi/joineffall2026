import { ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HeatRing } from "@/components/heat-ring";
import type { Member } from "@/lib/roster";

export type Person = {
  url: string;
  name: string;
  title: string;
  company: string;
  reason: string;
  inCohort?: Member;
  via: Member[];
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function PersonCard({ person }: { person: Person }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <a
              href={`https://${person.url}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium hover:underline"
            >
              {person.name}
              <ExternalLink className="size-3.5 opacity-60" aria-hidden />
            </a>
            <span className="text-sm text-muted-foreground">
              {[person.title, person.company].filter(Boolean).join(" at ")}
            </span>
          </div>
          {!person.inCohort && <HeatRing paths={person.via.length} />}
        </div>

        <p className="text-sm">{person.reason}</p>

        {person.inCohort ? (
          <Badge variant="secondary" className="w-fit">
            In your cohort
          </Badge>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {person.via.map((member) => (
                <Tooltip key={member.email}>
                  <TooltipTrigger asChild>
                    <Avatar className="size-7 ring-2 ring-[var(--card)]">
                      <AvatarImage src={member.photo} alt={member.name} />
                      <AvatarFallback className="text-[10px]">
                        {initials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>{member.name}</TooltipContent>
                </Tooltip>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              can introduce you
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
