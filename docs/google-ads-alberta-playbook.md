# DigiSol Google Ads + Local SEO Playbook (Alberta)

Status: **parked until Google Ads is funded and the account is accessible**.  
Canonical site: **https://wwwdigisol.com** (not www.wwwdigisol.com).  
Goal: paid visibility now, map-pack dominance over time.

Use this file when you are ready to bid. Do not run Broad Match or Canada-wide targeting on day one.

---

## When this is ready to turn on

- Google Ads account can be opened (no pre-auth / payment block)
- Conversion tag ID (`AW-…`) is in Vercel as `NEXT_PUBLIC_GOOGLE_ADS_ID`
- Optional conversion label is in `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL`
- Analytics property `G-4ZBG4VPC9C` is linked to the Ads account
- Landing URL for every ad: `https://wwwdigisol.com/`
- Consult conversion URL: `https://wwwdigisol.com/confirmation`

The website already fires a lead conversion on the confirmation page once those env vars are set.

---

## Part 1 — Campaign setup

### Geo targeting (required)

Do not target Canada or All regions.

Include only:

- Airdrie, Alberta
- Calgary, Alberta
- Edmonton, Alberta
- Red Deer, Alberta

Presence: **Presence: People in or regularly in your targeted locations** (not “interested in”).

### Bidding

| Stage | Strategy | When to use |
| --- | --- | --- |
| Launch | Maximize Clicks | First traffic, learning search terms |
| After 15–30 conversions | Maximize Conversions | Default once form tracking is live |
| Flagship terms only | Target Impression Share (Absolute top) | e.g. `web developer Airdrie` |

Start on Maximize Clicks only long enough to collect queries. Switch to Maximize Conversions as soon as consult tracking is working.

### Match types

Use **Phrase** and **Exact**. Skip Broad Match at launch.

- Phrase: `"web development Airdrie"`
- Exact: `[digital marketing agency Calgary]`

---

## Part 2 — Keywords to bid

### Core high-intent local (highest priority)

- `web developer Airdrie`
- `digital marketing agency Calgary`
- `SEO company Edmonton`
- `web design and marketing Alberta`
- `local SEO services Airdrie`

### Service / tech

- `Next.js web development agency Alberta`
- `custom web app developer Calgary`
- `CRO agency Edmonton`
- `full-stack development and marketing`

### Startup / growth

- `MVP development agency Alberta`
- `lead generation for local businesses Calgary`
- `ecommerce web developer Airdrie`

Add city variants later (Airdrie / Calgary / Edmonton / Red Deer) for each service, still Phrase or Exact.

---

## Negative keywords (add on day one)

Add these at campaign level:

- free
- template
- DIY
- jobs
- salary
- course
- tutorial
- WordPress plugins
- wordpress plugin
- hire me
- intern
- internship
- sample
- download
- cheap
- wix
- squarespace
- shopify theme
- fiverr
- upwork

---

## What Cursor can execute vs what only Google Ads can do

### Can do from here (code / Vercel / the website)

- Conversion tag on wwwdigisol.com (already prepared; needs `AW-` ID)
- Send a conversion when someone books a consult (`/confirmation`)
- Keep landing pages, Dispatch, and metadata aimed at Airdrie, Calgary, Edmonton, Red Deer
- Draft ad copy, sitelinks, and extra landing sections for these keywords
- Maintain this keyword + negative list
- Point every public URL at `https://wwwdigisol.com`

### Cannot do from here (needs your Google Ads login + spend)

- Pass Google Ads pre-auth / billing
- Create the Search campaign
- Set geo targeting to those four cities
- Choose Maximize Clicks / Conversions / Impression Share
- Upload keywords, match types, and negatives into the live account
- Set daily budget or bid caps
- Link Ads ↔ Analytics inside Google (Admin product links)
- Finish “Set up your ad” on the Google Business Profile
- Make ads show on Google Search

I will not log into ads.google.com or spend budget until you ask and the account is funded.

---

## Suggested first campaign (when you are ready)

1. Campaign type: Search
2. Network: Search only (turn off Display)
3. Locations: Airdrie, Calgary, Edmonton, Red Deer
4. Language: English
5. Budget: start small and fixed daily
6. Bidding: Maximize Clicks → Maximize Conversions after tracking works
7. Final URL: `https://wwwdigisol.com/`
8. Conversion: Consult request on `/confirmation`
9. Keywords: the three lists above, Phrase + Exact
10. Negatives: the list above

Then send the `AW-` conversion ID so the site tag can be turned on.
