---
name: kosi-voice
description: Use when writing anything that will go out under Kosi Asuzu's name or company — pamphlets, research briefs, video scripts, captions, emails, posts, READMEs, PR descriptions — or when asked to "write like me", "sound like me", "make it sound human", or to check output from the pamphlet or video tools. Pairs with avoid-ai-writing, which removes AI patterns; this skill says what to write instead.
---

# Kosi's voice

Taken from Kosi's essay "What I've worked on and what I'm working on now"
(kosiasuzu.com, June 2026). Write so a reader could believe Kosi typed it.

## How Kosi writes

- **Starts from what happened, then says what it means.** "I started my
  professional career building large-scale data pipelines… I was able to see how
  my work could drive policies and decisions that saved actual lives."
- **Names the specific thing.** Innovate UK, Birmingham City Council, ROS nodes,
  PCBs, a projected 10x return. Never "a leading organisation" or "various
  stakeholders".
- **Longer sentences that carry one line of thought**, joined with commas and
  "and", broken by a short plain one when the point lands. No em dashes; use a
  comma, a semicolon or a new sentence.
- **Takes the other side seriously before answering it.** "A lot of people have
  flagged this as a dead end… These are valid arguments and are true. The goal is
  not just…"
- **Each problem in the same order:** what it is, why it matters now, what it
  would unlock if solved.
- **Plain headings** that name the subject: "Runtime safety and security for AI
  agents". No clever titles, no colons with a twist.
- **Own opinions are marked as his:** "I believe", "I'm interested in". Facts
  are stated flatly, without "arguably" or "it's worth noting".
- **Few adjectives.** "Incredibly" appears at most once in a piece. No "robust",
  "seamless", "cutting-edge", "game-changing", "unlock" as filler, "delve",
  "landscape" used for anything that is not land.
- **British spelling** (organisation, learnt, prioritise).
- **Ends by saying what happens next**, not with a summary: "I'll share my
  findings and expand on them as I gather more context."

## For research pamphlets and briefs

- Written as "we" for the research ("we read every issue"), plain third person
  for findings. Never salesy; the reader should learn something even if they
  never reply.
- One idea per paragraph. The first sentence says the finding; the rest says
  how we know and why it matters to the reader.
- Field names and API terms only where the reader needs them to look something
  up, written as plain text, never styled as code. Prefer "the token's maximum
  amount" to `max_amount`.
- Numbers come with their source and their sample: "65 of 1,188 issues".

## For video scripts and captions

- Narration reads like someone explaining it to a colleague, one sentence per
  line, present tense, no rhetorical questions.
- Captions are facts: time, place, number. Never a slogan.

## Check before handing over

1. Run the `avoid-ai-writing` skill in detect mode on the text, then fix every
   real finding. Its detector is built into `npm run pamphlet -- build` and
   `npm run video -- check`; both stop on a medium or high finding.
2. Read it once against the list above. If a sentence could appear in any
   company's brochure, rewrite it with the specific thing.
