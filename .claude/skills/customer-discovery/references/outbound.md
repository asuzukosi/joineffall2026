# Outbound for discovery

Cold email and LinkedIn that book discovery calls, run by agents on **Apollo**
(sequences, tracking, CRM) and **Google Drive** (the files). Works for any
problem being tested: the hypothesis sets who to reach and what to send; the
machinery below stays the same.

```text
hypothesis ─► segment ─► each person: value line ─► pick what to give ─► sequence (inactive, capped)
    ▲                         (no line, no send)                                   │
    └── log calls as evidence ◄── replies / clicks ◄── send ≤ cap ◄── human approves┘
                                        │
                     no click, no reply ─► remove, rest 90 days
```

## Value first, one person at a time

Every message starts from the person, never from the list. Before anyone is
enrolled, work out what is on their plate **right now** and what would be
genuinely useful to them this week — then give that, and ask the question
second.

Look for what they are dealing with now, each with a link:

- a job ad they are struggling to fill, a new site or service opening, a
  merger, a new boss
- an inspection report, audit, regulation or deadline coming at them
- something they posted, said in an interview, or complained about
- their numbers against their peers (published data)

Then write their **value line** and keep it on the contact (an Apollo custom
field), with the source:

```text
<name> is dealing with <thing on their plate now> (<source link>);
the most useful thing we can give them now is <specific thing>.
```

The useful thing is whatever serves that item, and often it is not a file: a
number they need for a board paper, a checklist for the inspection next month,
how two peers handled the same thing, a person worth meeting, or the one page
of an asset that answers their question. Email 1 leads with it.

**No value line, no send.** If nothing specific and current can be found,
research more or leave them out of today's batch — a generic email burns the
daily cap and the domain. Think about each person separately: two ops
managers in the same segment rarely have the same week.

## Before the first send

| Check | Pass |
|---|---|
| Sender | A Google Workspace inbox on the company domain. A named person (`kosi@`) gets more replies than `team@`; adding one is a new Workspace user (~£6/month), and `team@` is fine meanwhile. Never a personal Gmail: it risks the personal account and cannot carry domain records. |
| Domain records | `dig +short TXT <domain> @8.8.8.8` shows `v=spf1 include:_spf.google.com ~all`; `dig +short TXT _dmarc.<domain> @8.8.8.8` shows `v=DMARC1; p=none; …`; `google._domainkey` has a DKIM key. Query a public resolver: a local or sandboxed one can return wrong answers. Add missing records at the DNS host (`vercel dns add <domain> @ TXT "…"`) only after the user says yes. |
| Warm-up | On in Apollo (Settings → Email setup and health → Start warm up). It stays on for good. |
| Apollo plan | Adding contacts to a sequence through the API needs a master API key; lower plans return 403. Test with one contact before relying on it. |
| Law (UK) | PECR: companies can be emailed cold with the sender named and a one-line opt-out; sole traders and partnerships cannot. A limited company has a Companies House number; no number means leave them out. |

A second, lookalike sending domain is only worth it above ~50 emails a day or
when the main domain must be protected at any cost.

## The cap counts every email

The default cap is **50 sends a day per inbox**, and it counts **every email, follow-ups included**, not new people:

```text
new people a day ≈ cap ÷ email steps        50 ÷ 3 ≈ 16 new a day
```

Enforce it in two places, because either alone can be bypassed:

1. **Sequence:** `apollo_sequences_create` with top-level `max_emails_per_day`.
2. **Mailbox:** the inbox's daily limit in Apollo settings. No MCP tool sets
   this; tell the user to set it.

Ramp a cold inbox on real sends, not on waiting — sending can start the day warm-up is switched on: 10 a day for days 1–3, 20–30
for days 4–6, then up to the cap by day 10 — each step only if bounces stay
under 2% and spam complaints under 0.1%. Stop and cut volume the day either is
crossed. Send to Apollo-verified addresses only.

## The sequence

Create it **inactive**; the user reviews sender, schedule and copy, then it is
approved. Default shape:

| Day | Step | Content |
|---|---|---|
| 0 | email | Plain text with the asset as a Drive link, never an attachment; one question about their last time the problem happened |
| 1 | LinkedIn: view profile | Apollo makes a task; the agent does it in the browser (below) |
| 3 | email (same thread) | Follow-up with one new detail about them and the same question, no new link |
| 4 | LinkedIn: connect | Short note, no pitch |
| 7 | email (same thread) | Two-line bump; last email |

