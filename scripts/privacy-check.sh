#!/usr/bin/env bash
# Fails if anything personal has ever been committed. The repository is public,
# so the working tree being clean is not the question — history is.
set -uo pipefail

fail=0

if git log --all --format=%H -- roster.csv photos | grep -q .; then
  echo "FAIL: roster.csv or photos/ appear in history"
  fail=1
fi

# Fixture names invented for tests are expected; real cohort profiles are not.
allow='example|ade-okafor|neha|alexandre-berkovic|bodinestubb|zz-probe|ada-capital|bo-robot'

if git grep -nEi "linkedin\.com/in/[a-z0-9-]{4,}" "$(git rev-list --all)" -- . 2>/dev/null \
    | grep -vEi "$allow" | grep -v '\.md:' | grep -q .; then
  echo "FAIL: a profile url that is not a known fixture is in history"
  fail=1
fi

if git grep -nEi "[a-z0-9._%-]+@(gmail|outlook|icloud|proton|yahoo)\." "$(git rev-list --all)" -- . 2>/dev/null \
    | grep -v example | grep -q .; then
  echo "FAIL: a personal email address is in history"
  fail=1
fi

[ "$fail" -eq 0 ] && echo "clean: nothing personal has been committed"
exit "$fail"
