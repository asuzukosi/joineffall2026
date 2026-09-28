---
name: customer-pamphlet
description: Use when making research pamphlets, white papers or field guides to send to prospects, researching a topic once in depth and then personalising it cheaply for each recipient in their brand. Trigger phrases include "pamphlet", "white paper for <company>", "leave-behind", "research paper for a customer", "personalised PDF", "make them a report like this one", "send this to a list", "personalise it for each prospect".
---

# Customer pamphlet

A 15 to 25 page A4 research brief a reader would keep even if they never buy
anything. It follows one story, is written in Kosi's voice, is laid out like a
professional white paper, and every figure links to its source. The sender
appears only as a byline and a corrections address.

Tool: `scripts/pamphlet` (README lists every
component). **Reference for "good":** topic `agent-spend-limits`, recipient
`stripe-agent-payments` (25 pages). When unsure how a page should look or read,
open that PDF and match it.

## Do not regress: feedback already given

Each rule below was a correction from Kosi. Breaking any of them means the
pamphlet goes back. Check all of them before handing over.

| # | Rule | What went wrong before |
|---|---|---|
| 1 | **Research first, with `source-backed-reports`.** Download whole sources, count, quote verbatim. | Early drafts read three doc pages and were "too light on context". |
| 2 | **Information, not a pitch.** No product pitch, pilot plan or testimonial inside the brief. The back page always ends with the 20-minute booking link (https://calendar.app.google/JWd2cyMtkWQ6kzMx8, the same one outbound uses), as a button plus the printed URL. | A draft with a "how our product plugs in" page and a pilot plan read as salesy. |
| 3 | **Research once per topic, personalise per recipient.** Never redo deep research for a new recipient. | Research and personalisation were one step, which does not scale to outbound. |
| 4 | **One story through the whole piece.** Pick one illustrative case (e.g. an agent booking a trip with a $400 limit), open every part by returning to it, and give each profile a "what happens to the case" section. | Pages of separate facts "read robotic and didn't tell a compelling story". |
| 5 | **Kosi's voice** (`kosi-voice`), checked with `avoid-ai-writing`. No em dashes, no slogan titles, no bold lead-ins, no colon-into-three lists. | Text was full of em dashes and AI sentence shapes. |
| 6 | **One font, four sizes, two weights.** 22pt titles and headline numbers, 11pt standfirst, 9.5pt everything you read, 7.5pt everything around it. Regular and SemiBold only. | Mixed sizes, Light headings, uppercase spaced labels and violet numbers "looked overwhelming and unprofessional". |
| 7 | **No code styling.** Write "the token's maximum amount"; use an exact field name only where the reader must look it up, as plain text. | Tinted monospace field names made a learning document look like API docs. |
| 8 | **A report layout, not a slide deck.** Running head, kicker, title, standfirst, a numbered exhibit with its source, two columns of 300 to 550 words. | Early pages were one paragraph beside a half-page stock photo. |
| 9 | **Images support the text.** Full-bleed on the cover and part openers; elsewhere one figure that fills the remaining space. No page ends with an empty bottom quarter. | Image-card contents, hotspot dots and big photos crowded out the content, then later pages were left half empty. |
| 10 | **No video in a pamphlet.** Films are the separate `customer-video` system. | An early version embedded a video page. |
| 11 | **Review every page at full size** in sheets of four, and check `pdffonts` shows one family. | Thumbnail reviews missed broken layouts and a stray system font. |
| 12 | **Balance evidence and images.** Charts drawn from the data (`research/visuals.py`), our own diagrams and highlighted source screenshots (`research/shots.mjs`) carry the argument. Generated images appear here and there: always a full-bleed image on the cover, and one to fill the space on four or five sparse pages. No people-heavy stock scenes. | First too many glossy AI photos made it look generated; then removing them all left it bare. |
| 13 | **A real author.** Kosi's byline and version on the cover, a short "why I looked into this" built only from things Kosi has published, a closing note, and PDF metadata naming Kosi (`author` in `pamphlet.json`). Never invent Kosi's views; flag drafts for Kosi to edit. | An authorless document read as machine output. |
| 14 | **Open with a real incident** quoted from the sources, with the illustrative case second. Quote named builders by handle. | A made-up example alone felt generated. |
| 15 | **Vary the rhythm.** Mix pull-quote pages, full-width diagrams and chart pages; no two profile pages share a title shape or section headings. | Identical page templates were a tell. |
| 16 | **No customer logo on the cover.** "Prepared for X" in text. | A Stripe logo could read as imitating Stripe. |
| 17 | **Dense pages, no padding.** Content fills each page: two or three columns of text, a figure with `.grow` for the rest. No checkbox lists, no one-line rows spread down the page. `build` stops on any inside page that leaves more than about 29 mm empty at the bottom. | Loose checkbox rows and half-empty pages "looked like AI slop". |
| 18 | **Every number must be something the reader would act on.** No counts of issues, comments, commits, repos or pages read; no activity or engagement charts; no commit hashes in source lines. Describe the method in two lines of small print (the appendix intro), never as a page of stats. For builder activity, report what they propose and what it would mean for the reader's product. | Issue counts, comment bars and "read at a fixed commit" stats were effort metrics, irrelevant to a Stripe engineer. |

The tool enforces what it can: the template has only the four sizes and no
code styling, `new` refuses to start without a topic, and `build` stops on an
overflowing page or any medium or high `avoid-ai-writing` finding. The rest is
on you.

## A. Topic: once, reused for every recipient

```sh
npm run pamphlet -- topic <topic>
```

1. **Frame it for a kind of reader, not one company**, and write the value
   sentence at the top of `research/notes.md`: "[this kind of reader] learns
   [something about their own area they did not know]".
2. **Choose the story case** (rule 4) before writing any page.
3. **Research with `source-backed-reports`.** Enumerate instead of searching:
   docs sitemaps, every issue in the relevant repos (`gh api --paginate`), spec
   files at a pinned commit. Reproduce one published number exactly before
   trusting a download. Save everything under `topics/<topic>/research/`.
4. **Fan out fact sheets in parallel**, one background agent per source area.
   Every line carries a verbatim quote of 30 words or fewer, `path:line` and a
   URL, checked by script. Ask each agent for non-obvious details and for places
   where two sources disagree.
5. **Label by hand**, keep labels in a CSV, and have an agent review them.
6. **Numbers and quotes live in files:** `analyze.py` writes `numbers.json`;
   `facts.py` checks every quote the pages use and stops on a mismatch.
7. **Generate pages from those files** (`research/p_*.py`, `build_topic.py`)
   into `topics/<topic>/pages/`, named from `02-`. `00`, `01` and `99` belong
   to the recipient.

What earns a page: a disagreement between the reader's own sources; a buried
default, limit or timeout; a comparison table nobody has drawn; what builders
ask for, counted; a correction to your own first assumption. Put the method and what it cannot tell you in the appendix intro as small print, and list the
underlying records there, marked `<!-- data -->`.

Default structure, about 22 topic pages: contents, the short version (seven
findings told through the story case), how we did this, then three parts each
with a full-bleed opener, then six questions under "what we would look at
next", then the appendix.

### Images (Higgsfield), once per topic

Preflight with `get_cost: true` and tell the user the cost. `gpt_image_2_5`,
quality `medium`, one `generate_image_batch` of up to 12, one style line with
the brand palette at the end of every prompt, plus "no text, no logos, no
watermarks". Never a real person's face, a fake product screenshot or another
company's logo. Covers and openers `3:4`, figures `16:9`, saved as JPEG in
`topics/<topic>/images/`.

## B. Recipient: minutes, no new research

```sh
npm run pamphlet -- new <name> --topic <topic>
npm run pamphlet -- brand <name> https://their-site.com
```

1. `brand.css`: their accent, darkest surface and font, or Inter. Their logo on
   the cover, in white for a dark cover.
2. `00-cover.html`: "Prepared for [team or person] · [month]", the topic title,
   and one sentence that sets up the story case.
3. `01-for-you.html`: three findings from the topic that touch their product,
   each linking to its page, chosen from ten minutes on their site.
4. `99-back.html`: about the author, a corrections line, and the button "Book 20 minutes with Kosi" linking to https://calendar.app.google/JWd2cyMtkWQ6kzMx8 with the URL printed below it. The template already has it; never replace it with an email address. Keep "not affiliated with or endorsed by".
5. `npm run pamphlet -- build <name>`, then review against the table above.

6. After the PDF is reviewed, run `npm run pamphlet -- clean <name>`. It deletes
   previews, copied images and the brand scrape, keeping `pamphlet.pdf` and the
   pages needed to rebuild. Topic images stay, since every recipient reuses them.

Hand over the PDF path, page count, credits spent and anything unverified. Do
not publish or upload it anywhere unless asked.
