# IoT GDPR Healthcare (Azure Static Web Apps compatible)

This project provides a complete Node.js/Express API under `/api` and a static frontend at repository root (`index.html`, `app.js`, `styles.css`).

## Features

- Email login with JWT-based authentication.
- Role model:
  - Default admin email: `22004249@st.vlute.edu.vn`
  - There is no hard-coded default admin password. On first successful login with the default admin email, the submitted password becomes that account password.
  - Any other email defaults to role `user`
  - Admin can promote users to admin.
- Auth + role middleware for protected endpoints.
- Sensor ingestion:
  - HTTP endpoint (`POST /api/sensors/ingest`)
  - MQTT subscriber ingestion (broker/topic via env)
- Daily sensor summary endpoint.
- Daily email summary scheduler (Asia/Ho_Chi_Minh timezone), idempotent per user/day.
- Admin manual trigger for daily emails.
- JSON-file persistence fallback (`data/store.json`).

## API Endpoints

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users` (admin)
- `POST /api/users/:id/promote` (admin)
- `POST /api/sensors/ingest` (protected)
- `GET /api/sensors/daily-summary` (user/admin scoped)
- `POST /api/admin/send-daily-emails` (admin manual trigger)

## Environment Configuration

Copy `.env.example` to `.env` and adjust:

```bash
cp .env.example .env
```

Important variables:

- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `DEFAULT_ADMIN_EMAIL`
- `MQTT_BROKER_URL`, `MQTT_TOPIC`, `MQTT_USERNAME`, `MQTT_PASSWORD`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `TZ=Asia/Ho_Chi_Minh`, `DAILY_EMAIL_HOUR`, `DAILY_EMAIL_MINUTE`
- `DATA_FILE` (JSON persistence path)

## Run locally

```bash
npm install
npm test
npm start
```

Open `http://localhost:4280`.

## Azure Static Web Apps deployment

Repository layout is compatible with Azure SWA using:

- Static frontend: `/`
- API: `/api`
- Routing/security headers: `staticwebapp.config.json`

Typical SWA settings:

- **App location**: `/`
- **API location**: `/api`
- **Output location**: *(leave empty for static files at root)*

Set all required environment variables in Azure Static Web Apps Configuration.

## GDPR-minded retention configuration

No plaintext secrets are hard-coded. Configure retention operationally by periodically deleting old entries from JSON store or external DB. Recommended policy (adjust for compliance):

- Sensor records: retain 30-90 days.
- Daily email logs: retain 180 days to preserve idempotency audit trail.
- Rotate `JWT_SECRET`, MQTT, and SMTP credentials regularly.
