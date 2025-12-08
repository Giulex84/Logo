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

The Pi validation key lives at `public/.well-known/pi-validation.txt`. Replace the placeholder with the official key you receive. After deployment, confirm it is reachable at `https://<your-domain>/.well-known/pi-validation.txt`.

If you prefer environment variables, expose `NEXT_PUBLIC_PI_VALIDATION_KEY` in Vercel and extend the UI or an API route to read it.

## Deployment to Vercel

1. Push this repository to your Git provider.
2. Create a new Vercel project and import the repo.
3. Use the default **Next.js** framework preset.
4. Add any environment variables (e.g., `NEXT_PUBLIC_PI_VALIDATION_KEY`) in **Project Settings → Environment Variables**.
5. Trigger a deploy; Vercel will build using `npm run build` and serve the optimized app.

## Notes

- Exchange rates in the UI are illustrative placeholders; wire them to a real API for production.
- The layout emphasizes beginner-friendly copy and large touch targets for Pi Browser users.
- All text is written in English per your request and Pi platform expectations.
