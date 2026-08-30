# Easy Bill

Full-stack taxi bill generator with a React and Material UI frontend and an Express/MongoDB Atlas API.

## Stack

- Frontend: React 19, Vite, Material UI, Chart.js, html2canvas, jsPDF
- Backend: Node.js, Express 5, Mongoose, JSON Web Tokens, CORS
- Database: MongoDB Atlas
- Hosting: Render for the backend, Netlify for the frontend

## Structure

- `frontend/`: Vite React bill form, invoice archive, earnings dashboard, receipt preview, PDF/image export, and WhatsApp sharing.
- `backend/`: Express routes, Mongoose invoice model, calculations, time-series reporting, profile storage, and TTL cleanup.

## Local Setup

```powershell
npm install
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Set these values in `backend/.env`:

- `MONGO_URI` - your MongoDB Atlas connection string
- `JWT_SECRET` - a long random secret used to sign driver tokens
- `CLIENT_ORIGIN` - `http://localhost:5173` for local development
- `NODE_ENV` - `development`

The backend reads `backend/.env`. It does not use a root-level `.env` file.

For local frontend development, set `frontend/.env` like this:

```env
VITE_API_URL=http://localhost:5000
VITE_PUBLIC_API_URL=http://localhost:5000
```

Then run:

```powershell
npm run dev
npm run server
```

The frontend runs on `http://localhost:5173` and the API runs on `http://localhost:5000`.

## Production Deployment

### Render backend

Use the repository root as the project source and set:

- Build command: `npm install`
- Start command: `npm run server`

Set these Render environment variables:

```env
MONGO_URI=<your_mongo_connection_string>
JWT_SECRET=<your_jwt_secret>
CLIENT_ORIGIN=https://invoice-generator-auramen.netlify.app
NODE_ENV=production
```

If you want to allow local development and the deployed frontend at the same time, use:

```env
CLIENT_ORIGIN=http://localhost:5173,https://invoice-generator-auramen.netlify.app
```

### Netlify frontend

Use the repository root as the project source and set:

- Build command: `npm run build`
- Publish directory: `frontend/dist`

Set these Netlify environment variables:

```env
VITE_API_URL=https://invoice-generator-project-p8s5.onrender.com
VITE_PUBLIC_API_URL=https://invoice-generator-project-p8s5.onrender.com
```

Do not use `localhost` in production frontend env values.

## Health Check and Keep-Alive

The backend exposes:

- `GET /health` - returns `200 OK`

A GitHub Actions workflow pings the backend every 5 minutes to reduce Render sleep time:

- Workflow file: [`.github/workflows/keepalive.yml`](.github/workflows/keepalive.yml)
- GitHub secret required: `BACKEND_URL`
- Secret value: `https://invoice-generator-project-p8s5.onrender.com`

## Generate a Driver JWT

Driver authentication uses JWTs signed with `JWT_SECRET`.

Generate a token with:

```powershell
npm run token -- driverId=123 role=driver
```

The returned token can be used in `Authorization: Bearer <token>` requests.

## API

- `POST /auth/signup`: create a driver account
- `POST /auth/login`: sign in and receive a driver JWT
- `DELETE /auth/delete-account`: delete the authenticated driver account and related data
- `POST /invoice`: create and persist an invoice
- `GET /invoice/:id`: fetch one invoice
- `GET /invoice`: list invoices, newest first
- `DELETE /invoice/:id`: delete an invoice
- `GET /reports`: return invoice count, aggregate totals, and daily/weekly/monthly earnings series
- `POST /share/:id`: create or reuse a compact share token for an invoice
- `GET /share/:token`: fetch an invoice using its compact share token
- `GET /health`: service health check
- `GET /profile`: fetch the authenticated driver's saved name and vehicle
- `POST /profile/save`: save or update the authenticated driver's name and vehicle
- `DELETE /profile/clear`: clear the authenticated driver's saved profile

Invoices receive an `expiresAt` value 60 days after creation and are removed by MongoDB's TTL index.

## Driver Profile Behavior

When a driver signs up, the backend also creates a saved driver profile. The create-ride-bill page uses that saved name and vehicle number by default, and the user can still edit them before saving a bill.

Profile routes require `Authorization: Bearer <driver-jwt>`. Driver profiles are scoped to the JWT `driverId`, and vehicle numbers remain unique across profiles.

## Backfill Old Invoices

If you have older invoices with a missing `driverId`, run the backfill helper. It first performs a dry run and only writes changes when you pass `--apply`:

```powershell
npm run backfill:invoice-driver-ids
npm run backfill:invoice-driver-ids -- --apply
```

The script matches invoices to drivers by exact `vehicleNumber`, which is the safest stable key already stored on the invoice.

## Validation

```powershell
npm run build
npm run lint
```
