#!/usr/bin/env bash
# Set up everything the customer-discovery workflow needs. Safe to re-run: done steps are skipped.
set -uo pipefail
cd "$(dirname "$0")/../.."

ENV_FILE=.env.local
FAILED=0
SKILLS="customer-discovery-outbound outreach-writing customer-discovery customer-pamphlet customer-video idea-maze source-backed-reports kosi-voice avoid-ai-writing"

ok() { printf '  ✓ %s\n' "$1"; }
bad() { printf '  ✗ %s\n' "$1"; FAILED=1; }
step() { printf '\n%s\n' "$1"; }
env_get() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-; }

ask() {
  local name=$1 label=$2 link=$3 secret=${4:-} value
  [ -n "$(env_get "$name")" ] && return
  printf '  %s\n' "$label"
  [ -n "$link" ] && printf '  get it at: %s\n' "$link"
  printf '  %s (enter to skip): ' "$name"
  if [ -n "$secret" ]; then read -rs value; echo; else read -r value; fi
  [ -z "$value" ] && return
  [ -s "$ENV_FILE" ] && [ "$(tail -c1 "$ENV_FILE")" != "" ] && echo >> "$ENV_FILE"
  printf '%s=%s\n' "$name" "$value" >> "$ENV_FILE"
}

check_tools() {
  step "1. tools"
  local major; major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
  if [ "$major" -ge 22 ]; then ok "node $(node -v)"; else bad "node 22 or newer — install from https://nodejs.org (or: nvm install 22)"; return; fi
  [ -d node_modules ] || npm ci --silent
  [ -d node_modules ] && ok "npm packages" || bad "npm packages — run: npm ci"
  command -v dembrandt >/dev/null || npm install -g dembrandt --silent
  command -v dembrandt >/dev/null && ok "dembrandt (reads a prospect's brand)" || bad "dembrandt — run: npm install -g dembrandt"
  for tool in rclone ffmpeg; do
    command -v "$tool" >/dev/null || { command -v brew >/dev/null && brew install "$tool" >/dev/null; }
    command -v "$tool" >/dev/null && ok "$tool" || bad "$tool — install it (macOS: brew install $tool)"
  done
  if [ -n "${CHROME_PATH:-}" ] || [ -d "/Applications/Google Chrome.app" ]; then ok "Google Chrome (prints pamphlets)"
  else bad "Google Chrome — install it, or set CHROME_PATH to another Chrome"; fi
}

