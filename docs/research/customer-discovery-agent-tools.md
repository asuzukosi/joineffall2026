# Agent-callable tools for customer discovery outreach

> question: Which tools can an agent call to (1) find non-obvious people to talk to, (2) send Apollo and LinkedIn messages and get phone numbers, (3) run personalised outbound batches that lead with a research PDF or dashboard, and (4) generate those artifacts automatically?
> researched: 2026-09-28, from official docs, pricing pages, terms and first-party READMEs. Prices are as published on that date and change often.

## summary

Every part of the pipeline except LinkedIn messaging has an official, agent-callable API: Exa or Parallel for people discovery, free public APIs (OpenAlex, job boards, Companies House, SEC, grants) for second-order leads, Apollo for enrichment, phones and email sequences (it already ships an MCP server), and Typst or LaTeX plus Cloudflare R2/Workers for per-prospect artifacts. LinkedIn only offers a messaging API to approved partners and requires a human to send each message ([LinkedIn Messages API](https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/messages)); every tool that automates LinkedIn DMs (Unipile, HeyReach, lemlist) does so by driving your logged-in account, which LinkedIn's User Agreement prohibits and punishes with account restriction ([User Agreement 8.2](https://www.linkedin.com/legal/user-agreement), [LinkedIn Help](https://www.linkedin.com/help/linkedin/answer/a1341387)). The honest setup is: automate research, email and artifact generation; have the agent draft LinkedIn notes and a human paste and send them. Two things changed recently and matter for tool choice: Proxycurl shut down in July 2025 after being sued by LinkedIn ([Nubela](https://nubela.co/blog/goodbye-proxycurl/)), and Perplexity's Sonar API retired on 2026-09-27 in favour of its Agent API ([Perplexity](https://docs.perplexity.ai/docs/agent-api/migrate-from-sonar)).

## findings

### 1. Finding people: web and people search APIs

| Tool | What it does for this job | Agent access | Price for API use | Limits |
|---|---|---|---|---|
| **Exa** | Neural web search with a `people` and `company` category; people index of 1B+ public profiles launched 2025-12-19 ([Exa changelog](https://exa.ai/docs/changelog/people-search-launch)). Categories: company, publication, news, personal site, financial report, people ([Exa search ref](https://exa.ai/docs/reference/search)). | REST (`x-api-key` or Bearer), hosted MCP at `https://mcp.exa.ai/mcp`, keyless for light use ([Exa MCP](https://exa.ai/docs/reference/exa-mcp)) | $10 free credits/month; search $7/1k; contents $1/1k pages; email enrichment $0.02, phone $0.07 ([Exa pricing](https://exa.ai/pricing)) | Unpublished; retry on 429 ([Exa search ref](https://exa.ai/docs/reference/search)). `people`/`company` do not support date or `excludeDomains` filters. |
| **Exa Websets** | Give a natural-language query plus criteria ("ML researchers who co-authored with X and now work at a robotics startup"); it finds, verifies each item against criteria, then enriches (email, phone, text) ([Websets guide](https://exa.ai/docs/websets/api-guide)). Webhooks on new items. | REST + webhooks | Needs a paid plan; free plan caps a webset at 25 verified results ([Websets guide](https://exa.ai/docs/websets/api-guide)) | Target count not guaranteed; 1,000+ items are slow. |
| **Parallel FindAll** | Natural language in, structured list of entities (companies or people) out, with a reason and citation per matched criterion; pays enrichment only on matches ([FindAll quickstart](https://docs.parallel.ai/findall-api/findall-quickstart)) | REST (`x-api-key`); Search MCP free at `search.parallel.ai/mcp`, Task MCP at `task-mcp.parallel.ai/mcp` ([Parallel MCP](https://docs.parallel.ai/integrations/mcp/getting-started)) | Fixed $0.10–$10 per run plus $0–$1 per match; up to 5,000 free requests/month and signup credit ([Parallel pricing](https://parallel.ai/pricing)) | FindAll 25 runs/hour; Task 2,000/min; Search 600/min ([Parallel pricing](https://parallel.ai/pricing)) |
| **Parallel Task API** | One deep-research call per prospect: "find this person's recent talks, papers, and what their team is hiring for", returns JSON with citations | same | $5–$2,400 per 1k depending on processor ([Parallel pricing](https://parallel.ai/pricing)) | as above |
| **Tavily** | Search + extract + crawl + research endpoints | REST; remote MCP `mcp.tavily.com/mcp` ([Tavily MCP](https://docs.tavily.com/documentation/mcp)) | 1,000 free credits/month; search 1–2 credits; $0.008→$0.005/credit ([Tavily credits](https://docs.tavily.com/documentation/api-credits)) | Dev key 100 RPM, production 1,000 RPM (needs paid plan or PAYGO) ([Tavily limits](https://docs.tavily.com/documentation/rate-limits)) |
| **Perplexity** | Search API returns raw results; Agent API does grounded multi-step research. **Sonar ended 2026-09-27**; sonar-deep-research maps to the `high` preset ([migration](https://docs.perplexity.ai/docs/agent-api/migrate-from-sonar)) | REST | Search API $5/1k (fast $1/1k); Agent API per-token plus $0.0025 per web search ([Perplexity pricing](https://docs.perplexity.ai/getting-started/pricing)) | Tier 0: Agent API 1 QPS; Search 50 units/s ([rate limits](https://docs.perplexity.ai/guides/rate-limits-usage-tiers)) |
| **Brave Search API** | Independent 30B-page index; good for `site:` style queries | REST (`X-Subscription-Token`) | $5/1k with $5 free monthly credit; 50 QPS ([Brave API](https://brave.com/search/api/)) | Storing results (for example to train a model) needs a plan with storage rights ([Brave API](https://brave.com/search/api/)) |
| **Serper** | Google results, plus Scholar and Patents endpoints | REST | 2,500 free queries ([Serper](https://serper.dev/)); from $0.30/1k per search-engine listing (pricing page returned 404 during research, so tiers unverified) | Unverified |
| **SerpApi** | Google and other engines | REST | Free 250/month; Developer $75/5,000; "U.S. Legal Shield" from Production $150 ([SerpApi pricing](https://serpapi.com/pricing)) | Plan-based |
| **Firecrawl** | Scrape/crawl/search to clean markdown or JSON; good for conference speaker pages and team pages | REST; MCP `mcp.firecrawl.dev/v2/mcp`, keyless tier ([Firecrawl MCP](https://docs.firecrawl.dev/mcp-server)) | Free 1,000 credits; Hobby $16/mo (annual) 5,000 credits; 1 credit/page, search 2 credits/10 results ([Firecrawl pricing](https://www.firecrawl.dev/pricing)) | Free 2 concurrent; Hobby 5 |
| **Jina Reader** | `r.jina.ai/<url>` returns clean text for any page or PDF; `s.jina.ai` search | HTTP GET, no SDK needed | 10M free tokens per key; token-billed ([Jina Reader](https://jina.ai/reader/)) | No key 20 RPM; free key 500 RPM ([Jina Reader](https://jina.ai/reader/)) |

**Google X-ray searches (`site:linkedin.com/in "title" "company"`).** Google's own Custom Search JSON API is closed to new customers and ends 2027-01-01 ([Google](https://developers.google.com/custom-search/v1/overview)); Bing Search APIs were retired 2025-08-11 ([Microsoft](https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement)). So X-ray now means a SERP reseller (Serper, SerpApi) or Brave. Reading the search-result snippet is not scraping LinkedIn; fetching the LinkedIn profile pages is, and LinkedIn's crawling terms say automated crawling "without the express permission of LinkedIn is strictly prohibited" ([LinkedIn crawling terms](https://www.linkedin.com/legal/crawling-terms)). In practice Exa's `people` category replaces most X-ray use without touching LinkedIn yourself.

### 2. Second-order sources (where the non-obvious people are)

These are mostly free, official, and low ToS risk. The pattern: pull a structured record that names a person in context, then enrich only that person.

| Source | Who it surfaces | API | Auth / cost | Limits |
|---|---|---|---|---|
| **Greenhouse job boards** | Team names, what a team is building, sometimes "reports to" text in the description | `GET boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true` | No auth for GET ([Greenhouse](https://docs.greenhouse.io/job-board.html)) | Not documented |
| **Lever postings** | Same, with team, department, salary | `GET api.lever.co/v0/postings/{site}` | No auth for GET ([Lever](https://github.com/lever/postings-api)) | 2 POST/s documented; GET unspecified |
| **Ashby job boards** | Same, with compensation | `GET api.ashbyhq.com/posting-api/job-board/{name}` | None mentioned ([Ashby](https://developers.ashbyhq.com/docs/public-job-posting-api)) | Not documented |
| **Apollo job postings** | Postings for one org (title, URL, posted date, location); **no hiring manager** field ([Apollo](https://docs.apollo.io/reference/organization-jobs-postings)) | `GET /organizations/{id}/job_postings` | 1 credit/page | Plan limits |
| **TheirStack** | Job postings across 225M+ records, technographics | REST + webhooks | From $49/mo for 1,500 API credits ([TheirStack](https://theirstack.com/en/pricing)) | 500 results/page |
| **OpenAlex** | Authors, affiliations, co-authors (via works' authorships) | REST | Free key gives $1/day of usage, 10x the no-key budget; >100 req/s gets 429 ([OpenAlex auth](https://help.openalex.org/api-reference/authentication)). Conflicting sources: the auth page says basic queries work with no key, while OpenAlex's help pages (search result) say a key is required from 2026-02-13 ([blog](https://blog.openalex.org/openalex-api-new-features-and-usage-based-pricing/)); get the free key either way | Daily budget |
| **Semantic Scholar** | 79M authors, papers, co-author lists ([S2](https://www.semanticscholar.org/product/api)) | REST, optional key | Free; introductory key 1 RPS | Shared unauthenticated pool |
| **arXiv** | Preprint authors (metadata CC0) | Atom API | Free | 1 request every 3 s, single connection ([arXiv ToU](https://info.arxiv.org/help/api/tou.html)) |
| **Crossref** | Journal authors | REST | Free; add `mailto` for the polite pool (10 req/interval, 3 concurrent) ([Crossref](https://www.crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication/)) | |
| **ORCID** | Researcher employment history | Public API, OAuth client credentials ([ORCID](https://info.orcid.org/documentation/features/public-api/)) | Free for non-members | Not stated on page |
| **NSF Awards** | PI name **and PI email** (`piEmail`) on funded projects ([NSF](https://resources.research.gov/common/webapi/awardapisearch-v1.htm)) | REST | No auth mentioned | 3,000 results/search |
| **NIH RePORTER** | Principal investigators and organisations on grants | REST | Free | ~1 request/s ([NIH](https://api.reporter.nih.gov/)) |
| **Patents: PatentsView / USPTO ODP** | Inventors and assignees (who actually built the thing) | REST, API key | Free; 45 req/min per key; PatentsView is migrating into USPTO's Open Data Portal from 2026-03-20 with interruptions (per [USPTO ODP](https://data.uspto.gov/support/transition-guide/patentsview) search result; page body not retrievable) | Inconclusive during migration |
| **Google Patents (BigQuery)** | Same, global | SQL | BigQuery billing (marketplace page failed to load; unverified) | |
| **Conference speakers: Sessionize** | Speakers and talks for events that use Sessionize | Public JSON endpoints, no auth, organiser enables them ([Sessionize](https://sessionize.com/playbook/api)) | Free | Per-event |
| **Other speaker pages** | Any event site | Firecrawl / Jina Reader | as above | |
| **GitHub** | Maintainers and contributors of relevant repos, their orgs | REST / GraphQL | PAT 5,000 req/h; unauthenticated 60/h ([GitHub](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)) | Secondary limits |
| **SEC EDGAR** | Officers and directors in filings (10-K, DEF 14A, Form 4) | `data.sec.gov` JSON | Free; declare User-Agent; 10 req/s ([SEC](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data)) | |
| **UK Companies House** | Officers: name, role, appointment date, occupation, nationality, month/year of birth ([officers](https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference/officers/list)) | REST, API key | Free; 600 req / 5 min ([CH](https://developer.company-information.service.gov.uk/developer-guidelines)) | |
| **SAM.gov opportunities** | Contracting officer name, email, phone on each solicitation ([SAM](https://open.gsa.gov/api/get-opportunities-public-api/)) | REST, public API key | Free; daily limits vary by role (numbers not stated) | 1,000 records/request |
| **USAspending** | Who won which federal contracts | REST | No auth ([USAspending](https://api.usaspending.gov/docs/endpoints)) | Not documented |

Second-order moves an agent can script with these, all without LinkedIn:
- **Co-author walk:** known expert → OpenAlex/Semantic Scholar works → co-authors now at companies (affiliation field) → Exa `people` search to confirm current role.
- **Job-post reporting line:** Greenhouse/Lever/Ashby description says "reporting to the Head of Perception" → Exa `people` query "Head of Perception at {company}" → Apollo match for email.
- **Patent inventors:** assignee = target company → inventors → current role via Exa.
- **Grant PIs:** NSF returns the PI's email directly, so no enrichment needed.
- **Buyers in government:** SAM.gov gives the contracting officer's email and phone on the notice itself.

### 3. Enrichment and phone numbers

| Tool | Agent access | Phones? | Cost | Notes |
|---|---|---|---|---|
| **Apollo** | REST + official MCP at `mcp.apollo.io/mcp` (OAuth; headless needs master key via `X-Api-Key`) with 50+ actions incl. search, enrich, sequences, send ([Apollo MCP](https://docs.apollo.io/docs/apollo-mcp)) | Yes, async | People search is **0 credits** but returns no email/phone; 50,000-record cap ([search](https://docs.apollo.io/reference/people-api-search)). Enrichment: 1 credit for email/demographics, **+8 credits if a mobile is returned**, 0 if nothing found ([enrichment](https://docs.apollo.io/reference/people-enrichment)) | `reveal_phone_number` **requires a `webhook_url`**; the phone arrives later at the webhook, or set `poll_only=true` and poll ([enrichment](https://docs.apollo.io/reference/people-enrichment)). Personal emails are not revealed for GDPR-region people. API on all plans; free plan needs a work-email signup ([rate limits](https://docs.apollo.io/reference/rate-limits)). Free plan 50/min, 200/h, 600/day; enrichment up to 1,000/min on Basic+ ([rate limits](https://docs.apollo.io/reference/rate-limits)). Plan prices: pricing table did not render in fetch; unverified. |
| **Clay** | Webhook in, HTTP API out; both **Growth plan ($446/mo) and up**; full Clay API Enterprise only ([Clay pricing](https://www.clay.com/pricing)) | Yes (Launch+) | Free: 100 data credits, 500 actions; Launch $167/mo ([Clay pricing](https://www.clay.com/pricing)) | Claygent (web-research agent) on all plans. Useful as a waterfall UI, weak as an agent backend below Growth. |
| **People Data Labs** | REST | Yes (fields depend on plan) | Free 10 search credits/month; Pro 1,000/month; charged per match ([PDL help](https://support.peopledatalabs.com/hc/en-us/articles/25794271805211-Pricing-credits)) | Pricing page did not render; per-credit price unverified. |
| **Hunter** | REST | No | Free 50 credits; Starter £41/mo 2,000 credits; 1 credit per found email, 0.5 per verification ([Hunter](https://hunter.io/pricing)) | Good email finder + verifier for domains you found yourself. |
| **Prospeo** | REST (Enrich Person, Mobile Finder) | Yes | 1 credit/email, 10 credits/mobile (email free with mobile), no charge if not found; add-on 1,000 credits $10 ([Prospeo mobile](https://prospeo.io/api/mobile-finder), [credits](https://help.prospeo.io/en/article/how-prospeo-credits-work-yso5gk/)) | |
| **FullEnrich** | REST + MCP | Yes, waterfall over 25+ sources | 50 free credits; Pro $55/1,000 credits; work email 1, **mobile 10**; pay only if found ([FullEnrich](https://fullenrich.com/pricing)) | Best phone hit-rate per dollar is plausible but not independently verified. |
| **Lusha** | REST | Yes | 1 credit/request + 1 email + **5 phone**; free 40 credits/month (per [Lusha docs](https://docs.lusha.com/user-guide/getting-started/how-credits-work-in-lusha) search summary) | |
| **ContactOut** | REST, **Enterprise only** ([ContactOut](https://contactout.com/pricing)) | Yes | Sales call | Not practical for a small team. |
| **RocketReach** | REST on any plan; custom API packages from $6K ([RocketReach FAQ](https://docs.rocketreach.co/reference/faq)) | Yes | 1 lookup credit per profile with verified data | |
| **Findymail** | REST | Yes (not for EU contacts) | $49/mo 1,000 finder credits; phone 10 credits ([Findymail](https://www.findymail.com/pricing/)) | |
| **Coresignal** | REST | Contact Enrichment API on request | 7-day trial, 2,000 credits; from $49/mo ([Coresignal docs](https://docs.coresignal.com/introduction/pricing-and-subscriptions)) | Data is largely scraped professional profiles; ToS exposure sits with the vendor but LinkedIn has sued similar vendors. |
| **Proxycurl** | — | — | **Shut down 2025-07-04** after LinkedIn's January 2025 lawsuit ([Nubela](https://nubela.co/blog/goodbye-proxycurl/)) | Do not build on LinkedIn-scraping APIs. |
| **Exa / Websets** | see above | Yes | $0.07 per phone, $0.02 per email ([Exa pricing](https://exa.ai/pricing)) | Cheapest per-phone list price found. |

Phone numbers in practice cost about $0.07 (Exa), ~$0.10 (Prospeo add-on credits), ~$0.55 (FullEnrich Pro), or 8 Apollo credits. Apollo's is the only one already wired into a sequencer, but its async webhook means your script needs a small public endpoint or a poll loop.

### 4. Sending

**Email**

| Tool | Agent access | Plan for API | Notes |
|---|---|---|---|
| **Apollo sequences** | `POST /emailer_campaigns/{id}/add_contact_ids`, **master API key only**, needs `send_email_from_email_account_id` of an active connected mailbox; only existing contacts, not raw search results; 0 credits ([Apollo](https://docs.apollo.io/reference/add-contacts-to-sequence)). MCP also exposes create sequence, add contacts, send-now, tasks. | Any plan with sequences | Flow: search (0 credits) → enrich → create contact → add to sequence. Personalised first lines go in contact custom fields used by the template. |
| **Gmail API** | `messages.send` 100 units, `drafts.create` 10 units; 6,000 units/min/user ([Gmail quota](https://developers.google.com/workspace/gmail/api/reference/quota)) | Free with Workspace | Workspace caps 2,000 messages/day and 2,000 unique external recipients/day per user; trial 500 ([Workspace limits](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace)). Creating **drafts** for a human to review and send is the lowest-risk start. |
| **Instantly** | API v2 on Growth+; webhooks need Hypergrowth+ ([Instantly help](https://help.instantly.ai/en/articles/10432807-api-v2)) | Growth $47/mo ([Instantly pricing](https://instantly.ai/pricing)) | Unlimited mailboxes and warmup on all plans. |
| **Smartlead** | API and webhooks, "varies by tier" | Base $39/mo ([Smartlead](https://www.smartlead.ai/pricing)) | Unlimited mailboxes. |
| **lemlist** | API on all plans; LinkedIn steps only on Multichannel $87–109/user ([lemlist](https://www.lemlist.com/pricing)) | Email $55–69/mo | |

**LinkedIn**

- **Official API:** the Messages API is "restricted to approved partners", each message must follow a specific member action, "Member actions do not include an automated or scheduled event", and the member must see an editable draft and actively send it ([LinkedIn Messages API](https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/messages)). No self-serve app gets this.
- **Unofficial APIs:** Unipile connects your account by username/password or your `li_at` session cookie, through proxies ([Unipile LinkedIn](https://developer.unipile.com/docs/linkedin)); €49/mo for up to 10 accounts ([Unipile pricing](https://www.unipile.com/pricing-api/)). It advises roughly 80–100 invitations/day, ~200/week, ~100 messages/day, and to "space all calls randomly... to emulate human behavior and avoid detection" ([Unipile limits](https://developer.unipile.com/docs/provider-limits-and-restrictions)). HeyReach ($79/sender/mo, API, webhooks, MCP) ([HeyReach](https://www.heyreach.io/pricing)) and lemlist Multichannel work the same way from the account's side.
- **What LinkedIn says:** members may not "use bots or other unauthorized automated methods to access the Services, add or download contacts, send or redirect messages" ([User Agreement 8.2](https://www.linkedin.com/legal/user-agreement)); users of such tools "risk having their accounts restricted or shut down" ([LinkedIn Help](https://www.linkedin.com/help/linkedin/answer/a1341387)).

**Verdict on LinkedIn automation:** it is a direct breach of the User Agreement, not a grey area, and the vendor's own advice to randomise timing "to avoid detection" says as much. The risk falls on the founder's personal account, which for customer discovery is the most valuable account you have. Recommended: the agent finds the person, writes the connection note and the follow-up, and puts them in a queue; a human opens the profile and sends. At 20–30 a day that takes ~15 minutes and keeps the account safe. Email carries the automated volume.

**Apollo LinkedIn steps** appear as tasks for a human to complete; the Apollo MCP exposes `tasks_create`/`tasks_complete`, which fits the "agent drafts, human sends" model.

### 5. Deliverability and law for agent-sent cold email

- **Authentication:** Gmail requires SPF or DKIM for all senders and spam rate under 0.3% (aim for under 0.1%); senders of 5,000+/day to Gmail also need DMARC with From-domain alignment and one-click unsubscribe (`List-Unsubscribe` + `List-Unsubscribe-Post`) ([Google](https://support.google.com/a/answer/81126)). Yahoo: bulk senders need SPF and DKIM, DMARC `p=none` or stronger, one-click unsubscribe, honour unsubscribes within 2 days ([Yahoo](https://senders.yahooinc.com/best-practices/)). Customer-discovery volume sits far under the bulk threshold, but set all three records anyway.
- **Separate sending domain:** send cold email from a second domain (for example `try-<brand>.com`) with its own Workspace mailbox so a reputation hit does not land on the product domain. This is common practice rather than a rule in the Google/Yahoo pages; Instantly and Smartlead build their plans around many such mailboxes.
- **Volume:** Workspace hard cap is 2,000/day per user ([Workspace limits](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace)); for new cold mailboxes stay at tens per day.
- **US (CAN-SPAM):** applies to B2B with no exception; accurate headers, non-deceptive subject, a physical postal address, a clear opt-out honoured within 10 business days; up to $53,088 per violating email ([FTC](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)).
- **UK (PECR):** you may email a corporate body (company, LLP, government body) without consent; sole traders and partnerships count as individuals and need consent; always identify yourself and give an opt-out address ([ICO PECR](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/)). Named work emails are still personal data under UK GDPR.
- **UK GDPR legitimate interests:** pass and write down the purpose / necessity / balancing test ([ICO LI](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/)). Because the data comes from other sources, privacy information must be given at the latest in the first message ([ICO right to be informed](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/)): one line saying where you got their address and a link to a privacy note covers it.

### 6. Artifact generation and per-prospect links

| Need | Tool | Why | Source |
|---|---|---|---|
| Research PDF (LaTeX) | **Tectonic** | Single binary, fetches TeX packages on demand, XeTeX-compatible; easy to run in CI or a container | [tectonic README](https://github.com/tectonic-typesetting/tectonic) |
| | **latexmk** 4.88 | Reruns LaTeX/BibTeX until references settle; standard in TeX Live | [CTAN](https://ctan.org/pkg/latexmk) |
| Research PDF (faster) | **Typst** | Incremental compile; loads `json`, `csv`, `yaml` directly; `typst compile --input key=value` fills `sys.inputs`, so one template + one JSON per prospect | [Typst README](https://github.com/typst/typst), [data loading](https://typst.app/docs/reference/data-loading/), [sys](https://typst.app/docs/reference/foundations/sys/) |
| Interactive dashboard | **Observable Framework** | Static site; data loaders precompute data at build time; ISC | [README](https://github.com/observablehq/framework) |
| | **Evidence** | Markdown + SQL to static site; MIT | [README](https://github.com/evidence-dev/evidence) |
| | **Streamlit** | Python app, needs a running server; Community Cloud is free | [Streamlit](https://docs.streamlit.io/deploy/streamlit-community-cloud) |
| Slides | **Slidev** | Markdown → PDF, PPTX (incl. editable), PNG, SPA; needs Playwright | [Slidev export](https://sli.dev/guide/exporting) |
| | **Marp CLI** | Markdown → HTML/PDF/PPTX; needs Chrome/Edge/Firefox; MIT | [marp-cli](https://github.com/marp-team/marp-cli) |
| | **reveal.js** | HTML decks, PDF export; MIT | [reveal.js](https://github.com/hakimel/reveal.js) |
| | **python-pptx** | Build native .pptx from data without Office; MIT | [python-pptx](https://github.com/scanny/python-pptx) |
| Hosting + open tracking | **Cloudflare R2 + a Worker** | R2: 10 GB free, free egress ([R2 pricing](https://developers.cloudflare.com/r2/pricing/)). Worker at `/r/<prospect-token>` logs the hit then serves the PDF/dashboard; 100k requests/day free, static assets free ([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)) | |
| | **Vercel** | Works, but Hobby is "non-commercial personal use only"; outreach for a company needs Pro ([Vercel fair use](https://vercel.com/docs/limits/fair-use-guidelines)) | |

The reference dashboard, humanoids.fyi, is a static JavaScript single-page app (WebGL, JSON-LD dataset metadata) served from Vercel (`server: Vercel` header, checked with curl on 2026-09-28). It is one shared industry page, not per-prospect. A cheaper equivalent: one shared market dashboard per segment, plus a per-prospect 2–4 page Typst PDF that cites the prospect's own paper, job post or patent and links to the dashboard. A unique URL per prospect (`/r/<token>`) gives a real "opened the artifact" signal, which is more reliable than email pixel tracking.

### 7. Agentic outbound products, what to copy

- **Clay / Claygent:** a table where each column is a lookup or an LLM web-research step, with waterfall enrichment across vendors ([Clay pricing](https://www.clay.com/pricing)). Copy the "one row per person, one column per fact, with a source" layout.
- **Apollo AI / MCP:** search, enrich, sequence and send from one chat, OAuth-scoped to the user ([Apollo MCP](https://docs.apollo.io/docs/apollo-mcp)). Already usable from Claude.
- **Unify:** triggers on 40+ signals (job changes, funding, hiring) and starts sequences automatically; manages mailboxes and warmup ([Unify](https://www.unifygtm.com/)). Copy: start from a signal, not a static list.
- **Amplemarket:** signals + email/LinkedIn/phone + deliverability monitoring in one tool ([Amplemarket](https://www.amplemarket.com/)).
- **11x (Alice):** fully autonomous SDR across email, LinkedIn, phone ([11x](https://www.11x.ai/)). Its LinkedIn channel carries the same ToS issue as above.

None of them lead with a custom research artifact; that is the part worth building yourself.

### recommended minimal stack

Four paid tools, plus free public APIs, cover needs 1–4:

1. **Exa** (search + `people` category + Websets): finds people by role and context, and does cheap phone/email enrichment. Hosted MCP, pay-as-you-go, no LinkedIn scraping on your side.
2. **Apollo** (existing account, MCP already connected here): match found people to verified work emails, get mobiles via `reveal_phone_number` + webhook, and send through a sequence from a separate cold domain's mailbox. Use tasks for LinkedIn steps a human completes.
3. **Free second-order APIs** called directly by scripts: OpenAlex, Greenhouse/Lever/Ashby, Companies House, SEC EDGAR, NSF/NIH, Sessionize, GitHub; Jina Reader for any other page. No keys or free keys.
4. **Typst + Cloudflare R2/Worker**: one Typst template filled from a per-prospect JSON, uploaded to R2, served at a unique tracked URL. Add Observable Framework only when a shared interactive market dashboard is worth building.

Add Parallel FindAll only if Exa Websets misses; add FullEnrich only if Apollo phone coverage is poor for your segment. Skip Clay (API needs $446/mo), ContactOut (Enterprise only), and all LinkedIn automation tools.

| Tool | Agent-callable? | Cost to start | Phones? | ToS risk |
|---|---|---|---|---|
| Exa (+Websets) | REST, MCP | $10/mo free; Websets needs paid | Yes, $0.07 | Low |
| Parallel FindAll/Task | REST, MCP | Free tier + credit | Via Task enrichment (unverified) | Low |
| Tavily | REST, MCP | 1,000 credits/mo free | No | Low |
| Perplexity Agent/Search | REST | Pay per use | No | Low (Sonar retired 2026-09-27) |
| Brave Search | REST | $5/mo free credit | No | Low; storage needs plan |
| Serper / SerpApi | REST | 2,500 / 250 free | No | Medium (Google results resale) |
| Firecrawl | REST, MCP | 1,000 credits free | No | Depends on target site; never LinkedIn |
| Jina Reader | HTTP | 10M tokens free | No | Depends on target site |
| OpenAlex, S2, arXiv, Crossref, ORCID | REST | Free | No | Low |
| Greenhouse/Lever/Ashby boards | REST, no auth | Free | No | Low |
| NSF / NIH / SAM.gov / USAspending | REST | Free | SAM.gov contacts yes | Low |
| Companies House / SEC EDGAR | REST | Free | No | Low |
| Apollo | REST, MCP | Free plan (work email) | Yes, 8 credits, async | Low (own data) |
| Clay | Webhook/HTTP from Growth | $446/mo for API | Yes | Low |
| PDL | REST | 10 free credits | Plan-dependent | Low–medium |
| Hunter | REST | 50 free credits | No | Low |
| Prospeo | REST | Add-on $10/1,000 credits | Yes, 10 credits | Low–medium |
| FullEnrich | REST, MCP | 50 free credits | Yes, 10 credits | Low–medium |
| Lusha | REST | 40 free credits | Yes, 5 credits | Low–medium |
| ContactOut | REST | Enterprise only | Yes | Medium |
| RocketReach | REST | Paid plan | Yes | Low–medium |
| Findymail | REST | 10 free credits | Yes (not EU) | Low–medium |
| Coresignal | REST | 7-day trial | On request | Medium (scraped profiles) |
| Proxycurl | — | Shut down | — | — |
| Gmail API | REST | Workspace seat | — | Low if volume is low |
| Instantly / Smartlead | REST | $47 / $39 per mo | — | Low (email) |
| lemlist | REST | $55/mo; LinkedIn $87+/user | Phone finder | High for LinkedIn steps |
| Unipile / HeyReach | REST, (HeyReach MCP) | €49 / $79 per mo | — | **High**: breaches LinkedIn User Agreement |
| LinkedIn official Messages API | Partners only | — | — | N/A for self-serve |
| Typst / Tectonic / latexmk | CLI | Free | — | None |
| Cloudflare R2 + Workers | API, wrangler | Free tier | — | None |
| Vercel | CLI/API | Pro for commercial use | — | Hobby ToS forbids commercial use |

## sources consulted

Search and research APIs
- https://exa.ai/pricing
- https://exa.ai/docs/reference/search
- https://exa.ai/docs/reference/exa-mcp
- https://exa.ai/docs/websets/api-guide
- https://exa.ai/docs/changelog/people-search-launch (via search result)
- https://docs.parallel.ai/findall-api/findall-quickstart
- https://parallel.ai/pricing
- https://docs.parallel.ai/integrations/mcp/getting-started
- https://docs.tavily.com/documentation/api-credits
- https://docs.tavily.com/documentation/rate-limits
- https://docs.tavily.com/documentation/mcp
- https://docs.perplexity.ai/getting-started/pricing
- https://docs.perplexity.ai/guides/rate-limits-usage-tiers
- https://docs.perplexity.ai/docs/agent-api/migrate-from-sonar
- https://brave.com/search/api/
- https://api-dashboard.search.brave.com/app/documentation/web-search/get-started
- https://serper.dev/ (pricing page https://serper.dev/pricing returned 404)
- https://serpapi.com/pricing
- https://www.firecrawl.dev/pricing
- https://docs.firecrawl.dev/mcp-server
- https://jina.ai/reader/
- https://developers.google.com/custom-search/v1/overview
- https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement (via search result)

Second-order sources
- https://docs.greenhouse.io/job-board.html
- https://github.com/lever/postings-api
- https://developers.ashbyhq.com/docs/public-job-posting-api
- https://docs.apollo.io/reference/organization-jobs-postings
- https://theirstack.com/en/pricing
- https://help.openalex.org/api-reference/authentication
- https://blog.openalex.org/openalex-api-new-features-and-usage-based-pricing/ (via search result)
- https://www.semanticscholar.org/product/api
- https://api.semanticscholar.org/api-docs/graph
- https://info.arxiv.org/help/api/tou.html
- https://www.crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication/
- https://www.crossref.org/documentation/retrieve-metadata/rest-api/tips-for-using-the-crossref-rest-api/
- https://info.orcid.org/documentation/features/public-api/
- https://resources.research.gov/common/webapi/awardapisearch-v1.htm
- https://api.reporter.nih.gov/
- https://patentsview.org/apis/keyrequest and https://data.uspto.gov/support/transition-guide/patentsview (via search results; https://data.uspto.gov/apis/api-rate-limits returned no body)
- Google Patents BigQuery marketplace page (failed to load)
- https://sessionize.com/playbook/api
- https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data
- https://developer.company-information.service.gov.uk/developer-guidelines
- https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference/officers/list
- https://open.gsa.gov/api/get-opportunities-public-api/
- https://open.gsa.gov/api/opportunities-api/
- https://api.usaspending.gov/docs/endpoints

Enrichment
- https://docs.apollo.io/reference/people-api-search
- https://docs.apollo.io/reference/people-enrichment
- https://docs.apollo.io/reference/rate-limits
- https://docs.apollo.io/docs/api-pricing
- https://docs.apollo.io/docs/apollo-mcp
- https://www.apollo.io/pricing (pricing table did not render)
- https://www.clay.com/pricing
- https://support.peopledatalabs.com/hc/en-us/articles/25794271805211-Pricing-credits (via search result; https://www.peopledatalabs.com/pricing/person did not render)
- https://hunter.io/pricing
- https://prospeo.io/api/mobile-finder and https://help.prospeo.io/en/article/how-prospeo-credits-work-yso5gk/ (via search results)
- https://fullenrich.com/pricing
- https://docs.lusha.com/user-guide/getting-started/how-credits-work-in-lusha (via search result)
- https://contactout.com/pricing (via search result)
- https://docs.rocketreach.co/reference/faq (via search result)
- https://www.findymail.com/pricing/ (via search result)
- https://docs.coresignal.com/introduction/pricing-and-subscriptions (via search result)
- https://nubela.co/blog/goodbye-proxycurl/

Sending and LinkedIn
- https://docs.apollo.io/reference/add-contacts-to-sequence
- https://developers.google.com/workspace/gmail/api/reference/quota
- https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace
- https://instantly.ai/pricing
- https://help.instantly.ai/en/articles/10432807-api-v2 (via search result)
- https://www.smartlead.ai/pricing
- https://www.lemlist.com/pricing
- https://www.heyreach.io/pricing
- https://www.unipile.com/pricing-api/
- https://developer.unipile.com/docs/provider-limits-and-restrictions
- https://developer.unipile.com/docs/linkedin
- https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/messages
- https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits
- https://www.linkedin.com/legal/user-agreement
- https://www.linkedin.com/help/linkedin/answer/a1341387
- https://www.linkedin.com/legal/crawling-terms

Deliverability and law
- https://support.google.com/a/answer/81126
- https://senders.yahooinc.com/best-practices/
- https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/

Artifacts and hosting
- https://github.com/tectonic-typesetting/tectonic
- https://ctan.org/pkg/latexmk
- https://github.com/typst/typst
- https://typst.app/docs/reference/data-loading/
- https://typst.app/docs/reference/foundations/sys/
- https://github.com/observablehq/framework
- https://github.com/evidence-dev/evidence
- https://docs.streamlit.io/deploy/streamlit-community-cloud
- https://sli.dev/guide/exporting
- https://github.com/marp-team/marp-cli
- https://github.com/hakimel/reveal.js
- https://github.com/scanny/python-pptx
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://vercel.com/docs/limits/fair-use-guidelines
- https://www.humanoids.fyi/industry/geopolitics (HTML and response headers inspected with curl)

Agentic outbound products
- https://www.unifygtm.com/
- https://www.amplemarket.com/
- https://www.11x.ai/
