# SalaryHub

A personal finance dashboard built with vanilla JavaScript, Firebase
Authentication and Cloud Firestore. Sign in with Google, set your monthly
salary and savings, then track recurring expenses and one-off transactions
against an animated daily-burn ring.

**Live demo:** https://salary-hub-web.web.app

## Features

- Google sign-in via Firebase Auth (popup with redirect fallback)
- Per-user data isolation enforced by Firestore security rules
- Recurring expenses and transaction history
- Daily allowance / burn-ring visualisation
- Glass-morphism UI, dark theme, fully responsive

## Tech stack

- HTML, CSS, vanilla JavaScript (no framework)
- Firebase Hosting, Firebase Auth, Cloud Firestore
- Inter + DM Mono via Google Fonts

## Project structure

```
.
├── Salaryhub.html        # Source of truth — the entire app in one file
├── dist/index.html       # Deployed copy (kept in sync with Salaryhub.html)
├── firebase.json         # Hosting config + security headers
├── firestore.rules       # Firestore security rules
└── .firebaserc           # Firebase project alias
```

## Local development

```bash
firebase emulators:start --only hosting,firestore
```

## Deploying

```bash
# Keep the deployed copy in sync with the source HTML
cp Salaryhub.html dist/index.html

# Deploy hosting + Firestore rules
firebase deploy --only hosting,firestore:rules
```

## Security

- Firestore rules deny by default; users can only access their own
  /users/{uid} subtree, with field-level validation on writes.
- Hosting responses include HSTS, CSP, X-Content-Type-Options,
  X-Frame-Options, Referrer-Policy, Permissions-Policy and
  Cross-Origin-Opener-Policy.
- The Firebase web API key is intentionally public — security is
  enforced by Firestore rules and Auth authorized-domains. Lock the
  key down further in Google Cloud Console -> APIs & Services ->
  Credentials -> HTTP referrers.
