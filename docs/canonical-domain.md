# DigiSol canonical domain

**Primary URL (use everywhere):** https://wwwdigisol.com

Do **not** market or list `https://www.wwwdigisol.com` — that is a mistaken double-www host. It 308-redirects to the apex.

## Locked in

| Layer | Behavior |
|-------|----------|
| Site canonical / schema / sitemap | `DIGISOL_SITE_URL` = `https://wwwdigisol.com` |
| Vercel | `www.wwwdigisol.com` → 308 → `wwwdigisol.com` |
| Next middleware + redirects | Same host forced to apex |
| robots.txt | `host` + sitemap point at apex |

## Marketing

Show **wwwdigisol.com** on ads, GBP website field, social bios, email signatures, and print. Local first (Airdrie / Alberta); worldwide later under the same domain.
