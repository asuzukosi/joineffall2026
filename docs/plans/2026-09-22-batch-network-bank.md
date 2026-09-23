# Batch Network Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A private site where members of one cohort upload their LinkedIn connections export, and any member can search the combined result in plain English and see who can make the introduction.

**Architecture:** One Next.js app on one Fly machine, answering on two hostnames. `joineffall2026.com` is a public landing page; `connections.joineffall2026.com` is the signed-in app, and middleware routes on the `Host` header. SQLite on a Fly volume holds two tables — `people` (deduped by LinkedIn profile URL) and `knows` (which member knows which person). The cohort roster is a CSV on the same volume, never in the repo. Search retrieves candidates from SQLite FTS5, counts introduction paths in SQL, and hands the shortlist to an OpenAI model to rank.

**Tech Stack:** Next.js (App Router) · TypeScript · Tailwind · ReUI on the shadcn CLI · better-sqlite3 · Better Auth (magic link) · Resend · OpenAI · Fly.io · Cloudflare DNS · Vitest

**Spec:** This document, § Spec.

---

## Spec

**Who sees this and what changes for them:** a cohort member opens the site, uploads one CSV, and can immediately find people in the cohort's combined network that they could not find on LinkedIn — each result naming the member who can introduce them.

**Data in:** each member's LinkedIn data export (`Connections.csv`: First Name, Last Name, URL, Email Address, Company, Position, Connected On). Nothing else. No OAuth to LinkedIn, no scraping.

**The join:** the LinkedIn profile URL is the primary key. The same person in two exports is one row in `people` and two rows in `knows`. Two members knowing someone is a stronger result than one.

**Who gets in:** only the emails on the roster. Magic link, no passwords.

**What the roster holds:** `name, email, linkedin, photo` for each cohort member. The member's own `linkedin` lets search say "that's Tomi, he's in your batch" instead of "via Ade". The `photo` is the face shown next to an introduction path.

**Public repo, private data:** the code is public so members can read what happens to their upload. The roster, the photos, the database and every key live on the Fly volume or in Fly secrets. Nothing personal is ever committed.

**Out of scope:** invitations, roles, per-member privacy rules, second-degree reach beyond the cohort's own uploads, a vector database, background jobs, an admin panel.

## Global Constraints

- Node 22. Next.js App Router. TypeScript `strict`. Tailwind.
- **Two hostnames, one app.** `joineffall2026.com` serves only the landing page. `connections.joineffall2026.com` serves everything else, and `BETTER_AUTH_URL` points at it. Middleware routes on the `Host` header; one Fly app holds both certificates.
- **ReUI is the UI.** Installed through the shadcn CLI against the `@reui` registry, configured the way seams does it: `new-york` style, `neutral` base colour, `lucide` icons, CSS variables on. Every surface — nav, cards, inputs, buttons, avatars, badges, tooltips, empty states — is composed from ReUI primitives. Do not hand-roll an element that the registry already has, and do not restyle one with ad-hoc classes where a variant exists. Read a component's real API with `get_component` before writing props; never guess them.
- Free-plan ReUI covers the primitives. Premium blocks are not licensed, so screens are composed from components rather than dropped in whole — which is what "minimal and clean" wants anyway.
- Exactly one Fly machine: `min_machines_running = 1`, `auto_stop_machines = "off"`. Task 8 puts a vector index in process memory; a second machine would serve a stale copy.
- SQLite via `better-sqlite3` at `/data/app.db`. Nothing else is seeded onto the volume: `fly ssh console -C`, `fly ssh sftp put` and stdin piping all fail to move a file of any size onto it. The cohort roster is the `ROSTER_CSV` Fly secret; member photos are objects in the `joineffall2026-photos` R2 bucket, served from `cdn.joineffall2026.com`, and the roster's `photo` column holds the full URL.
- `roster.csv`, `photos/`, `data/`, `.env*` are gitignored from the first commit. The repo is public from the first push, so a personal detail committed once is committed forever.
- One model provider: OpenAI. One key, `OPENAI_API_KEY`, for both ranking and (in Task 8) embeddings.
- Region `lhr`.
- Files stay under 250 lines, functions under 75. Split into a directory with an entry point rather than sibling files.
- Commit messages carry no agent attribution lines.
- App name, Fly app name and domain: `joineffall2026` / `joineffall2026.com`.

---

### Task 1: Repository, skeleton, first deploy

Deliverable: `https://joineffall2026.fly.dev` serves a page, from a public GitHub repo.

**Files:**
- Create: `package.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `Dockerfile`, `fly.toml`, `.gitignore`, `.dockerignore`, `vitest.config.ts`
- Test: none — the deliverable is verified by HTTP

**Interfaces:**
- Consumes: nothing
- Produces: a deployed Fly app named `joineffall2026` with a volume named `data` mounted at `/data`

- [ ] **Step 1: Scaffold the app**

```bash
cd ~/Developer/projects
npx create-next-app@latest joineffall2026 \
  --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm
cd joineffall2026
npm install better-sqlite3 csv-parse better-auth resend openai
npm install -D vitest @types/better-sqlite3
```

- [ ] **Step 2: Configure Next for a standalone container**

`next.config.ts`:

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
};

export default config;
```

- [ ] **Step 3: Add the test runner**

`vitest.config.ts`:

```ts
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
  resolve: { alias: { "@": resolve(__dirname) } },
});
```

Without the alias the `@/lib/...` imports every test uses resolve in Next but not in Vitest.

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 4: Write the landing page**

`app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold">EF Fall 2026</h1>
      <p className="text-neutral-600">
        Search the cohort&rsquo;s combined network.
      </p>
      <a className="underline" href="/login">Sign in</a>
    </main>
  );
}
```

- [ ] **Step 5: Keep private data out of git**

Append to `.gitignore`:

```gitignore
.env*
!.env.example
data/
roster.csv
photos/
```

`.dockerignore`:

```dockerignore
node_modules
.next
.git
data
roster.csv
photos
.env*
```

- [ ] **Step 6: Write the Dockerfile**

```dockerfile
FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 7: Write fly.toml**

```toml
app = "joineffall2026"
primary_region = "lhr"

[build]

[env]
  PORT = "3000"
  DB_PATH = "/data/app.db"

[[mounts]]
  source = "data"
  destination = "/data"

[http_service]
  internal_port = 3000
  force_https = true
  auto_start_machines = true
  auto_stop_machines = "off"
  min_machines_running = 1
```

- [ ] **Step 8: Commit and create the public repo**

```bash
git init -b main
git add -A
git commit -m "Next.js skeleton, Docker image and Fly config"
gh repo create joineffall2026 --public --source=. --remote=origin --push
```

- [ ] **Step 9: Create the Fly app and volume**

`flyctl auth login` is interactive — the user runs it. Then:

```bash
fly apps create joineffall2026
fly volumes create data --region lhr --size 1 --yes
fly deploy
```

- [ ] **Step 10: Verify the deploy**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://joineffall2026.fly.dev/
```

