# Easy Bill Project Documentation

## 1. Project Overview

Easy Bill is a full-stack web application for taxi and passenger-transport drivers. It lets an authenticated driver create professional ride invoices, preview the result immediately, save invoices to MongoDB, search an invoice archive, review earnings, share invoices, and configure payment and receipt branding.

The application has two independently runnable parts:

- **Frontend:** React 19 and Vite single-page application.
- **Backend:** Express 5 API using MongoDB through Mongoose.

The product is designed around a driver account. Saved driver details, invoices, QR payment images, and receipt logos are scoped to the authenticated driver.

## 2. Main Capabilities

### Authentication and account management

- Driver signup with name, email, password, and vehicle number.
- Driver login using email and password.
- Password hashing with `bcryptjs`.
- Seven-day JWT access tokens containing `driverId` and `role: driver`.
- Account deletion with cascading deletion of the driver's profile, QR code, and invoices.
- Client-side token and basic driver profile persistence in browser `localStorage`.

### Invoice creation

The New Bill screen supports:

- Passenger name.
- Driver name.
- Vehicle number.
- Pickup and drop locations.
- Distance in kilometres.
- Base fare in Indian rupees.
- GST percentage.
- Discount percentage.
- Payment mode: Cash, Card, or UPI QR.

The receipt preview updates as fields change. Driver and vehicle details can be loaded from the saved profile and edited when needed.

### Invoice calculations

The server is the source of truth for persisted totals:

```text
GST amount      = fare * GST rate / 100
Discount amount = fare * discount rate / 100
Total           = max(0, fare + GST amount - discount amount)
```

The stored `totals` object contains the original fare, rates, calculated amounts, and final total. Invalid or negative numeric values are normalized to zero by the calculation utility.

### Invoice archive

- Lists the authenticated driver's invoices newest first.
- Searches locally by passenger name or displayed date.
- Opens a detailed invoice dialog.
- Downloads a server-generated PDF for an invoice.
- Shares an invoice PDF where supported by the browser, with download fallback.
- Deletes an invoice manually.
- Supports authenticated date-range and passenger filtering at the API level.

Invoices normally expire automatically 60 days after creation through a MongoDB TTL index.

### Earnings dashboard

The dashboard requests aggregate data from `/reports` and displays:

- Total trips.
- Total collected.
- Average fare.
- Total fare before tax and discount.
- GST total.
- Discount total.
- Daily earnings series.
- Weekly earnings series.
- Monthly earnings series.

Reports can be filtered by `from` and `to` dates. The frontend renders the time series with Chart.js.

### Sharing

A driver can create a compact share token for a saved invoice. The share routes provide:

- Authenticated token creation.
- Authenticated WhatsApp URL generation.
- Public lookup of the shared invoice by token.

The public response contains formatted ride and payment information but does not expose the driver's account credentials or internal driver identifier.

### Payment QR and receipt branding

Each driver can save a UPI QR image and optionally display it when an invoice uses the `UPI QR` payment mode.

- QR formats: PNG and JPG.
- Maximum QR upload size: 2 MB.
- QR data is uploaded to Backblaze B2 and the resulting public object URL is stored in MongoDB.

Each driver can also manage a receipt logo:

- Logo formats: PNG, JPG, and SVG.
- Maximum logo upload size: 2 MB.
- Logo data is uploaded to Backblaze B2 and the resulting public object URL is stored in MongoDB.
- The logo appears in receipt previews and invoice exports.

## 3. Architecture

```text
Browser
  |
  | React UI, JWT in localStorage, fetch requests
  v
Vite frontend (frontend/)
  |
  | HTTP API requests with Authorization: Bearer <JWT>
  v
Express API (backend/)
  |-- Authentication and authorization
  |-- Invoice persistence and PDF generation
  |-- Reports and aggregation
  |-- Invoice share-token lookup
  |-- Driver profile and logo storage
  |-- Driver QR storage
  v
MongoDB Atlas
```

