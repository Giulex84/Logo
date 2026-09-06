# Arena — Pi Mainnet hardening build

This revision follows the current Pi developer architecture: Pi SDK on the frontend, `/v2/me` verification on the backend, Server API Key only on the backend, and U2A approval/completion performed server-side.

## Important changes

- `Pi.init({ version: "2.0", sandbox: false })` is explicit for production.
- Authentication requests only `username` and `payments` because Arena does not currently use wallet address.
- The `accessToken` returned by `Pi.authenticate()` is verified by `/api/auth/verify`, which calls Pi `/v2/me`.
- Premium payment approval and completion validate the payment against the verified Pi UID, fixed amount (`1 Pi`) and fixed product metadata.
- Premium is granted only after Pi reports both server completion and transaction verification.
- Incomplete U2A payments are recovered server-side by looking up the payment with the Server API Key; the callback does not trust client UID/metadata.
- The old client-controlled A2U `0.3 Pi` combo reward endpoint has been removed. Triple combo now gives gameplay points only. This avoids offering a Mainnet A2U payout while A2U availability/review is restricted.
- Paid entitlement is no longer trusted from `localStorage`; it is stored server-side by verified Pi UID.
- Wildcard CORS was removed and baseline security headers were added.
- Privacy Policy and Terms were updated to match actual data/payment behavior.

## Required production environment variables

Copy `.env.example` values into your deployment provider:

- `PI_API_KEY`: your existing Mainnet Server API Key from Pi Developer Portal.
- `ARENA_KV_KV_REST_API_URL` and `ARENA_KV_KV_REST_API_TOKEN` (created automatically by Vercel/Upstash when using the `ARENA_KV` custom prefix): server-side Redis-compatible REST KV credentials.

If the entitlement store is not configured, login/gameplay still work but the Premium purchase button is disabled. This is intentional: Arena should not accept a payment if it cannot reliably persist the purchased entitlement.

## Deploy safely

1. Keep the existing Pi Developer Portal app, domain, PiNet subdomain, validation key and wallet applications. Do **not** recreate the Mainnet app merely to deploy this code.
2. Configure the three server-only environment variables above.
3. Deploy to the same verified production domain.
4. Confirm `https://YOUR_DOMAIN/validation-key.txt` still returns the existing validation key.
5. Open the production URL inside Pi Browser and sign in.
6. Test a Premium U2A purchase with a controlled account only after the KV store is configured.
7. Verify that a successful purchase stays Premium after reloading and signing back in.

## About A2U rewards

The prior implementation accepted a UID and amount from the browser and created an A2U payment directly. That is unsafe and has been removed. The current Pi documentation states that A2U is restricted (the launch docs describe selected Mainnet apps; the advanced-payments page still describes Testnet-only availability). Do not re-enable Mainnet A2U rewards until your app is explicitly authorized and the reward eligibility itself is enforced server-side with durable anti-replay state.

## Reference documentation reviewed

- Pi Developer Documentation (current consolidated docs announced September 4, 2026)
- Authentication guide and `/v2/me`
- Build an App end-to-end flow
- Payments / Platform API
- Common Mistakes
- Launching on Pi Mainnet
- Advanced Payments

No code change can guarantee Pi Core Team approval; review and wallet authorization remain Pi Network decisions.
