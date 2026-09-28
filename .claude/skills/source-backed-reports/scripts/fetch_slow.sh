#!/bin/bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
LIST="$1"; OUT="$2"; DELAY="${3:-7}"; mkdir -p "$OUT"
i=0; n=$(wc -l < "$LIST"); fail=0
while read -r u; do
  i=$((i+1))
  key=$(echo "$u" | sed 's|https\?://||; s|/$||; s|[/?&=]|_|g' | cut -c1-120)
  [ -s "$OUT/$key.txt" ] && continue
  for try in 1 2 3; do
    "$B" goto "$u" >/dev/null 2>&1
    t=$("$B" text 2>/dev/null)
    if [ ${#t} -gt 3000 ]; then
      { echo "URL: $u"; echo "$t"; } > "$OUT/$key.txt"; break
    fi
    sleep $((DELAY * try * 3))
  done
  [ -s "$OUT/$key.txt" ] || { fail=$((fail+1)); echo "FAIL $u"; }
  sleep "$DELAY"
  [ $((i % 10)) -eq 0 ] && echo "  $i/$n (fail $fail)"
done < "$LIST"
echo "done $LIST -> $OUT ($(ls "$OUT" | wc -l) files, $fail failures)"
