"use client";

import { useActionState } from "react";
import { ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { upload, type UploadState } from "./actions";

export function UploadForm() {
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
            <a
              href="https://www.linkedin.com/mypreferences/d/download-my-data"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4"
            >
              Request your data from LinkedIn
              <ExternalLink className="size-3.5 opacity-60" aria-hidden />
            </a>{" "}
            &mdash; tick <strong>Connections</strong>, and the file arrives by
            email in a few minutes. If you would rather click through yourself:
            Settings &rarr; Data privacy &rarr; Get a copy of your data.
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
