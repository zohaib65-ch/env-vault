# ENV Vault

A private, self-hosted vault for your `.env` files. Sign in with Google on any
laptop, open a project, and copy the variable you need, with every value
encrypted at rest and every reveal gated by a separate security passcode.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui,
Lucide, MongoDB + Mongoose, Google OAuth and Zod.

## Features

- **Google sign-in.** Uses OAuth 2.0 with PKCE, `state` and `nonce`. ID tokens are verified against Google's JWKS.
- **Projects.** Each one holds the variables for one app.
- **Masked by default.** Values never render until you unlock them. A revealed value hides itself after 30 seconds, or as soon as you switch tabs.
- **Fingerprint unlock (Touch ID).** Turn it on per device in Settings, confirming with your PIN once. After that, reveal, copy and export open the fingerprint prompt automatically. It's built on WebAuthn passkeys, so your fingerprint never leaves the laptop, and the PIN keeps working as a backup.
- **4-digit security passcode.** It is separate from your Google password and is required to **reveal**, **copy** or **export**. It is checked on the server and never stored in plain text. 5 wrong attempts lock it and sign out every device.
- **Paste `.env`.** Paste the whole contents of a local `.env` at once. Hidden dotfiles never need to be found in Finder. The text stays masked, is parsed on the server, and the preview shows variable names only. You choose which keys to import and whether to overwrite existing ones.
- **Copy all.** After your passcode, the whole project goes to your clipboard as a valid `.env`, ready to paste into your editor. **Download .env file** (in the ⋯ menu) saves the same content as a file. Values are never rendered on the page.
- **Search (⌘K).** Searches project and variable *names*. Values are never searched.
- **Recent activity.** The dashboard shows the latest sign-ins, changes, reveals, copies, imports, exports and failed passcode attempts. Only names and counts are logged, never values.
- **Settings.** Shows your Google account, lets you change your passcode, explains the security model, lists signed-in devices (with revoke) and has log out.

## Security model

| Concern | How it's handled |
| --- | --- |
| Values at rest | AES-256-GCM, a fresh random 96-bit IV per value, and additional authenticated data (AAD) that binds each ciphertext to its variable id. MongoDB only ever sees `v1:<iv>:<tag>:<ciphertext>`. |
| Encryption key | `ENCRYPTION_KEY` is read only by server-only modules (`import "server-only"`). It is never exposed to the browser. |
| Passcode | A 4-digit PIN, keyed with an HMAC pepper derived from `ENCRYPTION_KEY`, then hashed with scrypt (N=2¹⁷, r=8, p=1) and a per-user salt. The pepper means a leaked database alone can't brute-force the 10,000 possible PINs offline. Verified with a constant-time comparison. |
| Brute force | Each attempt is reserved atomically in MongoDB *before* the hash check, so parallel guesses can't exceed the limit. 5 failures lock entry for 15 minutes, and each further lockout doubles that, up to 24 hours. The doubling is not reset by a successful unlock. Every lockout also signs out all devices, so a stolen session gets at most 5 guesses before a fresh Google sign-in is needed. |
| Fingerprint unlock | WebAuthn passkeys (SimpleWebAuthn) bound to the `APP_URL` domain, with user verification required. Each unlock signs a fresh, single-use challenge tied to your session, so a captured response can't be replayed. Only public keys are stored. |
| Who can sign in | `ALLOWED_EMAILS` is required, so the app fails closed. It is re-checked on every request, so removing an email locks that account out immediately. |
| Sessions | A random 256-bit token in an `HttpOnly`, `SameSite=Lax` cookie. Over HTTPS it is also `Secure` and uses the `__Host-` prefix. Only its SHA-256 hash is stored, sessions expire after 30 days, and you can revoke any of them from Settings. |
| Authorization | Every query is scoped to the signed-in user's id, and every Server Action re-checks the session and ownership. `proxy.ts` is only an early redirect, not the security boundary. |
| Secret exposure | Pages receive variable *names* only. A single decrypted value is returned only after a passcode check, and all values are returned only for the explicit "Copy all" / download action. |
| Headers | CSP (`frame-ancestors 'none'`, no third-party scripts), `X-Frame-Options: DENY`, `nosniff`, and HSTS when served over HTTPS. |
| Logs | Server Function argument logging in `next dev` is turned off, so passcodes and values never reach your terminal. Errors are logged by class only. |

