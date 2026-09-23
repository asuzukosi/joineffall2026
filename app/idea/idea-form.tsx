"use client";

import { useActionState } from "react";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonCard } from "@/components/person-card";
import { think, type IdeaState } from "./actions";

export function IdeaForm() {
  const [state, action, pending] = useActionState<IdeaState, FormData>(
    think,
    {},
  );

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Who should I talk to?</h1>
        <p className="text-sm text-muted-foreground">
          Describe what you are working on. You get the kinds of people worth
          hearing from, and who in the cohort&rsquo;s network is one.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-3">
        <textarea
          name="idea"
          rows={4}
          required
          defaultValue={state.idea}
          placeholder="An AI tool that helps dental practices chase unpaid insurance claims."
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <Button disabled={pending} className="self-start">
          <Lightbulb className="size-4" aria-hidden />
          {pending ? "Thinking…" : "Find people to talk to"}
        </Button>
      </form>

      {state.error && <p className="text-destructive">{state.error}</p>}

      <div className="flex flex-col gap-8">
        {state.roles?.map((role) => (
          <section key={role.role} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 border-b pb-2">
              <h2 className="font-medium">{role.role}</h2>
              <p className="text-sm text-muted-foreground">{role.why}</p>
            </div>

            {role.people.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nobody in the cohort&rsquo;s network yet. More uploads, more reach.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {role.people.map((person) => (
                  <li key={person.url}>
                    <PersonCard person={person} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
