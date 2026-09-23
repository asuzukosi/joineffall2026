"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { upload, type UploadState } from "./actions";

export default function Upload() {
  const [state, action, pending] = useActionState<UploadState, FormData>(
    upload,
    {},
  );

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Add your connections</CardTitle>
          <CardDescription>
            LinkedIn &rarr; Settings &rarr; Data privacy &rarr; Get a copy of
            your data &rarr; Connections. The file arrives by email in a few
            minutes.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <form action={action} className="flex flex-col gap-3">
            <Input
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              aria-label="Your Connections.csv"
            />
            <Button disabled={pending}>
              {pending ? "Adding…" : "Add to the bank"}
            </Button>
          </form>

          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {state.result && (
            <Alert>
              <AlertDescription>
                Added {state.result.added.toLocaleString()}{" "}
                {state.result.added === 1 ? "person" : "people"},{" "}
                {state.result.shared.toLocaleString()} already here.
              </AlertDescription>
            </Alert>
          )}

          <p className="text-sm text-muted-foreground">
            Only who you are connected to is read &mdash; names, titles and
            companies. No messages, and nothing about who you talk to.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
