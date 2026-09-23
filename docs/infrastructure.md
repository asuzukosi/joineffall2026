# Infrastructure

One Fly app serves two hostnames. Cloudflare holds the zone; Fly holds the
certificates.

```text
  joineffall2026.com                 connections.joineffall2026.com
  (landing page)                     (the app)
         │                                    │
         └────────── A  66.241.124.159 ───────┤
                     AAAA 2a09:8280:1::198:3d82:0
                                              │
                                              ▼
                              fly app  joineffall2026  (lhr)
                              one machine, volume at /data
```

Both names resolve to the same Fly app. Which surface a request gets is decided
in the app by the `Host` header, not by DNS.

## Records

Every record is **unproxied** (grey cloud). Fly issues and renews the
certificates itself, and proxying breaks the ACME challenge.

| Name | Type | Content |
|---|---|---|
| `joineffall2026.com` | A | `66.241.124.159` |
| `joineffall2026.com` | AAAA | `2a09:8280:1::198:3d82:0` |
| `connections.joineffall2026.com` | A | `66.241.124.159` |
| `connections.joineffall2026.com` | AAAA | `2a09:8280:1::198:3d82:0` |

The IPv4 is Fly's **shared** ingress address, which is why the AAAA record
matters: a shared v4 serves many apps and routes by SNI, while the v6 is
dedicated to this app.

## Reproducing it

```bash
export CF_API_TOKEN="$(cat ~/.config/cloudflare/api_token)"

fly ips list -a joineffall2026        # read the current v4 and v6

for name in @ connections; do
  flarectl dns create --zone joineffall2026.com --name "$name" --type A    --content <V4>
  flarectl dns create --zone joineffall2026.com --name "$name" --type AAAA --content <V6>
done

fly certs add joineffall2026.com             -a joineffall2026
fly certs add connections.joineffall2026.com -a joineffall2026
fly certs show connections.joineffall2026.com -a joineffall2026   # until Status = Issued
```

If the Fly app is ever recreated its IPs change, and all four records have to be
rewritten from `fly ips list`.

## The registration

Registered through the Cloudflare Registrar API at cost.

| | |
|---|---|
| Registered | 2026-09-22 |
| Expires | **2027-09-22** |
| Auto-renew | **off** |
| WHOIS | redacted |
| Term | 1 year, $10.46 |

**Auto-renew is off**, which is the API's default and was left alone
deliberately: the cohort runs to December 2026, so nothing here should quietly
bill a second year. The flip side is that the domain lapses in September 2027
unless someone renews it. Turn it on if the site outlives the cohort.

## Photos

Member avatars are objects in the R2 bucket `joineffall2026-photos`, served
publicly from `cdn.joineffall2026.com` — an R2 custom domain on the same zone,
so no delegation and no nameserver changes.

```text
  roster.csv  photo column
       │  https://cdn.joineffall2026.com/<sha256[0:20]>.webp?v=1
       ▼
  cdn.joineffall2026.com  ── R2 custom domain, min TLS 1.2
       │
       ▼
  bucket joineffall2026-photos      61 objects, 1.2 MB
```

Object keys are the **first 20 hex of the file's SHA-256**, not the member's
name. The bucket is public, so a name-based key would publish a
name-to-face mapping to anyone who can guess a slug. The roster — which is a
secret — holds the mapping.

The `?v=1` suffix is a cache key, not something R2 reads. Cloudflare caches
negative responses, so a photo requested before it was uploaded stays 404 at the
edge; bumping the version is the way to break that without a cache-purge
credential.

```bash
export CLOUDFLARE_API_TOKEN="$(cat ~/.config/cloudflare/api_token)"
export CLOUDFLARE_ACCOUNT_ID=7de601c9208fe1ccd74bdfa1b58cb47c

wrangler r2 object put joineffall2026-photos/<key>.webp \
  --file photos/<name>.webp --content-type image/webp --remote
```

After any photo change, re-verify every URL rather than trusting the upload
output — an upload that reports "complete" can still be missing at the edge:

```bash
tail -n +2 roster.csv | cut -d, -f4 | while read -r url; do
  printf '%s %s\n' "$(curl -sS -o /dev/null --max-time 15 -w '%{http_code}' "$url")" "$url"
done | grep -v '^200' || echo "all serving"
```

## What does not work for moving files

Measured on this app, so nobody repeats it:

| Attempt | Result |
|---|---|
| `tar czf - … \| fly ssh console -C 'tar xzf -'` | Hangs forever — `-C` does not forward stdin |
| `fly ssh sftp put bundle.tar.gz /data/…` | Creates the file, then stalls at **0 bytes** |
| base64 inside the `-C` argument | 1 KB argument: 1 s. 8 KB argument: times out at 75 s |

A bare `fly ssh console -C "echo alive"` round-trips in 1.6 s, so this is not the
network. Anything that needs to reach the app goes in a secret, in R2, or
through the app's own HTTPS surface.

## Sending email

`joineffall2026.com` is a verified sending domain in Resend, added through their
API rather than the dashboard, with the records created in Cloudflare:

| Name | Type | Purpose |
|---|---|---|
| `resend._domainkey` | TXT | DKIM signing key |
| `send` | TXT | SPF — `v=spf1 include:amazonses.com ~all` |
| `send` | MX | Bounce and complaint feedback |
| `rsend` | CNAME | Resend's sending host |

Until the domain verified, mail left as `onboarding@resend.dev`, which Resend
delivers **only to the Resend account owner's own address** — fine for testing,
useless for a cohort. `RESEND_FROM` is what switches it over.

```bash
fly secrets set RESEND_FROM="hello@joineffall2026.com" -a joineffall2026
```

The `flarectl` table wraps long TXT values across lines, which makes an SPF
record look truncated. Read the record back through the API before believing it:

```bash
curl -sS "https://api.cloudflare.com/client/v4/zones/<zone>/dns_records?type=TXT" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq -r '.result[] | "\(.name) => \(.content)"'
```
