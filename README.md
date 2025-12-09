# Pi Currency Companion

A simple, Pi-friendly currency helper built with Next.js (App Router) and Tailwind CSS. The UI is fully in English and highlights three monetary symbols: Greek Pi (π), the US Dollar ($), and the Euro (€). It is designed to be easily deployed on Vercel and to align with the Pi community developer guide.

## Getting started

1. Install dependencies locally (Vercel will also handle this during deployment):
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open http://localhost:3000 to preview the app.

## Validation key

The Pi validation key is served from `/.well-known/pi-validation.txt` via an App Router route. Provide the official string in `NEXT_PUBLIC_PI_VALIDATION_KEY` (Vercel Project Settings → Environment Variables) and the route will emit it as plain text.

If you don’t set the variable, the route falls back to the baked-in placeholder so the Pi Browser can still verify a preview deployment. You can swap that placeholder in `app/.well-known/pi-validation.txt/route.ts`.

## Deployment to Vercel

1. Push this repository to your Git provider.
2. Create a new Vercel project and import the repo.
3. Use the default **Next.js** framework preset.
4. Add environment variables in **Project Settings → Environment Variables** (see below).
5. Trigger a deploy; Vercel will build using `npm run build` and serve the optimized app.
6. The official Pi SDK (`https://sdk.minepi.com/pi-sdk.js`) is already injected globally; you can immediately call
   `window.Pi` from client components after adding your Pi configuration.

### Environment variables

The project works out-of-the-box; there is only **one optional variable** relevant to the current code:

| Name | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_PI_VALIDATION_KEY` | No | Production/Preview | Alternative way to deliver the Pi validation string through the UI or an API route. Keep it in the Vercel dashboard and avoid hardcoding secrets. |

Add the variable in both **Production** and **Preview** environments if you need consistent behavior across deployments.

> ℹ️ The app does **not** use `NEXT_PUBLIC_PI_API_KEY`, `NEXT_PUBLIC_PI_APP_ID`, or `NEXT_PUBLIC_PI_SANDBOX` at this time. You only need to set them if you later integrate Pi SDK calls that require those identifiers.

### Pi Browser login

The project now includes a **server-side verification endpoint** for the Pi authentication payload at `POST /api/pi/verify` (App Router).

How it works:

1. The client calls `window.Pi.authenticate(...)` and posts the resulting `authResult` (which contains `accessToken`) to `/api/pi/verify`.
2. The API route uses your Pi API key to call Pi Network’s verification endpoint (`/v2/me`) and returns the verified user payload.
3. On success you can create a session/JWT in the response if you wish (currently the route only echoes the verified user).

Environment variables now used by the authentication flow:

| Name | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `PI_API_KEY` (preferred) or `NEXT_PUBLIC_PI_API_KEY` | Yes | Server | Secret key used by `/api/pi/verify` to validate Pi auth tokens. Keep this private and avoid exposing it to the client. |
| `NEXT_PUBLIC_PI_APP_ID` | Yes (for login) | Client/Server | Identifies your Pi app when initializing the Pi SDK. |
| `NEXT_PUBLIC_PI_SANDBOX` | No | Client/Server | Set to `true` when targeting the Pi sandbox environment. |
| `PI_API_BASE_URL` | No | Server | Override the Pi API base (defaults to Pi production; enable sandbox hosts if needed). |

> ℹ️ For security, prefer `PI_API_KEY` (without the `NEXT_PUBLIC_` prefix) so the key is only available on the server.

### Policy URLs

- Terms of Use: `/terms`
- Privacy Policy: `/privacy`

### Environment variables

The project works out-of-the-box, but you can expose optional variables for Pi validation or SDK initialization:

| Name | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_PI_VALIDATION_KEY` | No | Production/Preview | Alternative way to deliver the Pi validation string through the UI or an API route. Keep it in the Vercel dashboard and avoid hardcoding secrets. |
| `NEXT_PUBLIC_PI_APP_ID` | No | Production/Preview | Identifies your Pi app when initializing the Pi SDK in the Pi Browser. Use the ID issued by Pi Network. |

Add the variable in both **Production** and **Preview** environments if you need consistent behavior across deployments.

### Policy URLs

- Terms of Use: `/terms`
- Privacy Policy: `/privacy`

## Notes

- Exchange rates in the UI are illustrative placeholders; wire them to a real API for production.
- The layout emphasizes beginner-friendly copy and large touch targets for Pi Browser users.
- All text is written in English per your request and Pi platform expectations.
