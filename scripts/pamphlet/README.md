# pamphlet

Personalised research pamphlets for one customer: an A4 PDF in the customer's
own brand, full of generated images, with a contents page and links that jump
between pages. The agent writes the story as one HTML file per page; the scripts
copy the template, pull the customer's brand, and print the pages to one PDF.

`pamphlets/` is git-ignored: the repo is public and pamphlets hold customer research.

```text
customer url ──► brand ──► brand/brand.json, logo.svg, output/<host>/DESIGN.md
                                │
                                ▼  agent sets tokens
   new ──► pamphlets/<name>/ ── brand.css ── page.css (shared components)
                  │
                  ├── pages/NN-*.html   one page per file, sorted by name
                  ├── images/           generated images
                  ▼
                build ──► pamphlet.pdf + previews/NN.png   (exit 2 on overflow)
```

## Commands

```sh
npm run pamphlet -- new acme-agent-security
npm run pamphlet -- brand acme-agent-security https://acme.com
npm run pamphlet -- build acme-agent-security
```

`build` joins the pages into one document and prints it with Chrome, so text
stays selectable and links work: `href="#03-at-a-glance"` jumps to the page file
`03-at-a-glance.html`, and web links open in the browser. Any `.folio` element
gets the page number. A page whose content is taller than A4 fails the build and
is named in the output. Page-specific CSS goes in a `<style>` inside `<body>`;
only the first page's `<head>` is kept.

Chrome comes from `/Applications/Google Chrome.app`; set `CHROME_PATH` to use another.
`brand` needs the `dembrandt` CLI on PATH (`npm i -g dembrandt`).

## Page components (page.css)

Everything is set in one font, `--font-body` (and `--font-display`, normally the same family).

| Class | Use |
|---|---|
| `.page` `.dark` `.tint` `.flush` | A4 page; cover colours; accent tint; no padding for full-bleed |
| `.cover` `.glow` `.hero` `.logo` `.button` | cover with accent glow or a generated hero image |
| `.contents` `.chapter` | clickable chapter cards with a thumbnail each |
| `.home` `.folio` | "← Contents" link and page number in the footer |
| `.bleed` `.shade` `.bleed-text` | full-page image with headline over it |
| `.figure` `.caption` `.grow` | rounded image block; `.grow` fills the rest of the page |
| `.hotspots` `.dot` `.legend` | numbered markers on an image (`style="--x: 20%; --y: 30%"`) |
| `.split` `.tag` | before/after pair of images |
| `.mosaic` | one large and two small images |
| `.stats` `.stat` `.big-number` | numbers as graphics |
| `.bars` `.bar` | bar chart (`<i style="--v: 60%">`) |
| `.stack` `.layer` `.hot` `.gap` `.arrow` | layered box diagram |
| `.checklist` `.check` `.score` | score-yourself quiz |
| `.callout` `.quote` `.steps` `.cols` | did-you-know card, pull quote, numbered plan, two columns |
| `.matrix` | comparison table; `td.y` highlights, `td.n` mutes |
| `.issues` `.issue` | linked list of cited issues or documents with a big number each |
| `.source` | clickable source under a number |
| `.code` | dark code block; `<b>` highlights, `<i>` dims |
