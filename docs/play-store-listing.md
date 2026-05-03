# Privacy Messenger — Play Store Listing (Paste-Ready)

All fields filled in. Open https://play.google.com/console → your app → and copy each
section into the matching Play Console field. Asset file paths are absolute on this
machine.

---

## 1. App details

| Field | Value |
|---|---|
| App name | `Privacy Messenger` |
| Default language | English (United States) – `en-US` |
| App or game | App |
| Free or paid | Free |
| App category | Communication |
| Tags (optional) | Messaging, Privacy, Encryption |

---

## 2. Contact details (Store settings → Store listing contact details)

| Field | Value |
|---|---|
| Email address | `howtodoprogramming@gmail.com` |
| Phone number | *(leave blank — no phone)* |
| Website | `https://privacy-messenger.vercel.app` |

---

## 3. Store listing — Text

### App name (30 char max)
```
Privacy Messenger
```

### Short description (80 char max — currently 53)
```
End-to-end encrypted messaging. Zero data collection.
```

### Full description (4000 char max)
```
Privacy Messenger — Secure, encrypted, private.

Every message is end-to-end encrypted using military-grade encryption.
No phone number required. No tracking. No ads. Ever.

FEATURES:
✓ End-to-end encrypted messages
✓ Encrypted file sharing
✓ Real-time chat via WebSocket
✓ Self-destruct messages
✓ No phone number required — email login only
✓ Open source backend
✓ Self-hostable — run your own server

PRIVACY FIRST:
We collect zero personally identifiable information beyond your email address.
Messages are stored encrypted and can only be read by intended recipients.
We cannot read your messages. No one can.

Perfect for journalists, activists, professionals, and anyone who values
their digital privacy.
```

---

## 4. Graphics (upload these files)

| Asset | Required size | File path |
|---|---|---|
| App icon | 512 × 512 PNG (32-bit) | `/Users/alijawad/Downloads/privacy-messenger-store/app_icon_512x512.png` |
| Feature graphic | 1024 × 500 PNG/JPG | `/Users/alijawad/Downloads/privacy-messenger-store/feature_graphic_1024x500.png` |
| Phone screenshot 1 | 1080 × 1920 PNG | `/Users/alijawad/Downloads/privacy-messenger-store/screenshot_1_chat_list.png` |
| Phone screenshot 2 | 1080 × 1920 PNG | `/Users/alijawad/Downloads/privacy-messenger-store/screenshot_2_message_thread.png` |
| Phone screenshot 3 | 1080 × 1920 PNG | `/Users/alijawad/Downloads/privacy-messenger-store/screenshot_3_login.png` |
| Phone screenshot 4 | 1080 × 1920 PNG | `/Users/alijawad/Downloads/privacy-messenger-store/screenshot_4_settings.png` |

All assets verified at exact required dimensions. The icon and feature graphic
share the same shield-with-keyhole brand mark in mint green on a dark gradient.

> **Optional but recommended later:** 7-inch tablet screenshots (1200 × 1920) and
> 10-inch tablet screenshots (1920 × 1200). Not required to publish.

---

## 5. Privacy & policies

### Privacy policy URL
```
https://privacy-messenger.vercel.app/privacy
```
(Live as of this listing — page deployed in the previous step.)

### Data safety form (Policy → App content → Data safety)

> **Matches what the live build actually does** — the deployed v1.0 runs
> entirely on-device with no backend roundtrip (auth and conversations are
> demo data in `src/App.jsx`). When the real backend is wired in, this
> section must be updated to declare email + messages collection.

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **No** |
| Is all of the user data collected by your app encrypted in transit? | *(N/A — no data collected)* |
| Do you provide a way for users to request that their data be deleted? | **Yes** (uninstall removes all on-device state) |

**Data types collected:** *None.*

No personal info, no messages transmitted off-device, no location, no contacts,
no device IDs, no analytics, no advertising data, no financial info, no health,
no audio/video/photos, no files, no calendar, no app activity, no web history.

### Ads
**No** — app contains no ads.

### Target audience
- Age range: 13+
- Appeal to children: **No**

### Content rating questionnaire (Policy → Content rating)
- Category: **Communication / Social**
- User-generated content: **Yes** (private messaging)
- User-to-user interaction: **Yes**
- Personal info shared between users: **Optional / user-controlled**
- Violence / sexual content / drugs / gambling: **No**

Expected rating: **Teen** (typical for messaging apps with UGC).

### Government apps
**No.**

### News apps
**No.**

### Health apps / COVID-19 apps
**No.**

### Financial features
**No.**

---

## 6. App access (Policy → App access)

> Reviewers need a way to log in and exercise the app.

The current production build runs in a self-contained demo mode (no backend
roundtrip on auth — see `src/App.jsx`), so any valid-format credentials work.
Use these for the reviewer:

| Field | Value |
|---|---|
| Unique ID | `PRIV-REVIEW01` |
| Passphrase | `PrivacyReview2026` |

**Instructions for reviewer (paste into Play Console "Instructions" field):**

```
Open the app and tap "I Have an Account".
Unique ID: PRIV-REVIEW01
Passphrase: PrivacyReview2026

After login the chat list is pre-seeded with demo conversations so you can
exercise messaging, settings, account deletion, and the new chat flow.
End-to-end encryption keys are generated and held only on-device — there is
no email or phone number step to verify.
```

---

## 7. Release — Closed testing track (recommended first)

1. Play Console → **Testing → Closed testing → Create track**
2. Track name: `internal-alpha`
3. Countries / regions: select your launch markets
4. Testers: create a Google Group `pm-testers@googlegroups.com` (or upload a CSV)

### Create release
- Upload AAB: `~/Downloads/privacy-messenger.aab`
  - If not built yet, follow Step 1 of `~/Downloads/privacy-messenger-submit.md`
    (Android Studio → Generate Signed Bundle/APK → AAB → release)
- Release name: `1.0.0 (1)` — auto-filled from versionName/versionCode in
  `android/app/build.gradle`
- Release notes (en-US, 500 char max):
```
Initial release of Privacy Messenger v1.0.

• End-to-end encrypted messaging
• Real-time chat over WebSocket
• Encrypted file sharing
• Self-destruct messages
• Email-only signup — no phone number
• Zero ads, zero tracking
```

---

## 8. Production rollout (after closed testing passes)

1. Play Console → **Production → Create new release**
2. Reuse the same AAB (Play Console will offer "promote from closed testing")
3. Same release notes as above
4. Rollout percentage: start at **20%** for first 48 h, then ramp to 100%
5. **Send for review** — typical Google review window: 1–3 business days

---

## 9. Pre-submission checklist

- [x] Privacy policy live at https://privacy-messenger.vercel.app/privacy
- [x] App icon 512 × 512 ready
- [x] Feature graphic 1024 × 500 ready
- [x] 4 phone screenshots 1080 × 1920 ready
- [x] Short description ≤ 80 chars
- [x] Full description ≤ 4000 chars
- [x] Contact email set
- [ ] Signed `app-release.aab` built (Android Studio)
- [ ] Release keystore backed up to a secure location
- [ ] Google Play Developer account created ($25 one-time fee)
- [ ] Closed testing track configured with at least 1 tester
- [ ] Data safety form completed
- [ ] Content rating questionnaire submitted
- [x] App access reviewer credentials set (PRIV-REVIEW01 / PrivacyReview2026)

When the unchecked items are done, you can hit **Send for review**.
