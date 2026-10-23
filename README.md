# Easy Bill

Easy Bill is a full-stack taxi bill generator. Drivers create invoices, manage saved driver and payment details, and review earnings.

## Stack

- Frontend: React 19, Vite, Material UI, Chart.js, html2canvas, jsPDF
- Backend: Node.js, Express 5, Mongoose
- Authentication: IBM Cloud App ID (OpenID Connect)
- Database: MongoDB Atlas
- File storage: Backblaze B2
- Hosting: Render for the backend, Vercel for the frontend
- Image scanning and deployment: Trivy and GitHub Actions

## Local setup

```powershell
npm install
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Create an IBM Cloud App ID service instance and a **Single Page Application (SPA)** client:

1. Enable the identity provider you want users to sign in with.
2. Register the local frontend origin (`http://localhost:5173`) and the deployed Vercel origin/redirect URI in App ID.
3. Copy the SPA client ID and discovery endpoint into both environment files. The client ID and discovery endpoint are public configuration; do not add an App ID client secret to the frontend.

Set `MONGO_URI`, `APPID_CLIENT_ID`, `APPID_DISCOVERY_ENDPOINT`, the Backblaze B2 settings, `CLIENT_ORIGIN=http://localhost:5173`, and `NODE_ENV=development` in `backend/.env`. For frontend development, set `VITE_API_URL=http://localhost:5000` and `VITE_PUBLIC_API_URL=http://localhost:5000` in `frontend/.env`, along with `VITE_APPID_CLIENT_ID` and `VITE_APPID_DISCOVERY_ENDPOINT`.

The backend reads `backend/.env`; the frontend reads `frontend/.env`.

Run the frontend and API in separate terminals:

```powershell
npm run dev
npm run server
```

The frontend runs at `http://localhost:5173` and the API at `http://localhost:5000`.

## How App ID sign-in works

1. The React app uses IBM's App ID JavaScript SDK to start sign-in and receive an access token and identity token.
2. The app sends both tokens to the API using `Authorization: Bearer <access-token> <identity-token>`.
3. The API reads App ID's OpenID discovery document, verifies the tokens' signatures, issuer, audience, and required scope, then uses the verified identity subject (`sub`) to find the driver's MongoDB account.
4. On first sign-in, the driver enters their name and vehicle number. Easy Bill saves the driver and profile in MongoDB with the App ID subject. Future sign-ins find that same record, so the driver's saved profile and invoices remain associated with the account.
5. Tokens live in browser `sessionStorage` and are cleared when the tab session ends. The user's driver profile and invoices remain in MongoDB.

Existing password-based accounts are not linked or migrated. They cannot sign in through the new flow; their existing database records are left untouched.

The authentication endpoints are:

- `POST /auth/session`: validate App ID tokens and find or create the driver's account/profile.
- `DELETE /auth/delete-account`: delete the authenticated driver account and its related MongoDB records.

All invoice, earnings, profile, and QR endpoints require valid App ID tokens.

## Production deployment

### Render backend

The repository now has a root `Dockerfile`. Configure the existing Render web service to use the Docker runtime and keep the repository root as its source. Set these environment variables in Render:

```env
MONGO_URI=<your_mongo_connection_string>
APPID_CLIENT_ID=<your_app_id_spa_client_id>
APPID_DISCOVERY_ENDPOINT=<your_app_id_discovery_endpoint>
CLIENT_ORIGIN=https://your-site.vercel.app
NODE_ENV=production
B2_ENDPOINT=<your_backblaze_endpoint>
B2_REGION=<your_backblaze_region>
B2_APPLICATION_KEY_ID=<your_backblaze_key_id>
B2_APPLICATION_KEY=<your_backblaze_application_key>
B2_BUCKET_NAME=<your_backblaze_bucket_name>
```

For local development and production together, set `CLIENT_ORIGIN` to the comma-separated origins `http://localhost:5173,https://your-site.vercel.app`. Keep database and Backblaze secrets in Render's environment settings, not in Git.

### Vercel frontend

Keep the existing repository-root build setup:

- Build command: `npm run build`
- Publish directory: `frontend/dist`

Set `VITE_API_URL`, `VITE_PUBLIC_API_URL`, `VITE_APPID_CLIENT_ID`, and `VITE_APPID_DISCOVERY_ENDPOINT` in Vercel. Use the deployed Render URL for the API values; do not use `localhost` in production.

### Build, scan, deploy workflow

`.github/workflows/build-scan-deploy.yml` runs lint and the frontend production build, builds the backend Docker image, and scans it with Trivy. Pull requests run the checks but do not deploy. A push to `main` deploys only after both build and image scan pass.

1. In Render, configure the backend service to deploy from the Dockerfile and turn off automatic Git-based deploys.
2. In Vercel, prevent automatic Git deployments from deploying production changes before GitHub Actions passes.
3. Create a Render deploy hook and a Vercel deploy hook for the production branch. Add them as repository Actions secrets named `RENDER_DEPLOY_HOOK` and `VERCEL_DEPLOY_HOOK`.
4. Push to `main`. GitHub Actions triggers both hosts only after the frontend build and Trivy scan succeed.

The Trivy gate fails for fixable `HIGH` and `CRITICAL` image vulnerabilities. The workflow ignores vulnerabilities with no available fix; inspect scan output and update affected packages/base images as fixes become available.

## Other repository workflows

- `GET /health` is the backend health check.
- `.github/workflows/keepalive.yml` pings the backend on a schedule. It uses the repository secret `BACKEND_URL`.
- `npm run backfill:invoice-driver-ids` previews the old invoice backfill. Add `-- --apply` to perform the write.

## Validation

```powershell
npm run lint
npm run build
```