### Frontend architecture

`frontend/src/App.jsx` owns the application shell and shared state. It controls authentication, active navigation view, invoice form state, calculated totals, API calls, notifications, dialogs, and file export actions.

The larger views are lazy-loaded so the initial application bundle does not eagerly evaluate charting and export dependencies:

- `NewBill.jsx`: invoice form and live receipt workspace.
- `InvoiceList.jsx`: invoice archive, detail dialog, and invoice actions.
- `Dashboard.jsx`: KPIs and daily, weekly, and monthly charts.
- `QrSettings.jsx`: account, QR, and logo settings.
- `Login.jsx` and `Signup.jsx`: authentication screens.
- `SavedInvoiceModal.jsx`: post-save invoice confirmation/details.

Material UI supplies the component system. `App.css` and `index.css` provide responsive layout, receipt styling, and global presentation.

PDF and image export libraries are loaded dynamically on the first export action:

- `html2canvas` captures the receipt DOM.
- `jsPDF` creates downloadable PDF files.
- `pdfkit` generates server-side invoice PDFs from the API.

### Backend architecture

`backend/index.js` creates and configures the Express application. It loads `backend/.env`, configures CORS and JSON body limits, adds security response headers, registers route modules, connects to MongoDB, and starts the listener.

Route ownership:

- `routes/auth.js`: signup, login, and account deletion.
- `routes/invoice.js`: invoice CRUD, invoice PDF generation, and filtering.
- `routes/reports.js`: aggregate totals and time-series earnings.
- `routes/share.js`: compact share token and WhatsApp URL operations.
- `routes/profile.js`: saved driver details and logo operations.
- `routes/qr.js`: driver-scoped UPI QR operations.

Reusable backend logic:

- `middleware/requireDriver.js`: validates Bearer JWTs and attaches `request.user`.
- `utils/invoiceCalculations.js`: calculates normalized invoice totals.
- `scripts/backfill-invoice-driver-ids.js`: associates legacy invoices with drivers by vehicle number.

## 4. Repository Layout

```text
.
|-- package.json
|-- README.md
|-- PROJECT_DOCUMENTATION.md
|-- project_plan.txt
|-- generateToken.cjs
|-- vercel.json
|-- backend/
|   |-- index.js
|   |-- generateToken.js
|   |-- middleware/
|   |   `-- requireDriver.js
|   |-- models/
|   |   |-- Driver.js
|   |   |-- DriverProfile.js
|   |   |-- DriverQr.js
|   |   |-- Invoice.js
|   |   `-- ...
|   |-- routes/
|   |   |-- auth.js
|   |   |-- invoice.js
|   |   |-- profile.js
|   |   |-- qr.js
|   |   |-- reports.js
|   |   `-- share.js
|   |-- scripts/
|   |   `-- backfill-invoice-driver-ids.js
|   `-- utils/
|       |-- invoiceCalculations.js
|       `-- money.js
`-- frontend/
    |-- index.html
    |-- vite.config.js
    |-- public/
    `-- src/
        |-- App.jsx
        |-- App.css
        |-- index.css
        |-- main.jsx
        |-- components/
        `-- utils/format.js
