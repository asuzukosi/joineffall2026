# joineffall2026

Private network search for one EF cohort. Members upload their LinkedIn
connections export; anyone in the cohort can then search the combined result in
plain English and see who can make the introduction.

Live at **[connections.joineffall2026.com](https://connections.joineffall2026.com)**.

## What happens to your upload

You upload one file: `Connections.csv` from your own LinkedIn data export. It
contains names, titles, companies and profile links — **and nothing else**. The
export has no messages in it, and nothing about who you talk to or how often
ever leaves LinkedIn.

From that file the app keeps two things:

```text
  people                           knows
  ──────                           ─────
  the person's profile url         which member knows which person
  their name, title, company       the date you connected
```

The profile URL is the key, so the same person appearing in five members'
exports is one row, known by five people. That count is the whole product: it is
what tells you who can introduce you, and how many ways in you have.

**Your connections are visible to the rest of the cohort** — that is the point
of a shared bank, and everyone who uploads is in the same position. Nobody
outside the cohort can see any of it.

## Who can get in

Only the email addresses on the cohort roster. You ask for a sign-in link, it
arrives by email, and it works once, for fifteen minutes. There are no passwords
to steal and no sign-up form.

An address that is not on the roster gets the same reply as one that is, and no
email — so the roster cannot be read back out of the login page one guess at a
time.

## Where your data lives

Not in this repository. That is deliberate: the code is public so you can read
what it does with your upload, which only works if none of your data is in it.

| What | Where |
|---|---|
| The cohort roster | A Fly secret, `ROSTER_CSV` |
| The database, and everything uploaded | A Fly volume, `/data/app.db` |
| Member photos | A Cloudflare R2 bucket, served from `cdn.joineffall2026.com` |
| Every API key | Fly secrets |

`roster.csv`, `photos/`, `data/` and `.env*` are in `.gitignore` and always have
been. `roster.example.csv` shows the format with a made-up person in it.

## Removing yourself

Ask whoever runs the cohort's copy. Deleting a member's `knows` rows and then
any person nobody is left knowing takes one command, and it is the only thing
that has to happen — the roster entry and the upload are the whole footprint.

## How it works

```text
  /upload ──▶ parse ──▶ people + knows ──▶ embed each person ──▶ vectors
  /search ──▶ embed the question
              dot product over every vector, in memory
              top 300 ──▶ who can introduce you ──▶ a model picks ten
```

Retrieval is embedding similarity, not keyword matching, which is why "someone
who could help me raise a seed round" finds a VC whose profile never uses those
words.

## Running it

```bash
npm install
cp .env.example .env.local     # fill it in
npm run dev
npm test
```

You need a roster to sign in with: copy `roster.example.csv` to `roster.csv`,
put your own address in it, and set `ROSTER_CSV` to the file's contents.

## Deploying

One Fly machine in London with a volume, serving two hostnames. See
[docs/infrastructure.md](docs/infrastructure.md) for DNS, certificates, the
photo bucket, and the things that do **not** work for getting files onto the
volume.

```bash
fly deploy
./scripts/set-roster.sh        # publishes roster.csv as a secret
```
