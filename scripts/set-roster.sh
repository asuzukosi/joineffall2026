#!/usr/bin/env bash
# Publishes the cohort roster to the app. Run from the directory holding
# roster.csv, which is not in this repository.
set -euo pipefail

APP="${FLY_APP:-joineffall2026}"
test -f roster.csv || { echo "roster.csv not found in $(pwd)" >&2; exit 1; }

fly secrets set ROSTER_CSV="$(cat roster.csv)" -a "$APP"