```

The root package scripts run both the frontend build and backend server from the repository root. Vite is configured with the frontend directory as its root.

## 5. Data Models

### Driver

Collection: `drivers`

| Field | Type | Rules |
|---|---|---|
| `driverName` | String | Required, trimmed |
| `email` | String | Required, lowercase, unique |
| `password` | String | Required, excluded from normal queries; stores a bcrypt hash |
| `vehicleNumber` | String | Required, uppercase, unique |
| `createdAt`, `updatedAt` | Date | Mongoose timestamps |

### DriverProfile

Collection: `driverprofiles`

| Field | Type | Rules |
|---|---|---|
| `driverId` | String | Required, unique index |
| `driverName` | String | Required, trimmed |
| `vehicleNumber` | String | Required, uppercase, unique |
| `logoData` | String | Optional public HTTPS object URL |
| `logoMimeType` | String | PNG, JPG, SVG, or empty |
| `logoSize` | Number | Maximum 2 MB |
| `createdAt`, `updatedAt` | Date | Mongoose timestamps |

### DriverQr

Collection: `driverqrs`

| Field | Type | Rules |
|---|---|---|
| `driverId` | String | Required, unique index |
| `imageData` | String | Required public HTTPS object URL |
| `mimeType` | String | PNG or JPG |
| `size` | Number | Maximum 2 MB |
| `createdAt`, `updatedAt` | Date | Mongoose timestamps |

### Invoice

Collection: `invoices`

| Field | Type | Rules |
|---|---|---|
| `passengerName` | String | Required |
| `driverId` | String | Driver owner identifier |
| `driverName` | String | Required |
| `vehicleNumber` | String | Required |
| `pickup`, `drop` | String | Required |
| `distance` | Number | Required, minimum 0 |
| `fare` | Number | Required, minimum 0 |
| `gst` | Number | Default 0, minimum 0 |
| `discount` | Number | Default 0, minimum 0 |
| `paymentMode` | String | Defaults to `Cash` |
| `totals` | Object | Required calculated values |
| `shareToken` | String | Sparse unique indexed token |
| `expiresAt` | Date | Defaults to 60 days from creation; TTL index |
| `createdAt`, `updatedAt` | Date | Mongoose timestamps |

Indexes support driver/date archive queries and driver/passenger searches.

## 6. API Reference

Unless marked public, endpoints require:

```http
Authorization: Bearer <driver-jwt>
```

### Authentication

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/auth/signup` | Public | Create a driver and initial profile |
| `POST` | `/auth/login` | Public | Verify credentials and return a seven-day JWT |
| `DELETE` | `/auth/delete-account` | Driver | Delete account and owned data |

Signup requires `driverName`, `email`, `password`, and `vehicleNumber`. Passwords must be at least six characters. Duplicate email and vehicle numbers return `409`.

### Invoices

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/invoice` | Driver | Validate, calculate, and save an invoice |
| `GET` | `/invoice` | Driver | List owned invoices newest first |
| `GET` | `/invoice/list` | Driver | List owned invoices with the same filtering behavior |
| `GET` | `/invoice/:id` | Driver | Return one owned invoice in the formatted contract |
| `GET` | `/invoice/:id/pdf` | Driver | Stream a server-generated PDF |
| `DELETE` | `/invoice/:id` | Driver | Delete one owned invoice |

Invoice list query parameters:

- `from`: inclusive start date.
- `to`: inclusive end date; the endpoint includes the full day through 23:59:59.999.
- `passenger`: case-insensitive passenger-name search.

Required invoice fields are `passengerName`, `driverName`, `vehicleNumber`, `pickup`, `drop`, `distance`, and `fare`. `driverId` is assigned from the verified token rather than accepted as the owner identity from the client.

### Reports

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/reports` | Driver | Return totals and daily, weekly, and monthly earnings |

Supported query parameters are `from` and `to`. Every report is restricted to the authenticated driver's invoices.

Example response shape:

```json
{
  "from": null,
  "to": null,
  "invoiceCount": 12,
  "totalFare": 12000,
  "totalGst": 600,
  "totalDiscount": 100,
  "totalCollected": 12500,
  "daily": [{ "period": "2026-08-23", "earnings": 1250, "trips": 1 }],
  "weekly": [{ "period": "2026-W34", "earnings": 6500, "trips": 6 }],
  "monthly": [{ "period": "2026-08", "earnings": 12500, "trips": 12 }]
}
```

