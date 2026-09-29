# What's left for Cameron

Last checked: **September 28, 2026**. These are the steps only you can do, because they need your logins, documents or decisions. Everything else in the site and Hub is built and live.

To recheck the items marked **(checked by script)**, run this from `C:\dev\DigiSol`:

```powershell
node --env-file=.env.local scripts/todo-status.mjs
```

It prints each item's status without showing any passwords or keys.

---

## 1. Fix now: these features are offline until you do

### Google setup page (Hub → Google setup): connect DigiSol's robot login

The page is live. It checks GA4, Search Console and Google Ads every Monday at 7 am and emails you what's new. Copy the robot email from the top of the page, then:

- [x] **GA4:** Admin → Property access management → change the robot email from Viewer to **Editor**.
- [x] **Search Console:** Settings → Users and permissions → Add user → robot email → **Full**.
- [x] **Google Cloud** (the project that owns the robot): turn on **Google Analytics Admin API**, **Google Search Console API** and **Google Ads API**. The Hub shows an "Open in Google" link to the exact switch if one is off.
- [x] **Google Ads manager account created:** DigiSol **321-535-3750**.
- [x] **Robot access:** Admin → Access and security → `digisol-hub-analytics@digisol-ai-gemini.iam.gserviceaccount.com` added as **Standard** (Sep 28, 2026).
- [ ] **Link confirmation:** link request sent from the manager to ad account **311-057-1093**. Accept it on that ad account when Google asks. The Accounts list stays empty until that confirmation lands.
- [x] **Google Ads API access:** no developer token (Google retired them on Sep 9, 2026). `GOOGLE_ADS_MANAGER_ID` = `3215353750` and `GOOGLE_ADS_CUSTOMER_ID` = `3110571093` go on Vercel. The Hub calls Ads once the manager number is set.
- [ ] With Working on set to DigiSol, click **Save and run check**, then **Apply safe fixes**. Review each ad change before clicking it.
- [ ] For each new client: send them the same three access steps and fill in their accounts on the page.



### Google reviews: the API key is rejected (checked by script)

Google answers `API_KEY_INVALID`, so the Google reviews card in Hub Analytics can't show numbers yet. The database side is already done.

