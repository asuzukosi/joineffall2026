"use client";

import { useActionState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PersonCard } from "@/components/person-card";
import { search, type SearchState } from "./actions";

export default function Search() {
  const [state, action, pending] = useActionState<SearchState, FormData>(
    search,
    {},
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-12">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-semibold">EF Fall 2026</h1>
        <a href="/upload" className="text-sm underline underline-offset-4">
          Add your connections
        </a>
      </header>

      <form action={action} className="flex gap-2">
        <Input
          name="q"
          defaultValue={state.query}
          placeholder="founders working on developer tools"
          aria-label="Search the cohort's network"
        />
        <Button disabled={pending}>
          <SearchIcon className="size-4" aria-hidden />
          {pending ? "Searching…" : "Search"}
        </Button>
      </form>

      {state.error && <p className="text-destructive">{state.error}</p>}

      {state.results?.length === 0 && state.query && !state.error && (
        <p className="text-muted-foreground">
          Nothing in the bank fits that yet. It fills up as more of the cohort
          add their connections.
        </p>
      )}

      <ul className="flex flex-col gap-4">
        {state.results?.map((person) => (
          <li key={person.url}>
            <PersonCard person={person} />
          </li>
        ))}
      </ul>
    </main>
  );
}
