# pamphlet

Personalised research pamphlets for one customer: an A4 PDF in the customer's
own brand, full of generated images, with a contents page and links that jump
between pages. The agent writes the story as one HTML file per page; the scripts
copy the template, pull the customer's brand, and print the pages to one PDF.

`pamphlets/` and `topics/` are git-ignored: the repo is public.

Research and personalisation are separate steps, so outbound to many people
reuses one piece of research:

```text
ONCE PER TOPIC (hours)                         PER RECIPIENT (minutes)
──────────────────────                         ───────────────────────
topics/<topic>/                                pamphlets/<name>/
  research/   sources, fact sheets,              pamphlet.json  { "topic": "<topic>" }
              numbers.json, facts.json,          brand.css      their colours (brand <name> <url>)
              page generator                     pages/00-cover.html     their name, their logo
  images/     shared illustrations               pages/01-for-you.html   3 findings that touch them
  pages/      02-… research pages   ──┐          pages/99-back.html
                                      └──► build merges both by file name ──► pamphlet.pdf
                                           topic pages take the recipient’s brand.css
```

Contents page numbers (`.toc a` with an empty `<i>`) are filled in at build time,
so adding a personal page never breaks them. A page name that exists in both
the pamphlet and its topic stops the build.

## Commands

```sh
npm run pamphlet -- topic agent-spend-limits                       # once
npm run pamphlet -- new acme-jane --topic agent-spend-limits        # per recipient
npm run pamphlet -- brand acme-jane https://acme.com
npm run pamphlet -- build acme-jane
```

`new` refuses to run without `--topic`: every pamphlet builds on researched topic pages.

`build` first checks the prose on every page with the avoid-ai-writing
detector (`writing.ts`) and stops on any medium or high finding, naming the page.
Tables, source lines and anything between `<!-- data -->` and `<!-- /data -->`
count as data and are skipped. It then joins the pages into one document and prints it with Chrome, so text
stays selectable and links work: `href="#03-at-a-glance"` jumps to the page file
`03-at-a-glance.html`, and web links open in the browser. Any `.folio` element
gets the page number. A page whose content is taller than A4 fails the build and
is named in the output. Page-specific CSS goes in a `<style>` inside `<body>`;
only the first page's `<head>` is kept.

Chrome comes from `/Applications/Google Chrome.app`; set `CHROME_PATH` to use another.
`brand` needs the `dembrandt` CLI on PATH (`npm i -g dembrandt`).

## Page components (page.css)

One font, four sizes (22 / 11 / 9.5 / 7.5pt) and two weights; see the
`customer-pamphlet` skill for why. The components are deliberately few.

| Class | Use |
|---|---|
| `.page` `.dark` `.flush` | A4 page; dark cover colours; no padding for full-bleed |
| `.runhead` `.home` `.folio` | running head, link back to contents, page number (filled at build) |
| `.head` `.kicker` `.lede` | page opening: small label, 22pt title (`h2`), 11pt standfirst |
| `.cols2` `.cols` | two columns of running text; two blocks side by side |
| `.exhibit` `.title` `.source` | numbered exhibit with its title and source line |
| `.matrix` (`.compact`, `.dense`) | tables; `td.y` normal, `td.n` muted |
| `.stats` (`.four`) `.stat` | headline numbers with a short label |
| `.bars` `.bar` | horizontal bar chart (`<i style="--v: 60%">`) |
| `.steps` `.step` | numbered findings |
| `.checklist` `.check` | a question with a one-line answer under it |
| `.toc` `.part` | contents list; page numbers filled at build |
| `.stack` `.layer` `.arrow` | stacked box diagram |
| `.callout` `.quote` | left-rule callout and quotation |
| `.figure` `.fig-s` `.fig-m` `.fig-l` `.grow` `.caption` | images; `.grow` fills the rest of the page |
| `.cover` `.glow` `.hero` `.logo` `.for` `.button` | cover and back page |
| `.bleed` `.shade` `.bleed-text` | full-bleed part openers |
| `.note` `.muted` `.ref` | small print, muted text, links |

Wrap genuine reference lists in `<!-- data -->` … `<!-- /data -->` so the
writing check treats them as data.
