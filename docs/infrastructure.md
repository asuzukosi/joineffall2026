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