A link in the first email from a new inbox is the biggest spam risk in the
sequence. Keep it survivable: one link only, the bare `drive.google.com` URL
(never a shortener), no images, and a custom tracking domain in Apollo (a
`track.<domain>` CNAME) so tracked links are not rewritten to Apollo's shared
domain. Hold the ramp at 10 a day until the first 50 sends show no bounces or
spam placement.

LinkedIn steps and phone calls do not count toward the email cap. For
operators who answer phones (sites, clinics, trades), a call step on day 2
often books faster than more email. Calls and booked meetings are run with
`problem-interview.md` and `mom-test.md`.

## LinkedIn steps, done in the browser

Apollo only creates LinkedIn tasks; it never acts on LinkedIn. The agent does
each due task with `gstack-browse`, signed in with the user's own LinkedIn
cookies. LinkedIn bans automation and the risk is the user's personal profile,
so stop the moment LinkedIn pushes back. There is no daily cap of our own — LinkedIn's limits are the limit.

```sh
$B cookie-import-browser chrome --domain linkedin.com     # once, after the user agrees
```

For each LinkedIn task due today (`apollo_tasks_search`):

1. `$B goto <their linkedin url>`, then `$B snapshot -i` to find the button.
2. View: stay on the profile a few seconds. Connect: click Connect → Add a
   note → `fill` the note (lowercase, under 200 characters) → Send. Message:
   only to people already connected.
3. `apollo_tasks_complete` for that task.

| Limit | Value |
|---|---|
| Connection requests | no cap of our own; LinkedIn's limits decide |
| Profile views | no cap of our own; LinkedIn's limits decide |
| Pace | 30–120 s at random between actions, recipients' working hours, one run a day |
| Stop | any captcha, identity check, "unusual activity" or limit notice: stop every LinkedIn step, tell the user, do not retry |

Never collect profiles in bulk from LinkedIn; the prospect list comes from
Apollo.

## Writing the messages

**Every message is worth their time on its own, with the customer at the centre.** Each email, follow-up and LinkedIn note hands over the finding itself — what they are missing and what it means for them — and the link is where they go deeper. "page 4 has the warning signs" is a pointer, not value; say the warning sign. A message that only asks, bumps, checks in or points at a file is never sent.

Everything except the subject is **all lowercase** — body, sign-off, the opt-out line,
even "i" — so it reads like a person typed it between meetings. Plain text
only: no bold, bullets, images, logos or html signature.

| Message | Limit | Layout, in order |
|---|---|---|
| Subject | one line; front-load the stake (phones show ~40 characters) | proper casing; starts with a `[report name]` tag, then impact, outcome and a pull to open, about them, not you: `[Global CIO report] Your AI accountability is about to outpace your capacity, here's what happens next`. Never `quick question`, `following up`, `checking in` |
| Email 1 | 50–90 words, at most 3 short paragraphs | what is on their plate now (from the value line) · the useful thing, given straight away · the link on its own line when the useful thing is a file · one question about the last time the problem happened · first name |
| Email 2 | 30–60 words, same thread | one new useful thing, with its own link — the next finding, a page to read first, a peer example · first name |
| Email 3 | under 60 words, same thread | one last useful thing, with its own link; say it is the last · first name. Never a bump |
| LinkedIn connect note | under 200 characters | the useful thing, with its link — value first, never an empty "let's connect"; no pitch |
| LinkedIn message | under 60 words | same shape as email 1: the useful thing and its link first |
| Opt-out (every email) | one line | `not relevant? that's fine! send a "no" and i won't follow up` |

Short paragraphs of one or two lines, a blank line between them, one question
per message. Claim only what has happened: "most groups tell us…" before any
calls is invented proof — say what you saw about them instead.

Before creating or updating a sequence, check every step: the text equals its
lowercase form and sits inside its word limit; fix it rather than send it.
Apollo inserts `{{first_name}}` and `{{company}}` exactly as stored, usually
capitalised — for lowercase, write each contact's lowercase values into
custom fields (`apollo_contacts_update`) and merge those. Turn Apollo's
signature off (`include_signature: false`) and write the sign-off in the body.

## What to send: stage first, then the reader

**Stage decides what the asset says; the reader decides its format.** A
problem-stage CEO still gets a video — about their world and the problem, with
no product in it.