### Driver profile and branding

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/profile` | Driver | Load saved driver details and logo metadata/data |
| `POST` | `/profile/save` | Driver | Save driver name and vehicle number |
| `DELETE` | `/profile/clear` | Driver | Remove the saved profile |
| `POST` | `/profile/logo` | Driver | Save or replace a logo |
| `DELETE` | `/profile/logo` | Driver | Delete the saved logo |

### QR payment image

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/qr` | Driver | Load the driver's QR image |
| `POST` | `/qr/save` | Driver | Save or replace the driver's QR image |

### Sharing

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/share/:id` | Driver | Create or reuse an invoice share token |
| `GET` | `/share/:token` | Public | Fetch a shared invoice representation |
| `GET` | `/share/:id/whatsapp` | Driver | Build a WhatsApp URL and share link |

### Service health

| Method | Path | Auth | Response |
|---|---|---|---|
| `GET` | `/` | Public | JSON service status |
| `GET` | `/health` | Public | Plain-text `OK` with status 200 |

## 7. Authentication and Data Isolation

1. The user signs up or logs in through the frontend.
2. The API returns a JWT containing the driver's identifier and driver role.
3. The frontend stores the token under `easybill_driver_token` in `localStorage`.
4. Authenticated requests send the token in the Bearer header.
5. `requireDriver` verifies the token with `JWT_SECRET`.
6. Route handlers use `request.user.driverId` for profile, QR, invoice, and report queries.
7. Invoice detail, PDF, delete, and share operations verify that the invoice belongs to the authenticated driver.

The frontend should treat a missing, expired, or invalid token as a signed-out state. A token generated by `backend/generateToken.js` is useful for local profile/API testing, but normal application login tokens are issued by `/auth/login`.

## 8. Environment Configuration

### Backend

Create `backend/.env` from the backend example file and provide:

```env
MONGO_URI=<MongoDB Atlas connection string>
JWT_SECRET=<long random signing secret>
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
PORT=5000
```

The backend accepts `MONGO_URI` and maintains compatibility with `MONGODB_URI`. It loads the environment file from `backend/.env`; a root `.env` is not the normal backend configuration location.

`CLIENT_ORIGIN` may contain comma-separated origins, for example:

```env
CLIENT_ORIGIN=http://localhost:5173,https://your-frontend.example
```

Never commit real MongoDB credentials, JWT secrets, or generated driver tokens.

### Frontend

Create `frontend/.env` for local development:

```env
VITE_API_URL=http://localhost:5000
VITE_PUBLIC_API_URL=http://localhost:5000
```

The frontend resolves the API URL from `REACT_APP_API_URL`, then `VITE_API_URL`, then defaults to `http://localhost:5000`.

For production, both public API variables should point to the deployed backend. Do not leave `localhost` in production values.

## 9. Local Development

Prerequisites:

- Node.js with npm.
- A reachable MongoDB Atlas database or compatible MongoDB instance.
- A configured backend `.env`.

Install dependencies:

```powershell
npm install
```

Start the frontend:

```powershell
npm run dev
```

Start the backend in a second terminal:

```powershell
npm run server
```

The default local URLs are:

- Frontend: `http://localhost:5173`
- API: `http://localhost:5000`
- Health check: `http://localhost:5000/health`

Available scripts:

| Script | Purpose |
|---|---|
| `npm run dev` | Start Vite using `frontend/vite.config.js` |
| `npm run server` | Start the Express API |
| `npm run server:watch` | Start the API with Node watch mode |
| `npm run build` | Build the frontend for production |
| `npm run preview` | Preview the frontend build |
| `npm run lint` | Run Oxlint against frontend and backend |
| `npm run token -- driverId=123 role=driver` | Generate a 24-hour test JWT |
| `npm run backfill:invoice-driver-ids` | Dry-run legacy invoice ownership backfill |
| `npm run backfill:invoice-driver-ids -- --apply` | Apply the backfill |

## 10. Deployment

### Frontend

`vercel.json` configures the Vercel build:

- Install command: `npm ci`.
- Build command: `npm run build`.
- Output directory: `frontend/dist`.
- Framework: Vite.

