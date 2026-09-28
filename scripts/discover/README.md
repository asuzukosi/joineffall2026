# discover

Customer-discovery outbound for agents: find non-obvious people, read job changes and hiring
signals, rank by tier and speed, and draft a value-first email and LinkedIn note whose gift is a
pamphlet made for them. The agent writes; the script fetches, scores and checks. Nothing is sent.

`outbound/` is git-ignored: the repo is public and batches hold prospect data.

```text
new ─► find (exa | papers | jobs) / signal ─► enrich (Apollo) ─► rank ─► status
                                                                   │
            agent writes notes/<id>.json, builds the pamphlet      │
                                  │                                │
                                  ▼                                ▼
                  draft: checks ─► out/<id>/email.md, linkedin.md   seats that just opened
```

```sh
npm run discover -- new <slug> --industry "..." --offer "..."
npm run discover -- find <batch> --source exa --query "head of inspection at utilities"
npm run discover -- find <batch> --source jobs --board greenhouse:<token> --company "..." --query "inspection"
npm run discover -- enrich <batch> [--phones]
npm run discover -- rank <batch>
npm run discover -- status <batch>
npm run discover -- draft <batch>
```

First time on a machine: `npm run setup:discovery`. It installs or checks the tools, asks for each key and tests it, sets the sender and booking link, checks Apollo has a mailbox and Drive can share, and checks the skills are present.

Keys in `.env.local`: `EXA_API_KEY`, `APOLLO_API_KEY` (a master key), `OPENALEX_API_KEY`
(free; anonymous OpenAlex search is sometimes paused), optional `OPENALEX_MAILTO`.

The workflow is in `.claude/skills/customer-discovery-outbound/SKILL.md`; the message rules in
`.claude/skills/outreach-writing/SKILL.md`.