Expected: `200`.

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "Deploy skeleton to Fly" && git push
```

---

### Task 2: Domain, DNS and TLS

Deliverable: `https://joineffall2026.com` serves the same page with a valid certificate.

**Files:**
- Modify: `fly.toml` (no change expected; confirm `force_https`)

**Interfaces:**
- Consumes: the deployed app from Task 1
- Produces: `BETTER_AUTH_URL=https://joineffall2026.com` for Task 4

- [ ] **Step 1: Re-check availability immediately before buying**

Availability is cached in search results but authoritative in check. Registration was approved by the user at $10.46/yr; a materially different price means stop and ask again.

```
POST /accounts/{account_id}/registrar/domain-check   body: {"domains":["joineffall2026.com"]}
```

Expected: `registrable: true`, `registration_cost: "10.46"`.

- [ ] **Step 2: Register the domain**

```
POST /accounts/{account_id}/registrar/registrations
```

Requires on the Cloudflare account: a billing profile with a default payment method, a default registrant contact, and acceptance of the Domain Registration Agreement. If the call fails on any of those, stop and hand the user the dashboard link rather than working around it.

- [ ] **Step 3: Confirm the zone exists**

```bash
export CF_API_TOKEN="$(cat ~/.config/cloudflare/api_token)"
flarectl zone list | grep joineffall2026.com
```

If absent: `flarectl zone create --zone joineffall2026.com`.

- [ ] **Step 4: Point DNS at Fly**

```bash
fly ips list          # note the v4 (shared is fine) and v6 addresses
for name in @ connections; do
  flarectl dns create --zone joineffall2026.com --name "$name" --type A    --content <V4>
  flarectl dns create --zone joineffall2026.com --name "$name" --type AAAA --content <V6>
done
```

Both hostnames point at the same Fly app — the landing page and the app are one
deploy, split by `Host` in middleware.

Leave every record **DNS-only** (unproxied). Fly issues its own certificate, and
proxying before the certificate exists makes the challenge fail.

- [ ] **Step 5: Issue both certificates**

```bash
fly certs add joineffall2026.com
fly certs add connections.joineffall2026.com
fly certs show connections.joineffall2026.com
```

If it asks for an `_acme-challenge` CNAME, add it with `flarectl dns create` and re-run `fly certs show` until it reports issued.

- [ ] **Step 6: Verify**

```bash
for h in joineffall2026.com connections.joineffall2026.com; do
  printf "%-34s %s\n" "$h" "$(curl -sS -o /dev/null -w "%{http_code}" "https://$h/")"
done
```

Expected: `200` from both.

- [ ] **Step 7: Commit**

```bash
git commit --allow-empty -m "Attach joineffall2026.com to the Fly app" && git push
```

---

### Task 3: Roster loading and seeding

Deliverable: the running app can read the cohort roster from the volume; `roster.csv` and photos never touch git.

**Files:**
- Create: `lib/roster.ts`, `scripts/set-roster.sh`, `roster.example.csv`
- Test: `tests/roster.test.ts`

**Interfaces:**
- Consumes: the `ROSTER_CSV` secret
- Produces:
  - `type Member = { name: string; email: string; linkedin: string; photo: string }`
  - `normaliseLinkedIn(url: string): string`
  - `loadRoster(): Member[]`
  - `isMember(email: string): boolean`
  - `memberByLinkedIn(url: string): Member | undefined`
  - `memberByEmail(email: string): Member | undefined`

- [ ] **Step 1: Write the failing test**

`tests/roster.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normaliseLinkedIn, parseRoster } from "@/lib/roster";

describe("normaliseLinkedIn", () => {
  it("strips scheme, subdomain, query and trailing slash", () => {
    expect(normaliseLinkedIn("https://www.linkedin.com/in/Ade-Okafor/?trk=abc"))
      .toBe("linkedin.com/in/ade-okafor");
  });

  it("returns an empty string for anything that is not a profile", () => {
    expect(normaliseLinkedIn("")).toBe("");
    expect(normaliseLinkedIn("https://example.com/ade")).toBe("");
  });

  it("lands an escaped accent and a literal one on the same key", () => {
    expect(normaliseLinkedIn("https://linkedin.com/in/bodinestubb%c3%a9"))
      .toBe(normaliseLinkedIn("https://www.linkedin.com/in/bodinestubbé/"));
  });

  it("survives a stray percent sign", () => {
    expect(normaliseLinkedIn("https://linkedin.com/in/ade-100%"))
      .toBe("linkedin.com/in/ade-100%");
  });
});

describe("parseRoster", () => {
  const csv = [
    "name,email,linkedin,photo",
    "Ade Okafor,Ade@Example.com,https://www.linkedin.com/in/ade-okafor/,ade.jpg",
  ].join("\n");

  it("lowercases the email and normalises the profile url", () => {
    const [ade] = parseRoster(csv);
    expect(ade.email).toBe("ade@example.com");
    expect(ade.linkedin).toBe("linkedin.com/in/ade-okafor");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — `lib/roster.ts` does not exist.

- [ ] **Step 3: Implement it**

`lib/roster.ts`:

```ts
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";

export type Member = {
  name: string;
  email: string;
  linkedin: string;
  photo: string;
};

export function normaliseLinkedIn(url: string): string {
  let text = url.trim();
  // Three cohort profiles carry accents as %c3%a9 etc. An export may spell the
  // same profile either way, so both forms have to land on one key.
  try {
    text = decodeURIComponent(text);
  } catch {
    // a stray % is not an escape; compare what we were given
  }
  const cleaned = text.toLowerCase().split("?")[0].replace(/\/+$/, "");
  return cleaned.match(/linkedin\.com\/in\/[^/]+/)?.[0] ?? "";
}

export function parseRoster(csv: string): Member[] {
  const rows: Record<string, string>[] = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return rows
    .filter((r) => r.email)
    .map((r) => ({
      name: r.name,
      email: r.email.toLowerCase(),
      linkedin: normaliseLinkedIn(r.linkedin ?? ""),
      photo: r.photo ?? "",
    }));
}

let cached: Member[] | undefined;

export function loadRoster(): Member[] {
  cached ??= parseRoster(
    process.env.ROSTER_CSV ?? raise("ROSTER_CSV is not set"),
  );
  return cached;
}

export function memberByEmail(email: string): Member | undefined {
  return loadRoster().find((m) => m.email === email.trim().toLowerCase());
}

export function isMember(email: string): boolean {
  return memberByEmail(email) !== undefined;
}

