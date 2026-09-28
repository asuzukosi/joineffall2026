#!/bin/bash
# fetch.sh <url-list-file> <out-dir>
B="$HOME/.claude/skills/gstack/browse/dist/browse"
LIST="$1"; OUT="$2"; mkdir -p "$OUT"
i=0; n=$(wc -l < "$LIST")
while read -r u; do
  i=$((i+1))
  key=$(echo "$u" | sed 's|https\?://||; s|/$||; s|[/?&=]|_|g' | cut -c1-120)
  [ -s "$OUT/$key.txt" ] && continue
  "$B" goto "$u" >/dev/null 2>&1
  { echo "URL: $u"; "$B" text 2>/dev/null; } > "$OUT/$key.txt"
  [ $((i % 20)) -eq 0 ] && echo "  $i/$n"
done < "$LIST"
echo "done $LIST -> $OUT ($(ls "$OUT" | wc -l | tr -d ' ') files)"
