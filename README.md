# F.R.I.D.A.Y. Tactical HUD

Independent React/Vite frontend for the F.R.I.D.A.Y. backend. It has its own
package manifest and deployment configuration and does not import Python
backend files.

## Requirements

- Node.js 18 or newer
- A running F.R.I.D.A.Y. backend for authenticated live data and voice

## Local setup

From this directory:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open the URL Vite prints (normally `http://localhost:5173`). In the HUD choose
**CONNECT**, enter the backend API token, and optionally provide a signed
speaker token and Master Passphrase. A Master Passphrase is kept in memory only
and is cleared when the page is reloaded or the HUD is locked.

The WebSocket browser API does not permit custom Authorization headers. The
backend's existing token query parameter is used for WebSocket connections;
remote deployments must use HTTPS/WSS. Do not expose a production API token in
a public or shared browser.

## Build and preview

```powershell
npm run build
npm run preview
```

The production bundle is written to `dist/`.

## Independent Vercel deployment

1. Push this `Front End` directory as the root of its own GitHub repository
   (or configure the Vercel project root to `Front End` in the existing repo).
2. Import that repository into Vercel.
3. Keep the framework preset as **Vite**; build command `npm run build`; output
   directory `dist`.
4. Add `VITE_API_BASE_URL` as the backend HTTPS origin, for example
   `https://friday-core.onrender.com`.
5. Add `VITE_WS_BASE_URL` as its WebSocket origin, for example
   `wss://friday-core.onrender.com`.
6. Deploy. Set equivalent environment variables for local preview and
   production environments as needed.

Netlify works with the same build command and publish directory. The backend
must separately allow the deployed frontend origin in its CORS/WebSocket
configuration.

## Backend integration boundaries

The HUD reads the existing `/api/robotics/status`, `/api/robotics/plan`,
`/api/robotics/waypoints`, `/api/defense/threats/active`,
`/api/defense/incidents`, and `/api/twin/status` routes, and consumes
`/ws/live` and `/ws/telemetry`. The current backend does not expose a
`/api/robotics/navigate` route or general host CPU/battery metrics. Map clicks
therefore request an A* plan only and never actuate a vehicle. Normal physical
commands are sent through `/api/chat-text` and remain governed by backend role,
confirmation, and Digital Twin checks.

Threat and incident views require the backend's verified Master speaker token
and Master Passphrase. Selecting a role in the interface is a display
preference; it does not grant backend authority. The circuit viewport is a
standalone visualizer and returns to the dashboard locally.