> **Keep `ENCRYPTION_KEY` safe and backed up.** If it is lost or changed, every
> stored value becomes unreadable and the passcode stops matching. Use the same key on every deployment that
> shares the database.

## Setup

### 1. MongoDB

Create a database, for example a free MongoDB Atlas cluster, and copy its connection string.

### 2. Google OAuth client

1. Open [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth client ID** of type **Web application**.
3. Add an **Authorized redirect URI** for every place you run the app:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://your-domain.com/api/auth/google/callback`
4. Copy the client ID and secret.

### 3. Environment variables

```bash
cp .env.example .env.local
openssl rand -base64 32   # paste the output into ENCRYPTION_KEY
```

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | ✓ | MongoDB connection string |
| `ENCRYPTION_KEY` | ✓ | 32 bytes, base64 (`openssl rand -base64 32`) or 64 hex characters |
| `GOOGLE_CLIENT_ID` | ✓ | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✓ | OAuth client secret |
| `APP_URL` | ✓ | Public URL of the app, e.g. `http://localhost:3000` |
| `ALLOWED_EMAILS` | ✓ | Comma-separated Google emails allowed to sign in, e.g. `you@gmail.com`. Set it to `*` only if you really want any Google account to be able to create its own vault. |

If something is missing, the login page lists exactly which variables still
need to be set.

### 4. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000, sign in with Google, then create your security
passcode.

## Using it across two laptops

1. Deploy once, for example to Vercel. Set the environment variables there and add the production redirect URI to your Google OAuth client.
2. **Laptop 1:** sign in, create a project, then add variables or click **Paste .env** and paste your whole `.env`.
3. **Laptop 2:** sign in with the same Google account and open the project. Click **Copy** next to a variable and enter your passcode. The value is placed straight on your clipboard, ready to paste into your local `.env`.
   Or click **Copy all** to put the whole `.env` on your clipboard, then paste it into a `.env` file in your editor.

## Fingerprint unlock notes

- Each laptop is turned on separately in **Settings → Fingerprint unlock**. Remove a device there if it's lost.
- Passkeys belong to the domain in `APP_URL`. A laptop set up on `http://localhost:3000` must be set up again on your deployed HTTPS domain.
- It works in Chrome and Safari on Macs with Touch ID, and in other browsers with a built-in authenticator, such as Windows Hello. Everywhere else, use the PIN.

## Forgot your passcode?

The web app deliberately has no way around the passcode. With database access,
the owner can remove it and set a new one at next sign-in. Stored secrets are
not affected.

```bash
npm run reset-passcode -- you@example.com
```

This reads `MONGODB_URI` from `.env.local` and also signs that account out
everywhere.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm run reset-passcode -- <email>` | Remove a user's passcode (requires DB access) |

## Project structure

```
app/
  (app)/                 Authenticated shell: dashboard, projects, settings
  actions/               Server Actions — every one re-checks the session and ownership
  api/auth/google/       OAuth start + callback route handlers
  api/search/            Name-only search endpoint for the ⌘K palette
  login/  setup/         Sign-in and first-run passcode screens
components/
  ui/                    shadcn/ui primitives
  shared/                Passcode dialog, page header, skeletons, …
  projects/ variables/   Feature components
lib/
  dal/                   Server-only data access layer (authorization lives here)
  models/                Mongoose models
  crypto.ts              AES-256-GCM helpers
  passcode.ts            Peppered scrypt hashing for the PIN
  dotenv.ts              .env parser/serializer (dotenv-compatible)
proxy.ts                 Optimistic redirect for signed-out visitors
```
