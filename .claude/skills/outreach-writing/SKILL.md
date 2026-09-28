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
| `ask` | Last. 20 minutes, naming what you will cover. Easy to say no to. |

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
3. Make it with the **customer-pamphlet** skill, then set `"gift": {"text": "…", "pamphlet": "<name>"}`.
4. Sometimes a short film says it better: make it with the **customer-video** skill — a made-up character in their role living the problem, in their brand. Never their own face, name or likeness. Save it as `out/<id>/film.mp4` and set `"file": "film.mp4"`.
5. When a public page already answers their question, use `"link"` and say what to look at first.

Quality bar: would they forward it to a colleague if it came from someone they already trust?

## Never open with

"I'm a…", "I've helped…", "Are you open to…", "Quick call", "Hope this finds you well". `draft` rejects them.

## Length

Mouse and rabbit: 90 words across the four parts. Deer: 120. Elephant and whale: 150. LinkedIn note: 300 characters, the seen question and the gift only.

## Note format

```json
{
  "todo_guess": "…",
  "subject": "Names the gift, not us",
  "seen":   {"text": "…", "evidence": ["<signal id>"]},
  "gift":   {"text": "…", "pamphlet": "<pamphlets/ folder name>"},
  "why_me": "…",
  "ask":    "…",
  "order":  ["seen", "gift", "why_me", "ask"],
  "linkedin": "…"
}
```
