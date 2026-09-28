---
name: outreach-writing
description: Use when drafting a first message to a prospect — cold email, LinkedIn note, or a discover note — so it is value-first (seen, gift, why me, ask), grounded in recorded signals, and gives them something useful before asking for 20 minutes.
---

# Value-first outreach

A first message passes three tests:

1. **They feel seen.** It names a problem they likely have right now, from a real signal.
2. **They get value before we ask for anything.** The gift arrives in this message.
3. **They know what the call is about.** The ask names the topic.

## Before and after

Pitch-first — fails all three:

> Hey Kosi, saw you just joined EF, I'm a psychiatric clinician specializing in founder mental health, I've helped X amount of founders go through the tough founding process, are you open to a 20 minute conversation?

Value-first:

> Hey Kosi, co-founder breakups getting to you? And I'm sure customer discovery and its demands are getting very tough. I created a guide for founders in the very early stages that helps them introspect and manage these challenges better, here's the link. I want you to win and I think this would really give you a leg up. I've been working with founders going through this — feel free to book a 20 minute conversation if you'd like to talk face to face about these.

## The four parts

| Part | Rule |
|---|---|
| `seen` | Their likely problem now. A question unless the signal states it outright. Cite signal ids in `evidence`. |
| `gift` | What they get today and why it helps. No ask here. |
| `why_me` | One line of credibility, after the gift. |
| `ask` | Last. 20 minutes, naming what you will cover — about them, not one slice of their business ("how it applies to you", not "to your sites"). Easy to say no to. `draft` puts the booking link on the line after it — do not paste it yourself. |

`seen` and `gift` can swap: lead with the gift when it stands on its own.

## From signal to "seen"

| Signal | Seen, as a question |
|---|---|
| joined, from Acme | "First quarter at Beta — is the <problem> you had at Acme showing up here too?" |
| role change | "New seat, same building — is <problem> yours now?" |
| left | "Now that you're out of Acme, is <problem> still something you think about?" |
| hiring, reports to them | "Hiring a <role> while <problem> is still on your plate?" |
| competitor news | "Did <competitor>'s <move> change the timeline on your side?" |
| deadline | "<Deadline> is <n> weeks out — is <problem> on the list before then?" |
| paper or talk | "Your <paper/talk> on <topic> stopped at <point> — did <next step> happen?" |

## Choosing the gift

1. Write `todo_guess`: the one item most likely on their list this quarter, from their role, signals and `brief.roles[].todo_guesses`. Specific: "pick between two vendors before the October budget freeze", not "improve operations".
2. Pick the one research task that removes or shortens that item: what peers did, what it cost, what failed, who supplies what.
3. Pick the gift type that fits the job, not the one that is easiest to make:

   | Gift | When it fits | Make it with | In the note |
   |---|---|---|---|
   | Pamphlet | A research question with several parts: what peers did, costs, suppliers | **customer-pamphlet** | `"pamphlet": "<name>"` |
   | Film | The problem is easier shown than read | **customer-video** — a made-up character in their role, never their own face or likeness | `"file": "film.mp4"` |
   | Slide deck | They have to take the case to a boss or board | the gcr slides pipeline or the **pptx** skill | `"file": "deck.pptx"` |
   | Spreadsheet | They are comparing vendors, prices, sites or options | the **xlsx** skill | `"file": "comparison.xlsx"` |
   | Checklist or template | They are about to run a process for the first time | the **pdf** or **docx** skill | `"file": "checklist.pdf"` |
   | One-page brief | One sharp finding is enough (often mice) | the **pdf** skill | `"file": "brief.pdf"` |
   | Dashboard or public page | The question is ongoing, or a page already answers it | an existing page | `"link": "https://…"` |

   Files go in `out/<id>/`. Pamphlets are the usual choice; use another type when it removes their to-do faster. Mice and rabbits with the same to-do can share one gift.
4. **Every gift reaches them as a Google Drive link, never an attachment.** Upload the file to the sender's Drive, share it as "anyone with the link can view", and put the link in `gift.link` (keep `pamphlet` or `file` too, so we know what was shared). A link opens in the browser with nothing to download, which feels safer than a file from a stranger and lands in the inbox more often. If you cannot upload as the sender, list the files for the human and leave `link` empty — `draft` refuses the note until it is filled.
5. The gift text says what is inside and where to look first, so they know what the link is before they click. `draft` puts the link on the line after it, and the LinkedIn note must include it too.

Quality bar: would they forward it to a colleague if it came from someone they already trust?

## The subject line

The subject earns the open. It names the **impact** on them, the **outcome** at stake, and pulls them into the email — never a greeting, a status update or our name.

Shape: *[report name]* + *what is about to happen to them* + *why they should open now*. The bracket tag names the gift as a publication made for their world. Subjects use proper casing; only the body is lowercase.

- "[Global CIO report] Your AI accountability is about to outpace your capacity, here's what happens next"
- "[Utility inspection brief] Your first quarter at Beta is when the backlog decides your year, here's how peers got ahead"
- "[<Sector> readiness report] The <deadline> lands in 6 weeks, here's what the teams who are ready did"

Build it from the same signal as `seen`, so the subject and the first line tell one story. Front-load the stake: phones show about the first 40 characters. `draft` rejects a subject without the `[tag]`, and empty subjects ("quick question", "following up", "checking in", "intro…", "hi…").

## Lowercase

`draft` writes the body, sign-off and LinkedIn note in lowercase (the subject and the person's name keep proper casing), even "i", so it reads like a person typed it; links keep their case. Write normally — the lowercasing is done for you. It also adds the opt-out line under the sign-off: `not relevant? that's fine! send a "no" and i won't follow up`. Anyone who replies "no" is never contacted again.

## Never open with

"I'm a…", "I've helped…", "Are you open to…", "Quick call", "Hope this finds you well". `draft` rejects them.

## Length

Every email, every tier: at most 90 words and 3 short paragraphs. `draft` lays them out as (1) seen, (2) the gift and its link, (3) why me and the ask together, with the booking link — or gift first when you lead with it. LinkedIn connect note: 200 characters (LinkedIn's limit on free accounts), the seen question and the gift link — value first, always.

## Note format

```json
{
  "todo_guess": "…",
  "subject": "Names the gift, not us",
  "seen":   {"text": "…", "evidence": ["<signal id>"]},
  "gift":   {"text": "…", "pamphlet": "<pamphlets/ folder name>", "link": "https://drive.google.com/…"},
  "why_me": "…",
  "ask":    "…",
  "order":  ["seen", "gift", "why_me", "ask"],
  "linkedin": "…"
}
```
