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

### What’s missing for Pi Browser login

This demo does **not** implement Pi authentication. To let Pioneers log in with the Pi Browser you’ll need to:

1. Initialize the already-loaded Pi JavaScript SDK (`window.Pi`) with your Pi App ID on the client.
2. Provide configuration values (e.g., `NEXT_PUBLIC_PI_APP_ID`, `NEXT_PUBLIC_PI_API_KEY`, and `NEXT_PUBLIC_PI_SANDBOX` if testing) so the SDK can request login.
3. Build a secure backend endpoint that verifies the Pi authentication payload and issues a session for your app.
4. Allowlist your deployed domain in the Pi developer console so login calls from Pi Browser are accepted.

### Policy URLs

- Terms of Use: `/terms`
- Privacy Policy: `/privacy`

## Notes

- Exchange rates in the UI are illustrative placeholders; wire them to a real API for production.
- The layout emphasizes beginner-friendly copy and large touch targets for Pi Browser users.
- All text is written in English per your request and Pi platform expectations.
