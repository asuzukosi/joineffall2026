# video

A short film made for one customer: recurring characters in the customer's
world, the moment their problem bites, the same place with it solved, and the
result — narrated, captioned, in their brand, under two minutes. The agent
writes `storyboard.json` and makes the footage with Higgsfield; the scripts
check the storyboard, render title cards and captions in the customer's fonts,
and stitch picture and sound into `film.mp4`.

`videos/` is git-ignored: the repo is public and films hold customer research.

```text
customer url ──► brand ──► brand/output/<host>/DESIGN.md, logo.svg ──► brand.css (agent sets tokens)
                                                              │
   new ──► videos/<name>/storyboard.json ──► check ──► script.md (read before spending)
                 │  value, cast, scenes         card.html ──► title, caption and end cards (Chrome)
                 ▼                                              │
           cast/<id>.png   (one portrait per character)         │
           stills/, clips/ (Higgsfield: still with cast refs,   │
                            then animate from the still)        │
           audio/<scene>   (one narration line per scene)       │
                 └──────────────► build ◄───────────────────────┘
                                    │  trim voice silence, re-check timing, cut each scene to its
                                    │  seconds (slow short clips up to 1.35x), captions, fades,
                                    │  narration on its scene, optional music, loudness to -16 LUFS
                                    ▼
                  film.mp4 + film.srt + previews/<scene>-{a,m,z}.png
```

## Commands

```sh
npm run video -- new acme-monday
npm run video -- brand acme-monday https://acme.com
npm run video -- check acme-monday     # before spending credits
npm run video -- script acme-monday    # script.md: cast, timings, picture, camera, voice, captions
npm run video -- build acme-monday
```

`check` fails (exit 2) when `value` is unfilled, a scene is outside 2–12 seconds,
a caption is over 14 words, a scene names an unknown character, narration will
not fit its scene (estimated at 2 words a second), or the film is over two
minutes. `build` first trims silence from each voice line, then checks real
lengths: a missing or undecodable clip, a clip under 60% of its scene, or a
voice line that overruns — each message says how many seconds the scene needs.
An ffmpeg failure names the scene it happened in.

## storyboard.json

| Field | Meaning |
|---|---|
| `customer` | their name, shown in cards |
| `value` | one sentence: who at the customer watches this and what they see change |
| `characters[]` | `id`, `name`, `role`, `look` (the same words in every prompt), `ref` portrait |
| `music` | optional licensed track, looped quietly under the narration, faded at the end |
| `scenes[].seconds` | exact length; short clips slow down (max 1.35x) then hold, long ones are cut |
| `scenes[].cast` | character ids on screen, for the script and the prompts |
| `scenes[].narration` / `voice` | the spoken line and its audio file; starts 0.25s into the scene |
| `scenes[].card` | `title` or `end` — a full-frame card with `kicker`, `title`, `text` |
| `scenes[].clip` | path to the scene's footage, with optional `caption` on top |
| `scenes[].still_prompt` / `motion_prompt` | what the agent asked Higgsfield for, kept for reruns |

Output is 1920×1080 at 30fps. Chrome comes from `/Applications/Google Chrome.app`
(`CHROME_PATH` to override); `ffmpeg` and `dembrandt` must be on PATH.