check_keys() {
  step "2. api keys (saved to $ENV_FILE, which git ignores)"
  ask APOLLO_API_KEY "Apollo master API key (Settings → Integrations → API → tick 'master key')" "https://app.apollo.io/#/settings/integrations/api" secret
  ask EXA_API_KEY "Exa API key (people search)" "https://dashboard.exa.ai/api-keys" secret
  ask OPENALEX_API_KEY "OpenAlex API key (optional: finds people through their papers)" "https://openalex.org/rest-api" secret
  local apollo exa openalex
  apollo=$(curl -s -H "x-api-key: $(env_get APOLLO_API_KEY)" https://api.apollo.io/v1/auth/health)
  [[ $apollo == *'"is_logged_in":true'* ]] && ok "Apollo key works" || bad "Apollo key rejected — check it is a master key"
  exa=$(curl -s -X POST https://api.exa.ai/search -H "x-api-key: $(env_get EXA_API_KEY)" -H "content-type: application/json" \
    -d '{"query":"head of operations","category":"people","numResults":1}')
  [[ $exa == *'"results"'* ]] && ok "Exa key works (one search, about \$0.007)" || bad "Exa key rejected"
  if [ -n "$(env_get OPENALEX_API_KEY)" ]; then
    openalex=$(curl -s "https://api.openalex.org/works?search=test&per-page=1&api_key=$(env_get OPENALEX_API_KEY)")
    [[ $openalex == *'"results"'* ]] && ok "OpenAlex key works" || bad "OpenAlex key rejected"
  else ok "OpenAlex skipped (only needed for --source papers)"; fi
}

check_sender() {
  step "3. sender (every new batch starts with these)"
  ask DISCOVER_SENDER_NAME "Your first name, as you sign emails" ""
  ask DISCOVER_SENDER_COMPANY "Your company name" ""
  ask DISCOVER_BOOKING_LINK "Your 20-minute booking page (Google Calendar → Create → Appointment schedule → Share)" "https://calendar.google.com"
  local link code=none; link=$(env_get DISCOVER_BOOKING_LINK)
  [ -n "$link" ] && code=$(curl -s -o /dev/null -L -w '%{http_code}' "$link")
  [ "$code" = 200 ] && ok "booking link opens without signing in" || bad "booking link did not open (HTTP $code)"
  [ -n "$(env_get DISCOVER_SENDER_NAME)" ] && ok "sender: $(env_get DISCOVER_SENDER_NAME), $(env_get DISCOVER_SENDER_COMPANY)" || bad "sender name missing"
}

check_mailbox() {
  step "4. sending mailbox (Apollo)"
  local accounts; accounts=$(curl -s -H "x-api-key: $(env_get APOLLO_API_KEY)" https://api.apollo.io/api/v1/email_accounts)
  local email; email=$(printf '%s' "$accounts" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const a=(JSON.parse(d).email_accounts||[]).find(x=>x.active&&x.default);console.log(a?a.email:"")}catch{console.log("")}})')
  if [ -n "$email" ]; then ok "Apollo sends from $email — check warm-up is on and the daily limit is 10 in Apollo's mailbox settings"
  else bad "no active mailbox in Apollo — Settings → Mailboxes → Link mailbox → Gmail, using a named inbox on your company domain (not a personal Gmail)"; fi
}

check_drive() {
  step "5. google drive (gifts go out as links)"
  if ! rclone listremotes 2>/dev/null | grep -q '^outbound:$'; then
    echo "  a browser window opens: sign in with the company Google account the gifts should come from"
    rclone config create outbound drive scope=drive >/dev/null 2>&1
  fi
  local probe; probe=$(mktemp); echo "setup check" > "$probe"
  rclone copyto "$probe" outbound:discover-setup-check.txt 2>/dev/null
  local link; link=$(rclone link outbound:discover-setup-check.txt 2>/dev/null)
  local code; code=$(curl -s -o /dev/null -L -w '%{http_code}' "$link")
  rclone deletefile outbound:discover-setup-check.txt 2>/dev/null; rm -f "$probe"
  [ "$code" = 200 ] && ok "Drive uploads and 'anyone with the link' shares work" \
    || bad "Drive share link did not open — allow sharing outside your organisation in Google Admin (Apps → Drive → Sharing)"
}

check_skills() {
  step "6. agent skills"
  local missing=""
  for skill in $SKILLS; do [ -f ".claude/skills/$skill/SKILL.md" ] || missing="$missing $skill"; done
  [ -z "$missing" ] && ok "workflow skills are in .claude/skills (Claude Code loads them in this repo)" || bad "missing skills:$missing"
  [ -d "$HOME/.claude/skills/gstack-browse" ] && ok "gstack-browse (LinkedIn steps in the browser)" \
    || bad "gstack-browse — install gstack (github.com/garrytan/gstack) for the LinkedIn steps"
}

accounts() {
  step "accounts to have (sign up if you have not)"
  echo "  Apollo       https://app.apollo.io          contacts, sequences, sending"
  echo "  Exa          https://dashboard.exa.ai       people search"
  echo "  Google Workspace on your company domain     sending inbox, Drive, booking page"
  echo "  Higgsfield   https://higgsfield.ai          images and films for gifts (connect it in Claude)"
  echo "  LinkedIn     your own profile               connect notes, sent by the agent"
}

accounts
check_tools
check_keys
check_sender
check_mailbox
check_drive
check_skills
step "done"
if [ "$FAILED" = 0 ]; then echo "  everything is set up. start with: npm run discover -- new <slug> --industry \"...\" --offer \"...\""
else echo "  fix the ✗ lines above, then run npm run setup:discovery again"; exit 1; fi