- [ ] Open [Google Cloud → Credentials](https://console.cloud.google.com/apis/credentials), click **Show key** on your Places key and copy it again carefully.
- [ ] Paste it as `GOOGLE_PLACES_API_KEY` in **both** `.env.local` and Vercel (Production), then redeploy.
- [ ] In the same Google Cloud project, check that **Places API (New)** is enabled and billing is attached. Normal use stays inside the free monthly credit.
- [ ] Tell the agent "Places key updated" so it can retest and then delete `scripts/places-check.ts`.



### Facebook and Instagram: tokens expired September 24 (checked by script)

Until these are replaced, the Hub can't post to Facebook or Instagram, pull Instagram stats or show Meta Ads numbers.

- [ ] Make sure @digi.sol20269 is a **Professional** Instagram account and is linked to the DigiSol Facebook Page (Page → Settings → Linked accounts).
- [ ] In [Business Settings](https://business.facebook.com/settings), go to **Users → System users → Add**. Name it "DigiSol Hub" and give it the Admin role.
- [ ] Click **Assign assets** and give it full control of the Page, the Instagram account, the ad account and the Pixel.
- [ ] Click **Generate new token**, choose the **DigiSol Website** app, set expiration to **Never**, and tick these permissions:
  `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`, `ads_read`, `ads_management`, `business_management`.
- [ ] In the [Graph API Explorer](https://developers.facebook.com/tools/explorer/), paste that token and run `YOUR_PAGE_ID?fields=access_token,instagram_business_account`.
- [ ] Put the values in **both** `.env.local` and Vercel (Production), then redeploy:

  | Setting                              | Value                                                 |
  | ------------------------------------ | ----------------------------------------------------- |
  | `META_CAPI_ACCESS_TOKEN`             | System user token                                     |
  | `META_PAGE_ACCESS_TOKEN`             | The `access_token` from the Explorer                  |
  | `INSTAGRAM_BUSINESS_ACCOUNT_ID`      | The `instagram_business_account.id` from the Explorer |
  | `META_PAGE_ID`, `META_AD_ACCOUNT_ID` | Unchanged                                             |


- [ ] Tell the agent "Meta tokens updated" so it can rerun `scripts/meta-check.ts`.

---



## 2. Waiting on Meta (about a week)



### Business verification, then publishing the Meta app

This clears the "Missing Properties: fb:app_id" warning in Facebook's Sharing Debugger. Your share previews already work, so the warning is cosmetic. Verification also lets the Hub use Meta ads tools for other companies later.

- [ ] Wait for **Business verification** to be approved (submitted September 28).
- [ ] Then, in the **DigiSol Website** app, go to **Publish** and start **Access verification** (Tech Provider). Meta says its review takes up to 5 days.
- [ ] Once both are approved, click **Publish**.
- [ ] In the [Sharing Debugger](https://developers.facebook.com/tools/debug/), enter `https://wwwdigisol.com` and click **Scrape Again**.

- Don't click **Remove** next to the business on the Publish page. It could break the Hub's Meta ads connection.

---



## 3. Quick account settings (I can't check these from here)

Tick them off if you've already done them.

- [ ] **Resend:** go to Webhooks, open your wwwdigisol.com endpoint and tick the `email.complained` event. Without it, people who mark your email as spam aren't automatically removed from Contacts.
- [ ] **Google Ads:** click **Fix it** on the "Submit your Canada tax info" banner (Billing → Settings → Tax info).
  - If you're GST-registered, enter your number (9-digit business number + `RT0001`).
  - Otherwise, choose "not registered".
- [ ] **Google Ads lead form:** make sure it's **saved** with **Full name, Email and Phone number** ticked and the webhook filled in:
  - URL: `https://wwwdigisol.com/api/webhooks/google-ads-lead`
  - Key: `GOOGLE_ADS_LEAD_KEY` from `.env.local`
- [ ] **Yahoo ([digisol2026@yahoo.com](mailto:digisol2026@yahoo.com)):** find the "New lead: …" alert emails. If they're in Spam, mark them **Not Spam**. Check Gmail too.
- [ ] **Google Ads "Contact" conversion:** it said "Awaiting conversions". If it still shows that in a few days, tell the agent.

---



## 4. Get found on Google (ongoing)

- [ ] **[Google Search Console](https://search.google.com/search-console):** paste each of these URLs into the top search bar and click **Request indexing**:
  - `https://wwwdigisol.com/dispatch/digisol-launch-growth-platform-for-alberta-businesses`
  - `https://wwwdigisol.com/blog`
  - `https://wwwdigisol.com/blog/how-to-get-more-google-reviews-alberta`
  - `https://wwwdigisol.com/blog/small-business-website-cost-alberta-2026`
  - `https://wwwdigisol.com/blog/google-business-profile-checklist-airdrie-calgary`
- [x] **Search Console → Sitemaps:** `https://wwwdigisol.com/sitemap.xml` submitted Sep 28, 2026. Status "Success", 18 pages discovered. All 5 city pages and `/locations` confirmed indexed.
- [ ] **[Bing Webmaster Tools](https://www.bing.com/webmasters):** add the site. You can import it straight from Search Console.
- [ ] **Google Business Profile:**
  - [ ] Add your Instagram (`https://www.instagram.com/Digi.Sol2026/`) and Facebook links under Edit profile → Contact / Social profiles.
  - [ ] Post the website-audit update from `docs/gbp-website-audit-media.md`.
- [ ] **Google reviews:** ask every finished client for a review by text with your review link. Once the Places key works, the Hub has a **Copy leave-a-review link** button. Ask everyone, don't offer rewards, and don't tell them what to write (Google's rules).
- [ ] **Directory listings**, using the exact same name, address and phone everywhere: Bing Places, Apple Business Connect, Yelp, the Airdrie Chamber of Commerce and Clutch.
- [ ] **Local links:** sponsor a small Airdrie event, or give a local nonprofit a free audit and ask for a credit on their site.

---



## 5. Marketing to-dos

- [ ] **Launch issue (Dispatch Vol. 2):** on the issue page, use **Export to socials** to copy the Facebook and Instagram captions and post them.
- [ ] **LAUNCH promo runs October 2–31.** Post about it on October 2. The pricing page switches on automatically that morning.
- [ ] **Share each blog guide** on Facebook and Instagram.
- [ ] **Try a newsletter A/B test:** in Hub → Campaigns, click **New A/B test**, pick the launch issue and click **Ask Kaylev to plan it**. The database tables now exist, so saving works.
- [ ] **Run a competitive analysis** for DigiSol and each client (Hub → Competitive analysis). It should move past "Queued" within seconds.
- [ ] **Testimonials:** send the agent 2–3 real client quotes (name, business, one or two sentences) and it will add a testimonials section. None will be made up.

---



## 6. Hub clean-up

- [ ] **Contacts:** delete the two review-removal spam leads from September 26 (`hasanurreview@gmail.com` and `gneira2@estudiantes.areandina.edu.co`).
- [ ] **Contacts:** fix or delete "YYC Heating & Cooling Pros". Its email `team@latofonts.com` belongs to a font company.

---



## 7. Optional, when you're ready

- **Online booking:** live. “Phone consultation with DigiSol”, 30-minute phone call, weekdays 9:00am–5:00pm Mountain time. Public link is `NEXT_PUBLIC_DIGISOL_BOOKING_URL` (local and Vercel). “Book a call” is on the site. Leave the Google Ads “Book appointment” goal Secondary so it does not compete with Consult Request — a finished booking happens on Google Calendar, not on the site, so it does not fire the consult conversion.
- **LinkedIn business page:** when it's ready, add these in Vercel and redeploy:
  - `NEXT_PUBLIC_DIGISOL_LINKEDIN_URL` (the page's URL)
  - `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_AUTHOR_URN` (for posting from the Hub)
- **Stripe:**
  - The site records payments from the checkout success page only; there's no Stripe webhook yet. Ask the agent to add one so a payment is still recorded if the customer closes the tab early.
  - Turn on **Stripe Tax** once you're GST-registered.
- **Gmail inbox logo:** Gmail and Apple Mail only show your logo instead of the "D" with a paid logo certificate (VMC or CMC, about US$1,000–1,500 a year). Yahoo and AOL can show it without one as your sending volume builds.
- **Google Ads demographics:** wait for about 100 clicks before changing targeting based on age or gender.
- **Inngest:** the Vercel integration now re-syncs background jobs on every deploy. If a new Hub feature ever gets stuck on "Queued", click **Resync** in the Inngest dashboard.

---



## Already done (no action needed)

- All database migrations: competitive analyses, A/B tests and Google reviews.
- **Inbound lead nurture** and **Audited prospect follow-up** workflows are switched **on**.
- DMARC and BIMI DNS records are live in Cloudflare.
- Google Ads campaign cleanup: Search only, Alberta targeting, negative keywords, local keywords, conversion fixes.
- Google Ads lead form webhook, lead alerts to Yahoo and Gmail, and the contact form spam filter.
- Share preview card on every page. The `fb:app_id` tag is on the site with the correct ID.
- Inngest Vercel integration installed.