export function memberByLinkedIn(url: string): Member | undefined {
  const key = normaliseLinkedIn(url);
  return key ? loadRoster().find((m) => m.linkedin === key) : undefined;
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Add an example roster for the repo**

`roster.example.csv` — committed, fake, documents the format:

```csv
name,email,linkedin,photo
Example Member,member@example.com,https://www.linkedin.com/in/example-member/,example.jpg
```

- [ ] **Step 6: Write the seeding script**

`scripts/seed-roster.sh` — run from a directory holding the real `roster.csv` and `photos/`, neither of which is in the repo:

```bash
#!/usr/bin/env bash
set -euo pipefail
test -f roster.csv || { echo "roster.csv not found in $(pwd)"; exit 1; }
tar czf - roster.csv photos | fly ssh console -C "sh -c 'cd /data && tar xzf -'"
fly ssh console -C "ls -la /data"
```

`chmod +x scripts/seed-roster.sh`.

- [ ] **Step 7: Seed the volume and verify**

```bash
./scripts/seed-roster.sh
```

Expected: `ls` output shows `roster.csv` and `photos/`.

- [ ] **Step 8: Commit**

```bash
git add lib/roster.ts tests/roster.test.ts scripts/seed-roster.sh roster.example.csv
git commit -m "Load the cohort roster from the volume"
git push
```

---

### Task 4: Sign-in by email

Deliverable: a roster email receives a link and lands signed in; a non-roster email gets the same on-screen reply and no email.

**Files:**
- Create: `lib/auth.ts`, `lib/email.ts`, `lib/session.ts`, `lib/migrations/001_auth.sql`, `app/api/auth/[...all]/route.ts`, `app/login/page.tsx`, `app/login/actions.ts`
- Modify: `lib/db.ts` is created in Task 5; until then `lib/auth.ts` opens its own `Database` instance and Task 5 refactors it to share one

**Interfaces:**
- Consumes: `isMember` from Task 3
- Produces:
  - `auth` (the Better Auth instance)
  - `requireSession(): Promise<{ email: string }>` — redirects to `/login` when signed out

- [ ] **Step 1: Read the current magic-link API**

The Better Auth skill's own instruction is to confirm syntax against the docs, because plugin options move between versions. Read `better-auth.com/docs/plugins/magic-link` and `better-auth.com/docs/integrations/next` before writing Step 3, and correct the option names below if they have changed.

- [ ] **Step 2: Set the secrets**

```bash
fly secrets set \
  BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  BETTER_AUTH_URL="https://joineffall2026.com" \
  RESEND_API_KEY="<from resend.com>" \
  RESEND_FROM="onboarding@resend.dev"
```

`onboarding@resend.dev` only delivers to the Resend account owner's own address — enough to prove the flow. Task 9 switches it to the real domain.

- [ ] **Step 3: Write the email sender**

`lib/email.ts`:

```ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendLoginEmail(to: string, url: string) {
  await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to,
    subject: "Your sign-in link",
    text: `Sign in to the EF Fall 2026 network bank:\n\n${url}\n\nThe link works for 15 minutes.`,
  });
}
```

- [ ] **Step 4: Write the auth config**

`lib/auth.ts`:

```ts
import Database from "better-sqlite3";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins/magic-link";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { isMember } from "./roster";
import { sendLoginEmail } from "./email";

export const auth = betterAuth({
  appName: "EF Fall 2026",
  database: new Database(process.env.DB_PATH ?? "./data/app.db"),
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
  plugins: [
    magicLink({
      expiresIn: 900,
      sendMagicLink: async ({ email, url }) => sendLoginEmail(email, url),
    }),
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/magic-link") return;
      const email = String(ctx.body?.email ?? "");
      if (!isMember(email)) {
        throw new APIError("BAD_REQUEST", { message: "Not on the roster" });
      }
    }),
  },
});
```

The login page shows the same message whether or not the call succeeded, so the roster is not enumerable from outside.

- [ ] **Step 5: Generate and commit the auth schema**

```bash
DB_PATH=./data/app.db npx @better-auth/cli@latest generate --output lib/migrations/001_auth.sql
```

The runtime image is a standalone bundle without the CLI, so migrations are applied by the app at boot (Task 5) from committed SQL rather than by running the CLI on the machine.

- [ ] **Step 6: Mount the route handler**

`app/api/auth/[...all]/route.ts`:

```ts
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 7: Add the session helper**

`lib/session.ts`:

```ts
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email) redirect("/login");
  return { email: session.user.email.toLowerCase() };
}
```

- [ ] **Step 8: Build the login page**

`app/login/actions.ts`:

```ts
"use server";

import { auth } from "@/lib/auth";

export async function requestLink(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  try {
    await auth.api.signInMagicLink({ body: { email } });
  } catch {
    // Off-roster addresses fail here; the page says the same thing either way.
  }
}
```

`app/login/page.tsx`:

```tsx
import { requestLink } from "./actions";

export default function Login() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form action={requestLink} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="rounded border px-3 py-2"
        />
        <button className="rounded bg-black px-3 py-2 text-white">
          Email me a link
        </button>
      </form>
      <p className="text-sm text-neutral-500">
        If your address is on the cohort roster, a link is on its way.
      </p>
    </main>
  );
}
```

- [ ] **Step 9: Deploy and verify both paths**

```bash
fly deploy
curl -sS https://joineffall2026.com/api/auth/ok
```

Expected: `{"status":"ok"}`. Then request a link for a real roster address and sign in; request one for `nobody@example.com` and confirm no email arrives and the page reads the same.

- [ ] **Step 10: Commit**

```bash
git add lib/auth.ts lib/email.ts lib/session.ts lib/migrations app/api/auth app/login
git commit -m "Sign in with a magic link, limited to roster emails"
git push
```

---

### Task 5: Database schema and the LinkedIn export parser

Deliverable: the two tables exist on boot, and a real `Connections.csv` parses into clean rows.

**Files:**
- Create: `lib/db.ts`, `lib/migrations/002_bank.sql`, `lib/linkedin.ts`, `tests/fixtures/connections.csv`
- Modify: `lib/auth.ts` (share the single database handle)
- Test: `tests/linkedin.test.ts`

**Interfaces:**
- Consumes: `normaliseLinkedIn` from Task 3
- Produces:
  - `getDb(): Database.Database` — opens `DB_PATH`, applies every migration once, returns the shared handle
  - `type Connection = { url: string; name: string; title: string; company: string; connectedOn: string }`
  - `parseConnections(csv: string): Connection[]`

- [ ] **Step 1: Write the fixture**

`tests/fixtures/connections.csv` — reproduces the preamble LinkedIn puts above the header:

```csv
Notes:
"When exporting your connection data, you may notice that some of the fields are empty."

First Name,Last Name,URL,Email Address,Company,Position,Connected On
Neha,Mittal,https://www.linkedin.com/in/neha-mittal/,,JustAI,CEO and Co-founder,14 Mar 2021
Alexandre,Berkovic,https://www.linkedin.com/in/alexandre-berkovic?trk=x,,Sphinx,Co-Founder & CEO,02 Feb 2023
Restricted,Profile,,,,,
```

- [ ] **Step 2: Write the failing test**

`tests/linkedin.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseConnections } from "@/lib/linkedin";

