---
name: customer-video
description: Use when making a short personalised film for one specific customer or prospect — recurring characters in their world, their problem, the same place with it solved — narrated, in their brand, with Higgsfield footage. Trigger phrases include "video for <company>", "personalised video", "make them a film", "show them we thought about them", "30-second video for a prospect", "customer video", "story with characters".
---

# Customer video

A 40–60 second narrated film made for one customer. It works when they
recognise their own world in the first scene, follow one person through the
problem, and see the same person and place with it solved. The tool lives in
`scripts/video` (its README lists every
storyboard field). Output goes to `videos/<name>/`, which is git-ignored.

```text
value ─► new ─► brand ─► storyboard ─► check ─► script ─► cast ─► stills ─► look ─► animate + voice ─► build ─► look ─► fix
```

This is a separate system from `customer-pamphlet`; they share only the brand step.
A worked example: `videos/calms-night-shift/` (53s, about 65 credits).

## 1. Value first

Finish this sentence and put it in `storyboard.json` `value`: "**[who at the
customer]** watches this and sees **[their own day with the problem gone]**."
If you cannot name the person and the change, research more — their site,
news, the user's call notes and decks (`gstack-browse` for the web). Every
number a line quotes needs a source in `notes.md`, or it is a story detail
that claims nothing.

## 2. Folder and brand

```sh
npm run video -- new <name>
npm run video -- brand <name> https://customer.com
```

Edit `brand.css` from `brand/DESIGN.md`. If the customer's site cannot be
found, use the sender's brand and say so — cards are redrawn on every build, so
re-branding later costs nothing. The end card carries the sender's contact,
never words put in the customer's mouth.

## 3. Story and cast

Write `characters` first: one or two fictional people who carry the problem
(the customer's customer is often the best lead). Give each a `look` of
concrete details — age, hair, clothes, one distinctive object — and reuse those
exact words in every prompt. Never a real person, a real face, or a named
employee of the customer.

Default arc, 6–8 scenes, one line of narration each:

| Beat | Scene | Narration does |
|---|---|---|
| Open | `title` card, 4s | the promise, "Made for <customer>" |
| Meet | clip, 7–8s | who, where, when — caption with time and place |
| Problem | clip, 7s | the moment it bites, in their product's words |
| Cost | clip, 8s | what it takes to deal with it |
| Consequence | clip, 8s | who inherits the mess — second character |
| Turn | clip, 7s | same place and person, problem handled |
| Result | clip, 6s | the person's time back; the loop closed |
| Ask | `end` card, 5s | "Book 20 minutes with Kosi" and the booking URL https://calendar.app.google/JWd2cyMtkWQ6kzMx8 as the card text |

Write narration and captions in Kosi's voice (`kosi-voice`); `check` runs the
`avoid-ai-writing` detector over every line and stops on a medium or high
finding. Avoid punchline closers ("The loop is closed."). End on what changed.

Narration rules — measured, not guessed:

- **About 2 words a second** with Higgsfield voices; 12–14 words fills an
  8-second scene.
- **One sentence per line.** Full stops make the voice pause about a second;
  "CALMS flags everything. A door held open." came back 8.6s, the same words
  joined with commas 5.9s.
- Captions carry what the voice does not: time, place, the changed number.

Run `npm run video -- check <name>` and `npm run video -- script <name>`;
read `script.md` as the viewer would before spending anything.

## 4. Footage (Higgsfield)

Preflight every model with `get_cost: true` and tell the user the total first.
Cheapest adequate set found so far: stills `gpt_image_2_5` (quality `medium`,
0.25 credits), clips `kling3_0` (`mode: std`, `sound: off`, 6s = 9 credits),
voice `seed_audio` (0.4 credits a line). `seedance_2_5` looks similar but costs
35 credits for 5s.

1. **Cast portraits.** One `generate_image_batch`, `3:4`, waist-up, neutral
   background. Save to `cast/<id>.png`, **Read them**, keep the job ids.
2. **Stills.** One batch, `16:9`, each with its characters' portrait job ids as
   `medias` role `image_references`, prompt saying "the man from the reference
   image (same face, …look…)". End every prompt with one shared style line and
   "no text, no logos, no watermarks, no readable words on screens". Save to
   `stills/`, make a contact sheet, **Read it**; regenerate any still where a
   face or outfit drifted.
3. **Clips.** One `generate_video_batch`, each with its still's job id as
   `start_image`, duration equal to the scene or at most 1.35x shorter (the
   build slows short clips). Slow camera moves only. If a request comes back
   `submission_failed` with a preset recommendation, resubmit with
   `declined_preset_id`.
4. **Voice.** `generate_audio` per line with one `voice_id` from `list_voices`.
   Voice jobs rate-limit at about two at a time — submit two, wait, continue.
   Save to `audio/<scene>.wav` and set `voice` on the scene.
5. There is no general music model on Higgsfield; add `music` only when the
   user supplies a licensed track.

Download everything with `curl` into the folder; `jobs_wait` gives the URLs.

## 5. Build and look

```sh
npm run video -- build <name>
```

`build` trims each voice line, then fails with the exact seconds any scene
needs — set them and rebuild. Then **Read the first, middle and last preview of
every scene** (a contact sheet of `previews/*-{a,m,z}.png` is fastest) and fix:

- faces, outfits or rooms that change within or between scenes → redo the still, then the clip
- the end of a clip warping (walls change, objects appear) → note it, or regenerate that clip
- title text that is small or leaves one word on its last line → adjust `card.html`
- a caption over a face → shorten it or drop it for that scene

After reviewing the previews, run `npm run video -- clean <name>` to delete
stills, clips, audio, cast portraits and build files (a film run leaves about
150 MB); `film.mp4`, `film.srt`, `script.md` and `storyboard.json` are kept.

Hand over the path to `film.mp4`, `film.srt` and `script.md`, the length, and
the credits spent. Do not upload or publish it anywhere unless asked.
