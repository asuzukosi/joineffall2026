# Figures: yours, theirs, and making them fit

## Reproducing source charts

Harvest the publisher's own charts. They carry design work you cannot match and
they let a reader check your recomputation against the original.

**Get the in-page asset, not the `og:image`.** The `og:image` is usually a 16:9
social card cropped from the real chart — one arrived cut through the middle of
the plot. Harvest both and prefer the in-page one:

```javascript
og  = document.querySelector('meta[property="og:image"]').content
figs = [...document.querySelectorAll('img')]
         .filter(i => i.naturalWidth >= 800)
         .map(i => i.getAttribute('src'))
```

Detect cards by aspect ratio (`|w/h − 16/9| < 0.02`) and swap them for the
in-page asset where one exists. Filter out related-post thumbnails: they recur
with identical `alt` text across many pages.

## Credits that cannot be omitted

Generate one macro per figure from the parsed corpus metadata, then have the
figure command print it. A figure then physically cannot appear uncredited:

```latex
\newcommand{\srcfig}[4]{%
  \begin{figure}[htbp]\centering
  \includegraphics[width=#2, height=\srcfigmax, keepaspectratio]{#1.png}
  \caption{#3\par\vspace{2pt}{\scriptsize\color{inkMuted}%
    \textsc{reproduced from:} \srccredit{#1}}}
  \label{#4}\end{figure}}
```

Key the credit macros on the **literal slug**; hyphens are legal inside
`\csname...\endcsname`, so do not mangle them, or the lookup silently misses.

## Making a figure-dense document dense

Symptom: dozens of pages holding one chart in a sea of white.

| Cause | Fix |
|---|---|
| `\FloatBarrier` per section | Remove it; barriers force half-empty float pages |
| One width for every image | Set width from **measured aspect ratio** |
| No height limit | Cap height at ~`0.33\textheight` |
| Default float fractions | Let a page be almost all floats |

```latex
\renewcommand{\topfraction}{0.94}   \renewcommand{\bottomfraction}{0.94}
\renewcommand{\textfraction}{0.05}  \renewcommand{\floatpagefraction}{0.92}
\setcounter{totalnumber}{8}         \raggedbottom
```

Width by aspect ratio, so a 2:1 chart runs full width and a square one does not
eat a page:

```python
def width_for(ar):
    return ("0.96" if ar >= 2.0 else "0.92" if ar >= 1.7 else
            "0.82" if ar >= 1.45 else "0.72" if ar >= 1.2 else
            "0.62" if ar >= 1.0 else "0.52")
```

Measure the result; do not assume:

```python
pages = subprocess.run(['pdftotext','-layout','f.pdf','-'],
                       capture_output=True, text=True).stdout.split('\f')
low = [i for i, p in enumerate(pages, 1) if len(p.split()) < 100]
```

On one report this took 40 sparse pages to 1 and removed 36 pages.

## pgfplots traps

| Symptom | Cause and fix |
|---|---|
| `I do not know the key '/tikz/ymode'` | `ymode` cannot be set inside a style. Put `ymode=log` in the axis option list |
| `Undefined control sequence` at `\end{axis}` | `\foreach` does not expand into plot options. Use `\pgfplotsforeachungrouped`, or generate the `\addplot` lines |
| Literal `false` printed on every bar | `nodes near coords=false` renders the string. Delete the key |
| `Could not retrieve column 'a b'` | Column names must be alphanumeric plus `_`. Sanitise headers when writing `.dat` |
| Axis years shown as `2,024` | `xticklabel style={/pgf/number format/1000 sep={}}` |
| `Paragraph ended before \@lbibitem` | `plainnat` with entries lacking `author`. Give every entry one, even institutional |
| `\citet` prints `(author?)` | Same cause |
| Bibliography overfull by 100pt+ | Long URLs. `\usepackage{xurl}`, `hyphens` on `url`, `breaklinks` on `hyperref`, and drop `howpublished` where an `eprint` exists |