const csv = readFileSync("tests/fixtures/connections.csv", "utf8");

describe("parseConnections", () => {
  it("skips the preamble and reads every usable row", () => {
    expect(parseConnections(csv)).toHaveLength(2);
  });

  it("normalises the profile url", () => {
    expect(parseConnections(csv)[1].url).toBe("linkedin.com/in/alexandre-berkovic");
  });

  it("drops rows with no profile url", () => {
    expect(parseConnections(csv).some((c) => c.name.startsWith("Restricted")))
      .toBe(false);
  });

  it("joins the name and keeps the title and company", () => {
    const [neha] = parseConnections(csv);
    expect(neha.name).toBe("Neha Mittal");
    expect(neha.title).toBe("CEO and Co-founder");
    expect(neha.company).toBe("JustAI");
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — `lib/linkedin.ts` does not exist.

- [ ] **Step 4: Implement the parser**

`lib/linkedin.ts`:

```ts
import { parse } from "csv-parse/sync";
import { normaliseLinkedIn } from "./roster";

export type Connection = {
  url: string;
  name: string;
  title: string;
  company: string;
  connectedOn: string;
};

export function parseConnections(csv: string): Connection[] {
  const lines = csv.split(/\r?\n/);
  const header = lines.findIndex((l) => l.startsWith("First Name,"));
  if (header === -1) throw new Error("No LinkedIn connections header found");

  const rows: Record<string, string>[] = parse(lines.slice(header).join("\n"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  return rows
    .map((r) => ({
      url: normaliseLinkedIn(r.URL ?? ""),
      name: `${r["First Name"] ?? ""} ${r["Last Name"] ?? ""}`.trim(),
      title: r.Position ?? "",
      company: r.Company ?? "",
      connectedOn: r["Connected On"] ?? "",
    }))
    .filter((c) => c.url && c.name);
}
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Write the bank schema**

`lib/migrations/002_bank.sql`:

```sql
create table if not exists people (
  url     text primary key,
  name    text not null,
  title   text,
  company text
);

create table if not exists knows (
  member_email text not null,
  url          text not null,
  connected_on text,
  primary key (member_email, url)
);

create virtual table if not exists people_fts using fts5(url unindexed, text);
```

- [ ] **Step 7: Write the database module**

`lib/db.ts`:

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

const MIGRATIONS = join(process.cwd(), "lib/migrations");

let db: Database.Database | undefined;

export function getDb(): Database.Database {
  if (db) return db;
  db = new Database(process.env.DB_PATH ?? "./data/app.db");
  db.pragma("journal_mode = WAL");
  for (const file of readdirSync(MIGRATIONS).sort()) {
    db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  }
  return db;
}
```

Every migration is written with `if not exists`, so re-running them on each boot is a no-op. That is the whole migration system; a version table is not worth its weight here.

- [ ] **Step 8: Share the handle with Better Auth**

In `lib/auth.ts`, replace `database: new Database(...)` with:

```ts
import { getDb } from "./db";
// ...
  database: getDb(),
```

The standalone build does not copy `lib/migrations`, so add to `next.config.ts`:

```ts
  outputFileTracingIncludes: { "/**": ["./lib/migrations/**"] },
```

- [ ] **Step 9: Deploy and verify the tables exist**

```bash
fly deploy
fly ssh console -C "sh -c 'apt-get install -y sqlite3 >/dev/null 2>&1; sqlite3 /data/app.db .tables'"
```

If `sqlite3` is unavailable in the image, verify instead by signing in — a successful sign-in proves the Better Auth tables were created by the same boot path.

- [ ] **Step 10: Commit**

```bash
git add lib/db.ts lib/linkedin.ts lib/migrations/002_bank.sql tests/
git commit -m "Create the bank schema and parse LinkedIn exports"
git push
```

---

### Task 6: Upload

Deliverable: a signed-in member drops their CSV and sees "added 1,412 people, 318 already here".

**Files:**
- Create: `lib/bank.ts`, `app/upload/page.tsx`, `app/upload/actions.ts`
- Test: `tests/bank.test.ts`

**Interfaces:**
- Consumes: `getDb` and `parseConnections` from Task 5, `requireSession` from Task 4
- Produces:
  - `type IngestResult = { rows: number; added: number; shared: number }`
  - `ingest(db: Database.Database, memberEmail: string, rows: Connection[]): IngestResult`

- [ ] **Step 1: Write the failing test**

`tests/bank.test.ts`:

```ts
import Database from "better-sqlite3";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { ingest } from "@/lib/bank";

function freshDb() {
  const db = new Database(":memory:");
  const dir = join(process.cwd(), "lib/migrations");
  for (const f of readdirSync(dir).sort().filter((f) => f.includes("bank"))) {
    db.exec(readFileSync(join(dir, f), "utf8"));
  }
  return db;
}

const neha = {
  url: "linkedin.com/in/neha-mittal",
  name: "Neha Mittal",
  title: "CEO",
  company: "JustAI",
  connectedOn: "14 Mar 2021",
};

let db: Database.Database;
beforeEach(() => { db = freshDb(); });

describe("ingest", () => {
  it("counts a first upload as all new", () => {
    expect(ingest(db, "ade@example.com", [neha]))
      .toEqual({ rows: 1, added: 1, shared: 0 });
  });

  it("counts a person a second member already knows as shared", () => {
    ingest(db, "ade@example.com", [neha]);
    expect(ingest(db, "tomi@example.com", [neha]))
      .toEqual({ rows: 1, added: 0, shared: 1 });
  });

  it("keeps one row per person and one edge per member", () => {
    ingest(db, "ade@example.com", [neha]);
    ingest(db, "tomi@example.com", [neha]);
    expect(db.prepare("select count(*) c from people").get()).toEqual({ c: 1 });
    expect(db.prepare("select count(*) c from knows").get()).toEqual({ c: 2 });
  });

  it("lets a newer upload refresh a stale title", () => {
    ingest(db, "ade@example.com", [{ ...neha, title: "Engineer" }]);
    ingest(db, "tomi@example.com", [neha]);
    expect(db.prepare("select title from people where url = ?").get(neha.url))
      .toEqual({ title: "CEO" });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — `lib/bank.ts` does not exist.

- [ ] **Step 3: Implement ingest**

`lib/bank.ts`:

```ts
import type Database from "better-sqlite3";
import type { Connection } from "./linkedin";

export type IngestResult = { rows: number; added: number; shared: number };

export function ingest(
  db: Database.Database,
  memberEmail: string,
  rows: Connection[],
): IngestResult {
  const upsertPerson = db.prepare(
    `insert into people (url, name, title, company) values (?, ?, ?, ?)
     on conflict(url) do update set
       name = excluded.name, title = excluded.title, company = excluded.company`,
  );
  const clearFts = db.prepare(`delete from people_fts where url = ?`);
  const insertFts = db.prepare(`insert into people_fts (url, text) values (?, ?)`);
  const addEdge = db.prepare(
    `insert or ignore into knows (member_email, url, connected_on) values (?, ?, ?)`,
  );
  const exists = db.prepare(`select 1 from people where url = ?`);

  let added = 0;
  db.transaction(() => {
    for (const row of rows) {
      if (!exists.get(row.url)) added += 1;
      upsertPerson.run(row.url, row.name, row.title, row.company);
      clearFts.run(row.url);
      insertFts.run(row.url, `${row.name} ${row.title} ${row.company}`);
      addEdge.run(memberEmail, row.url, row.connectedOn);
    }
  })();

  return { rows: rows.length, added, shared: rows.length - added };
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS, all four.

- [ ] **Step 5: Write the upload action**

`app/upload/actions.ts`:

```ts
"use server";

import { getDb } from "@/lib/db";
import { ingest } from "@/lib/bank";
import { parseConnections } from "@/lib/linkedin";
import { requireSession } from "@/lib/session";

import type { IngestResult } from "@/lib/bank";

export type UploadState = { error?: string; result?: IngestResult };

export async function upload(
  _: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const { email } = await requireSession();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose your Connections.csv first." };
  }
  try {
    const rows = parseConnections(await file.text());
    return { result: ingest(getDb(), email, rows) };
  } catch {
    return { error: "That does not look like a LinkedIn connections export." };
  }
}
```

- [ ] **Step 6: Write the upload page**

`app/upload/page.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { upload, type UploadState } from "./actions";

export default function Upload() {
  const [state, action, pending] = useActionState<UploadState, FormData>(
    upload,
    {},
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Add your connections</h1>
      <p className="text-neutral-600">
        LinkedIn &rarr; Settings &rarr; Data privacy &rarr; Get a copy of your data
        &rarr; Connections. The file arrives by email in a few minutes.
      </p>
      <form action={action} className="flex flex-col gap-3">
        <input name="file" type="file" accept=".csv" required />
        <button disabled={pending} className="rounded bg-black px-3 py-2 text-white">
          {pending ? "Adding…" : "Add to the bank"}
        </button>
      </form>
      {state.error && <p className="text-red-600">{state.error}</p>}
      {state.result && (
        <p>
          Added {state.result.added.toLocaleString()} people,{" "}
          {state.result.shared.toLocaleString()} already here.
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 7: Deploy and upload a real export**

```bash
fly deploy
```

Sign in, upload your own `Connections.csv`, and confirm the counts. Upload it a second time: `added` must be 0 and `shared` must equal the row count.

- [ ] **Step 8: Commit**

```bash
git add lib/bank.ts app/upload tests/bank.test.ts
git commit -m "Upload a LinkedIn export into the shared bank"
git push
```

---

### Task 7: Search

Deliverable: a member types a question and gets ten people, each with a reason and the member who can introduce them.

**Files:**
- Create: `lib/retrieve.ts`, `lib/rank.ts`, `app/search/actions.ts`, `app/photos/[file]/route.ts`
- Modify: `app/page.tsx` (becomes the signed-in search page)
- Test: `tests/retrieve.test.ts`

**Interfaces:**
- Consumes: `getDb` from Task 5, `memberByEmail` / `memberByLinkedIn` from Task 3
- Produces:
  - `type Candidate = { url: string; name: string; title: string; company: string; via: string[] }`
  - `retrieve(db: Database.Database, query: string, limit: number): Candidate[]`
  - `type Ranked = { url: string; reason: string }`
  - `rank(query: string, candidates: Candidate[]): Promise<Ranked[]>`

- [ ] **Step 1: Pick the model**

```bash
curl -sS https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY" \
  | jq -r '.data[].id' | sort
```

Choose the cheapest chat model in that list that supports JSON-schema structured output, and set it as a secret. Do not hardcode a model id from memory.

```bash
fly secrets set OPENAI_API_KEY="<key>" OPENAI_MODEL="<chosen id>"
```

- [ ] **Step 2: Write the failing retrieval test**

`tests/retrieve.test.ts`:

```ts
import Database from "better-sqlite3";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ingest } from "@/lib/bank";
import { retrieve } from "@/lib/retrieve";

function bankWithTwoMembers() {
  const db = new Database(":memory:");
  const dir = join(process.cwd(), "lib/migrations");
  for (const f of readdirSync(dir).sort().filter((f) => f.includes("bank"))) {
    db.exec(readFileSync(join(dir, f), "utf8"));
  }
  const neha = {
    url: "linkedin.com/in/neha-mittal", name: "Neha Mittal",
    title: "CEO", company: "JustAI", connectedOn: "",
  };
  ingest(db, "ade@example.com", [neha]);
  ingest(db, "tomi@example.com", [neha]);
  return db;
}

describe("retrieve", () => {
  it("finds a person by company and names every member who knows them", () => {
    const [hit] = retrieve(bankWithTwoMembers(), "JustAI", 10);
    expect(hit.name).toBe("Neha Mittal");
    expect(hit.via.sort()).toEqual(["ade@example.com", "tomi@example.com"]);
  });

  it("returns nothing rather than throwing on punctuation", () => {
    expect(retrieve(bankWithTwoMembers(), '"; drop table people; --', 10))
      .toEqual([]);
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — `lib/retrieve.ts` does not exist.

- [ ] **Step 4: Implement retrieval**

`lib/retrieve.ts`:

```ts
import type Database from "better-sqlite3";

export type Candidate = {
  url: string;
  name: string;
  title: string;
  company: string;
  via: string[];
};

function toMatchQuery(query: string): string {
  const words = query.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return words.map((w) => `"${w}"`).join(" OR ");
}

export function retrieve(
  db: Database.Database,
  query: string,
  limit: number,
): Candidate[] {
  const match = toMatchQuery(query);
  if (!match) return [];

  const rows = db
    .prepare(
      `select p.url, p.name, p.title, p.company,
              group_concat(k.member_email) as via
         from people_fts f
         join people p on p.url = f.url
         join knows  k on k.url = p.url
        where people_fts match ?
        group by p.url
        order by count(k.member_email) desc
        limit ?`,
    )
    .all(match, limit) as (Omit<Candidate, "via"> & { via: string })[];

  return rows.map((r) => ({ ...r, via: r.via.split(",") }));
}
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Implement ranking**

`lib/rank.ts`:

```ts
import OpenAI from "openai";
import type { Candidate } from "./retrieve";

const client = new OpenAI();

export type Ranked = { url: string; reason: string };

const SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: { url: { type: "string" }, reason: { type: "string" } },
        required: ["url", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
} as const;

export async function rank(
  query: string,
  candidates: Candidate[],
): Promise<Ranked[]> {
  if (candidates.length === 0) return [];

  const list = candidates
    .map((c) => `${c.url} | ${c.name} | ${c.title} at ${c.company}`)
    .join("\n");

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL!,
    messages: [
      {
        role: "system",
        content:
          "Pick the ten people from the list that best answer the question. " +
          "Give one short sentence of evidence for each, drawn only from the " +
          "line you were given. Return fewer than ten, or none, rather than " +
          "stretching to fill the list.",
      },
      { role: "user", content: `${query}\n\n${list}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "results", schema: SCHEMA, strict: true },
    },
  });

  const content = completion.choices[0]?.message?.content ?? '{"results":[]}';
  return (JSON.parse(content).results as Ranked[]).slice(0, 10);
}
```

- [ ] **Step 7: Serve cohort photos from the volume**

`app/photos/[file]/route.ts`:

```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadRoster } from "@/lib/roster";

export const runtime = "nodejs";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  // Only names the roster itself lists, so the path cannot be walked.
  if (!loadRoster().some((m) => m.photo === file)) {
    return new Response("Not found", { status: 404 });
  }
  const bytes = await readFile(join(process.env.PHOTO_DIR ?? "./photos", file));
  return new Response(new Uint8Array(bytes), {
    headers: { "content-type": "image/webp", "cache-control": "private, max-age=3600" },
  });
}
```

- [ ] **Step 8: Wire the search action**

`app/search/actions.ts`:

```ts
"use server";

import { getDb } from "@/lib/db";
import { retrieve, type Candidate } from "@/lib/retrieve";
import { rank } from "@/lib/rank";
import { memberByEmail, memberByLinkedIn, type Member } from "@/lib/roster";
import { requireSession } from "@/lib/session";

export type Result = Omit<Candidate, "via"> & {
  reason: string;
  inCohort: Member | undefined;
  via: Member[];
};

export type SearchState = { query?: string; results?: Result[] };

export async function search(
  _: SearchState,
  formData: FormData,
): Promise<SearchState> {
  await requireSession();
  const query = String(formData.get("q") ?? "").trim();
  if (!query) return {};

  const candidates = retrieve(getDb(), query, 300);
  const ranked = await rank(query, candidates);
  const byUrl = new Map(candidates.map((c) => [c.url, c]));

  return {
    query,
    results: ranked.flatMap((r) => {
      const c = byUrl.get(r.url);
      if (!c) return [];
      return [{
        ...c,
        reason: r.reason,
        inCohort: memberByLinkedIn(c.url),
        via: c.via.flatMap((e) => memberByEmail(e) ?? []),
      }];
    }),
  };
}
```

- [ ] **Step 9: Build the result card**

Every result is a ReUI `Card`. LinkedIn publishes no embeddable profile card, so
this is ours, linking out to theirs:

```
┌────────────────────────────────────────────────────────┐
│  Neha Mittal                              🔥 Hot · 4   │
│  CEO and Co-founder at JustAI                          │
│                                                         │
│  Ex-Twitter growth lead, now building AI marketing      │
│  infrastructure — closest match to "growth at an AI     │
│  company" in the bank.                                  │
│                                                         │
│  ( A )( P )( T )( +1 )   can introduce you    [ View ↗ ]│
└────────────────────────────────────────────────────────┘
```

Composed from `card`, `avatar`, `badge`, `button` and `tooltip`. The stacked
circles are the cohort members who know this person, each a member photo with
their name on hover; the link opens the LinkedIn profile.

`components/person-card.tsx` holds it.

#### The heat ring

A ring that fills and reddens with the number of cohort members who know the
person. Five is full and pure red, with a fire emoji beside it.

ReUI's free `progress` is a linear bar — there is no radial component in the
registry, so this is the one place we draw our own. It is two SVG circles and a
`stroke-dasharray`; a component library is not needed for that.

`components/heat-ring.tsx`:

```tsx
export function HeatRing({ paths }: { paths: number }) {
  const level = Math.min(paths, 5);
  const radius = 14;
  const circumference = 2 * Math.PI * radius;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative inline-flex size-9 items-center justify-center">
        <svg viewBox="0 0 36 36" className="absolute size-9 -rotate-90" aria-hidden>
          <circle cx="18" cy="18" r={radius} fill="none" strokeWidth="3"
                  stroke="var(--heat-track)" />
          <circle cx="18" cy="18" r={radius} fill="none" strokeWidth="3"
                  stroke={`var(--heat-${level})`} strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - level / 5)} />
        </svg>
        <span className="text-xs font-medium tabular-nums">{paths}</span>
      </span>
      {level >= 5 && <span aria-hidden>🔥</span>}
      <span className="sr-only">
        {paths === 1 ? "1 cohort member knows them" : `${paths} cohort members know them`}
      </span>
    </span>
  );
}
```

The count sits inside the ring, so the reading never depends on colour — arc
length, the number and the emoji all carry it. `paths` comes from `via.length`,
the same value the SQL sorts on, so the ring and the result order cannot
disagree.

#### The ramp

Generated in OKLCH at the hue of the status red and validated with the dataviz
palette checker, `--ordinal`, against both surfaces. Dark is its own set of
steps, not a flip of the light one:

```css
:root {
  --heat-track: #ececea;
  --heat-1: #bbb2b1;  --heat-2: #bf928d;  --heat-3: #bd6c65;
  --heat-4: #b8403d;  --heat-5: #a70118;
}

@media (prefers-color-scheme: dark) {
  :root {
    --heat-track: #2e2e2c;
    --heat-1: #706665;  --heat-2: #99726e;  --heat-3: #c37c76;
    --heat-4: #ee857d;  --heat-5: #fda19a;
  }
}
```

Both sets pass all four ordinal checks — single hue (1° spread), monotone
lightness, every adjacent gap ≥ 0.06, and the palest step clear of its surface
(2.02:1 light, 3.13:1 dark). A neutral grey at the low end **fails** the
single-hue check, because grey has no stable hue; the first step is a
near-colourless red instead, which reads as grey and keeps the ramp one hue.

Re-run the checker if any step changes:

```bash
node scripts/validate_palette.js "#bbb2b1,#bf928d,#bd6c65,#b8403d,#a70118" --mode light --ordinal
```

A person who is themselves in the cohort shows an "In your cohort" badge and no
ring — you do not need an introduction to someone in the room.

**Confirm every prop against `get_component` before writing it.** ReUI is
shadcn-compatible but its `variant`, `size` and `radius` values are its own —
the badge takes solid, `-outline` and `-light` variants per colour. Guessing
them produces markup that renders unstyled.

- [ ] **Step 10: Build the page around it**

`app/page.tsx` is the signed-in search surface: the app nav, a ReUI `Input` and
`Button` in the search form, a list of `PersonCard`s, and a ReUI empty state
when a query returns nothing. `requireSession` sends signed-out visitors to
`/login`, which is itself built from ReUI `Card`, `Input` and `Button`.

No hand-rolled element where the registry has one, and no ad-hoc classes where
a variant exists.

- [ ] **Step 11: Deploy and search for real**

```bash
fly deploy
```

With at least two exports uploaded, run three queries you know the answer to and check the via-line names the right member.

- [ ] **Step 12: Commit**

```bash
git add lib/retrieve.ts lib/rank.ts app/search app/photos app/page.tsx tests/retrieve.test.ts
git commit -m "Search the bank and rank results with introduction paths"
git push
```

---

### Task 8: Swap keyword retrieval for embeddings

Deliverable: "fintech compliance" finds "regulatory technology at a bank". Same `retrieve` signature, different internals — the FTS5 version is replaced, not kept alongside.

**Files:**
- Create: `lib/embed.ts`, `lib/migrations/003_vectors.sql`
- Modify: `lib/retrieve.ts`, `lib/bank.ts` (embed on ingest)
- Test: `tests/retrieve.test.ts` (same assertions, now against embeddings)

**Interfaces:**
- Consumes: `OPENAI_API_KEY`
- Produces:
  - `embed(texts: string[]): Promise<Float32Array[]>`
  - `indexPeople(db: Database.Database, people: { url: string; text: string }[]): Promise<void>`
  - `invalidateIndex(): void`
  - `retrieve` keeps its `Candidate[]` shape but becomes `async`; `ingest` becomes `async` too. Both call sites (`app/search/actions.ts`, `app/upload/actions.ts`) gain an `await`.

- [ ] **Step 1: Add the vector table**

`lib/migrations/003_vectors.sql`:

```sql
create table if not exists vectors (
  url text primary key,
  v   blob not null
);
```

- [ ] **Step 2: Write the embedding module**

`lib/embed.ts`:

```ts
import OpenAI from "openai";

const client = new OpenAI();
const MODEL = "text-embedding-3-small";

export async function embed(texts: string[]): Promise<Float32Array[]> {
  const res = await client.embeddings.create({ model: MODEL, input: texts });
  return res.data.map((d) => {
    const v = Float32Array.from(d.embedding);
    let norm = 0;
    for (const x of v) norm += x * x;
    norm = Math.sqrt(norm);
    for (let i = 0; i < v.length; i++) v[i] /= norm;
    return v;
  });
}
```

Vectors are stored normalised, so the search is a dot product with no division per row.

- [ ] **Step 3: Add the indexer, and embed on ingest**

Append to `lib/embed.ts`:

```ts
import type Database from "better-sqlite3";

export async function indexPeople(
  db: Database.Database,
  people: { url: string; text: string }[],
): Promise<void> {
  const save = db.prepare(
    `insert into vectors (url, v) values (?, ?)
     on conflict(url) do update set v = excluded.v`,
  );
  for (let i = 0; i < people.length; i += 256) {
    const batch = people.slice(i, i + 256);
    const vectors = await embed(batch.map((p) => p.text));
    db.transaction(() => {
      batch.forEach((p, j) => save.run(p.url, Buffer.from(vectors[j].buffer)));
    })();
  }
}
```

In `lib/bank.ts`, make `ingest` async and index after the transaction commits:

```ts
export async function ingest(
  db: Database.Database,
  memberEmail: string,
  rows: Connection[],
): Promise<IngestResult> {
  // ...the existing synchronous transaction, unchanged...

  await indexPeople(
    db,
    rows.map((r) => ({
      url: r.url,
      text: `${r.name} ${r.title} ${r.company}`,
    })),
  );
  invalidateIndex();

  return { rows: rows.length, added, shared: rows.length - added };
}
```

Then `return { result: await ingest(getDb(), email, rows) };` in `app/upload/actions.ts`.

- [ ] **Step 4: Replace the body of retrieve**

`lib/retrieve.ts` — `toMatchQuery` and the FTS5 query are deleted, not kept as a fallback:

```ts
import type Database from "better-sqlite3";
import { embed } from "./embed";

export type Candidate = {
  url: string;
  name: string;
  title: string;
  company: string;
  via: string[];
};

type Index = { urls: string[]; matrix: Float32Array; dims: number };

let index: Index | undefined;

export function invalidateIndex() {
  index = undefined;
}

function loadIndex(db: Database.Database): Index {
  if (index) return index;
  const rows = db.prepare(`select url, v from vectors`).all() as {
    url: string;
    v: Buffer;
  }[];
  const dims = rows.length ? rows[0].v.byteLength / 4 : 0;
  const matrix = new Float32Array(rows.length * dims);
  rows.forEach((r, i) =>
    matrix.set(new Float32Array(r.v.buffer, r.v.byteOffset, dims), i * dims),
  );
  index = { urls: rows.map((r) => r.url), matrix, dims };
  return index;
}

export async function retrieve(
  db: Database.Database,
  query: string,
  limit: number,
): Promise<Candidate[]> {
  const { urls, matrix, dims } = loadIndex(db);
  if (!urls.length || !query.trim()) return [];

  const [q] = await embed([query]);
  const scored = urls.map((url, i) => {
    let dot = 0;
    for (let d = 0; d < dims; d++) dot += matrix[i * dims + d] * q[d];
    return { url, dot };
  });
  scored.sort((a, b) => b.dot - a.dot);
  const top = scored.slice(0, limit).map((s) => s.url);

  const rows = db
    .prepare(
      `select p.url, p.name, p.title, p.company,
              group_concat(k.member_email) as via
         from people p
         join knows k on k.url = p.url
        where p.url in (${top.map(() => "?").join(",")})
        group by p.url`,
    )
    .all(...top) as (Omit<Candidate, "via"> & { via: string })[];

  const byUrl = new Map(rows.map((r) => [r.url, r]));
  return top.flatMap((u) => {
    const r = byUrl.get(u);
    return r ? [{ ...r, via: r.via.split(",") }] : [];
  });
}
```

Then `const candidates = await retrieve(getDb(), query, 300);` in `app/search/actions.ts`.

- [ ] **Step 5: Backfill the people already in the bank**

Each member re-uploads the same file. The upsert is idempotent, `added` comes back as 0, and every row gets embedded on the way through. Re-embedding a whole cohort costs cents, which is cheaper than a one-off script nobody will run twice.

- [ ] **Step 6: Run the tests and deploy**

Run: `npm test` — the Task 7 retrieval tests must still pass with the embedding implementation, with the FTS5-specific punctuation test replaced by one asserting a semantic match.

- [ ] **Step 7: Commit**

```bash
git add lib/embed.ts lib/retrieve.ts lib/bank.ts lib/migrations/003_vectors.sql tests/
git commit -m "Retrieve candidates by embedding similarity"
git push
```

---

### Task 9: Sending domain, README and a privacy pass

Deliverable: mail arrives from the real domain, and a stranger reading the public repo can see exactly what happens to an upload.

**Files:**
- Create: `README.md`, `.env.example`
- Modify: Fly secret `RESEND_FROM`

- [ ] **Step 1: Verify the sending domain with Resend**

Add the domain in Resend, then create the records it shows:

```bash
export CF_API_TOKEN="$(cat ~/.config/cloudflare/api_token)"
flarectl dns create --zone joineffall2026.com --name <name> --type TXT --content "<value>"
```

Then `fly secrets set RESEND_FROM="hello@joineffall2026.com"` and request a fresh login link to confirm delivery.

- [ ] **Step 2: Write `.env.example`**

```dotenv
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
DB_PATH=./data/app.db
ROSTER_CSV=
PHOTO_DIR=./photos
RESEND_API_KEY=
RESEND_FROM=
OPENAI_API_KEY=
OPENAI_MODEL=
```

- [ ] **Step 3: Write the README**

Cover, in this order: what the site does; that only roster emails can sign in; that the export's message content never leaves LinkedIn because only the connections file is uploaded; where the roster, photos and database live (the Fly volume, not this repo); what a member should do to remove themselves; and how to run it locally.

- [ ] **Step 4: Prove nothing personal was ever committed**

```bash
git log --all --numstat --format= -- roster.csv photos | head
git grep -nEi "linkedin\.com/in/|@(gmail|outlook)\." $(git rev-list --all) -- . | head
```

Expected: no output from either, apart from the fake example row. If anything real appears, rewrite history before the repo is shared.

- [ ] **Step 5: Commit**

```bash
git add README.md .env.example
git commit -m "Document the deployment and the privacy model"
git push
```

---

## Deferred, deliberately

- Removing yourself deletes your `knows` rows and any orphaned `people` — one route, add it when someone asks.
- A second machine. The vector index lives in process memory; scaling out needs a shared store first.
- Anything beyond the cohort's own uploads: no second-degree crawl, no enrichment, no LinkedIn OAuth.

---

### Task 10: The UI foundation

Deliverable: every surface built so far is composed from ReUI, and the nav is one component.

Do this **before** the search UI — it is the vocabulary everything else is
written in, and retrofitting it costs more than starting in it.

**Files:**
- Create: `components.json`, `components/ui/*` (installed), `components/app-nav.tsx`, `lib/utils.ts`
- Modify: `app/layout.tsx`, `app/login/page.tsx`, `app/upload/page.tsx`

- [ ] **Step 1: Point the shadcn CLI at the ReUI registry**

The same configuration seams uses:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": { "config": "", "css": "app/globals.css", "baseColor": "neutral", "cssVariables": true, "prefix": "" },
  "iconLibrary": "lucide",
  "aliases": { "components": "@/components", "ui": "@/components/ui", "utils": "@/lib/utils", "lib": "@/lib", "hooks": "@/hooks" },
  "registries": { "@reui": "https://reui.io/r/{style}/{name}.json" }
}
```

- [ ] **Step 2: Install the primitives**

```bash
npx shadcn@latest add @reui/button @reui/input @reui/card @reui/avatar \
  @reui/badge @reui/tooltip @reui/skeleton @reui/alert @reui/separator
```

Read each one's real API with `get_component` before using it. ReUI is
shadcn-compatible but its variants are its own, and guessed props render
unstyled.

- [ ] **Step 3: Build the nav**

`components/app-nav.tsx` — the signed-in header: the cohort name, links to
Search and Add connections, and the signed-in member's avatar with a sign-out
item. One component, used by every app page through `app/layout.tsx`.

- [ ] **Step 4: Rebuild login and upload on it**

Replace the raw `<input>`, `<button>` and `<form>` markup in `app/login/page.tsx`
and `app/upload/page.tsx` with ReUI `Card`, `Input`, `Button` and `Alert`. The
upload result and its error become an `Alert`; the pending state uses the
button's own loading affordance rather than swapped text.

- [ ] **Step 5: Verify and commit**

Sign in and upload again — same behaviour, ReUI throughout. Then:

```bash
git add components.json components lib/utils.ts app
git commit -m "Build every surface on ReUI"
```

---

### Task 11: The landing page

Deliverable: `https://joineffall2026.com` says **Go get that money!** in New
Rocker, with the video playing underneath it.

**Files:**
- Create: `middleware.ts`, `app/landing/page.tsx`, `components/hero-video.tsx`, `public/go-get-that-money.mp4`
- Modify: `app/layout.tsx` (font), `fly.toml` (`APP_HOST`)

- [ ] **Step 1: Split the hostnames**

`middleware.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0];
  if (host === (process.env.APP_HOST ?? "localhost")) return NextResponse.next();
  return NextResponse.rewrite(new URL("/landing", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|go-get-that-money.mp4).*)"],
};
```

Add `APP_HOST = "connections.joineffall2026.com"` to `[env]` in `fly.toml`. The
default keeps `localhost` on the app in development, where `/landing` is reached
directly.

- [ ] **Step 2: Load the font**

`next/font/google` self-hosts it, so no `<link>` to Google and no render-blocking
request:

```ts
import { New_Rocker } from "next/font/google";

const newRocker = New_Rocker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-new-rocker",
});
```

Put `newRocker.variable` on `<html>` in `app/layout.tsx`, and bind
`--font-new-rocker` in `globals.css` so the landing page reaches it as a
Tailwind family. New Rocker is display-only — it is used on this page and
nowhere else.

- [ ] **Step 3: Add the video**

Copy `~/Downloads/f3125a48cd9581c456450d01fd9c57c22c8d3eca.MP4` to
`public/go-get-that-money.mp4`. It is 2.7 MB, 29 seconds, 960×720, H.264 with
AAC audio, and it is committed — the page shows it to the public anyway, so the
repository adds no exposure.

- [ ] **Step 4: Build the hero**

```tsx
"use client";

import { useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [silent, setSilent] = useState(true);

  // Every browser blocks autoplay with sound. It starts muted and the first
  // gesture turns it on.
  function unmute() {
    const el = video.current;
    if (!el) return;
    el.muted = false;
    void el.play();
    setSilent(false);
  }

  return (
    <div className="relative w-full max-w-3xl" onClick={unmute}>
      <video
        ref={video}
        src="/go-get-that-money.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="w-full rounded-xl"
      />
      {silent && (
        <Button
          onClick={unmute}
          className="absolute bottom-4 left-1/2 -translate-x-1/2"
        >
          <Volume2 /> Tap for sound
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Build the page**

`app/landing/page.tsx` — the headline at the largest size that still fits a
phone without wrapping mid-word, in New Rocker, with `HeroVideo` beneath it.
Nothing else on the page: no nav, no link to the app, no explanation.

- [ ] **Step 6: Verify on both hostnames**

```bash
fly deploy
curl -sS https://joineffall2026.com/ | grep -o "Go get that money!"
curl -sS -o /dev/null -w "%{http_code}\n" https://connections.joineffall2026.com/login
```

Expected: the headline from the root, `200` from the app host. Then open the
root in a browser and confirm the video plays and the sound turns on with one
tap.

- [ ] **Step 7: Commit**

```bash
git add middleware.ts app components public/go-get-that-money.mp4 fly.toml
git commit -m "Landing page on the root domain"
```