Set `VITE_API_URL` and `VITE_PUBLIC_API_URL` to the deployed backend URL in the hosting provider's environment settings.

### Backend

The backend can run as a Node service using:

```text
Build command: npm install
Start command: npm run server
```

Configure `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, and `NODE_ENV` in the hosting provider. The current worktree does not contain the previously referenced `render.yaml`, so the hosting service settings should be verified directly in the deployment provider.

The API health endpoint is suitable for uptime monitoring. A keep-alive workflow may ping `/health` periodically when configured with a `BACKEND_URL` secret.

## 11. Security and Operational Notes

- `x-powered-by` is disabled.
- Responses include `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` headers.
- CORS allows configured origins and rejects unlisted browser origins.
- Passwords are never returned from normal driver queries.
- Invoice ownership is derived from the verified JWT, not from a client-supplied driver ID.
- Share links are intentionally public to support passenger access. Treat a share token as a bearer credential.
- QR and logo images are stored in Backblaze B2; MongoDB stores only their public object URLs.
- Invoice TTL cleanup depends on MongoDB's TTL monitor and is not an immediate deletion guarantee at the exact expiration timestamp.
- The current implementation has no automated browser test suite in the repository. Manual validation should cover signup/login, invoice save, archive actions, dashboard filters, QR display, exports, and public sharing.

## 12. Legacy Invoice Backfill

Older invoices may not have a `driverId`. The backfill script uses the exact stored `vehicleNumber` as the ownership key because it is already present on invoices and is unique across driver profiles.

Recommended process:

1. Confirm `MONGO_URI` is configured.
2. Run the script without `--apply` and inspect the dry-run output.
3. Confirm the number of matched and unmatched invoices.
4. Run again with `--apply` only when the matches are correct.
5. Validate invoice listing and reports for the affected driver.

## 13. Typical User Workflows

### Create and save a ride bill

1. Log in as a driver.
2. Open New Bill.
3. Confirm or edit the saved driver and vehicle details.
4. Enter passenger, route, distance, fare, GST, discount, and payment mode.
5. Review the live receipt and calculated total.
6. Save the invoice.
7. Use the success dialog to download or share the result.

### Use UPI QR payment

1. Open Settings.
2. Upload a PNG or JPG QR image no larger than 2 MB.
3. Create a new bill.
4. Select `UPI QR` as the payment mode.
5. Open the QR preview from the bill form.
6. Export or share the receipt after saving.

### Review historical earnings

1. Open Dashboard.
2. Set optional start and end dates.
3. Refresh the report.
4. Review the KPI values and daily, weekly, or monthly chart.

### Share an invoice

1. Save an invoice.
2. Open it from the Invoice Archive, or use the saved invoice actions.
3. Choose WhatsApp/link sharing or PDF sharing.
4. The recipient can open the public share URL without a driver login.

## 14. Validation Checklist

Run the project checks from the repository root:

```powershell
npm run build
npm run lint
```

Then verify the runtime manually:

- `GET /health` returns `OK`.
- Signup rejects missing or invalid fields.
- Login returns a token for valid credentials.
- An unauthenticated invoice request returns `401`.
- A saved invoice contains server-calculated totals and an expiration date.
- A driver cannot read, delete, or share another driver's invoice.
- Date filters include the complete `to` date.
- Reports only include the authenticated driver's invoices.
- QR and logo format and size limits are enforced.
- Public share lookup returns a formatted invoice and does not require the driver JWT.
- Frontend exports work in supported browsers and retain download fallbacks.

## 15. Future Improvements

Potential next steps documented by the project plan include:

- Automated browser tests for form entry, invoice saving, exports, and sharing.
- Persistent local draft recovery for unfinished bills.
- Configurable business name, tax rules, and bill numbering.
- A more explicit public share page and share-token lifecycle controls.
- Private object storage with signed URLs if public asset URLs become unsuitable.
- Structured API error types and centralized request validation.
- Production observability, rate limiting, and audit logging.