| Stage | Asset in email 1 |
|---|---|
| Problem — is it real? | The problem only, never the solution: what we are seeing in their sector, with sourced numbers. Showing *your* answer biases the call (see `mom-test.md`); how their peers handled it is not your answer and is fair to give. A one-page sector note is made with `source-backed-reports`. |
| Solution — does our answer fit? | The reader's default format below. |
| Commitment — will they act? | Made for that account alone; top accounts and warm replies only. |

**The reader's default format:**

| Reader | Signals | Default | Made with |
|---|---|---|---|
| Analytical: engineering, finance, quality, compliance, clinical leads, academics | Technical title; writes long posts or papers | Research paper / white paper, every number sourced | `customer-pamphlet` in paper style; `source-backed-reports` when it must hold up claim by claim |
| Hands-on operator: ops, site, shift and practice managers | Runs a place or a team day to day | Pamphlet, image-led | `customer-pamphlet` |
| Time-poor decider: CEO, founder, MD, owner | C-level, or owns a small company | 40–60 s video, or a one-pager | `customer-video` |
| Has to convince others: heads of department, programme leads, procurement | Mid-level in a large organisation | 8–12 slides they can present upward | `anthropic-skills:pptx` |

Personality beats title when there is evidence of it: a CEO who writes
detailed technical threads gets the paper. Read their LinkedIn posts, their
writing, and any call notes. With no signal, send the pamphlet.

**Files are reused; the message never is.** One asset per segment × reader,
uploaded once, and each email points to the part that answers that person's
value line (a page number, a section). When no existing asset serves their
value line, give the fact, checklist or intro directly instead. A
per-account asset costs real time and credits (a film is ~65 Higgsfield
credits), so it is earned by a reply or a top-10 account, never made for the
whole list.

## Files: upload and share with rclone

The Google Drive connector cannot do this job: binary files have to be inlined
into the call (a 25 MB film is ~8.5M tokens), and it can only share with a
named email, not "anyone with the link". Use `rclone`, signed in as the
**sending Workspace account** so the owner shown is the company, not a person's
Gmail:

```sh
rclone config create outbound drive scope=drive     # once; the user signs in in the browser
rclone copy videos/<name>/film.mp4 outbound:Outbound/<segment>/
rclone link outbound:Outbound/<segment>/film.mp4    # sets anyone-with-link viewer, prints the URL
```

Put the printed URL in email 1. Keep the Drive folder at or under
what is in play; delete a file's link when its segment is retired.

## Tracking and cycling

- Drive cannot say who viewed a file shared by link; the signal is the Apollo
  **click**. Clicks include corporate link scanners, so a reply or a booked
  call is the real result.
- After the last step plus 5 days with no click and no reply, remove the
  contact (`apollo_emailer_campaigns_remove_or_stop_contact_ids`) and leave
  them alone for 90 days. That keeps the list and the daily cap spent on
  people still in play.
- Log every call and reply as evidence against the hypothesis's kill line — a
  sample, a behaviour, a threshold and a date, e.g. `fewer than 5 of 15 calls
  name night agency cover as a top-3 cost, by <date>`. If the project has an
  idea maze, log it there with its CLI.

## What agents can and cannot do here

| Can (MCP) | Cannot — tell the user |
|---|---|
| Create sequences (inactive, capped), add and remove contacts, read messages, replies and clicks, create tasks | Turn on warm-up, set the mailbox daily limit, turn on link tracking — Apollo web app |
| Do LinkedIn tasks in the browser with `gstack-browse`, within the limits above | Import LinkedIn cookies without the user's yes |
| Upload and link files via `rclone` once configured | Run `rclone config` sign-in — the user does it once |
| Check domain records with `dig` | Change DNS without the user's yes |

## Rejected, and why

| Option | Why not |
|---|---|
| Papermark | Per-page read time is nice, but agent access needs the Business plan (€59/month) with a 1,000-document cap; overkill when clicks answer "did they open it". Reconsider for investor data rooms. |
| DocSend | No public API; its MCP reads activity but cannot upload or make links; links always on docsend.com. |
| Resend / transactional senders | Their terms ban cold email; accounts get suspended. Fine for app email. |
| Buying mailboxes in Apollo | 800 credits per Google mailbox — the credits are worth more as contact lookups. |
| Attachments | Spam filters punish them from new senders, and they cannot be tracked. |
