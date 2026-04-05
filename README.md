# IoT GDPR Healthcare (Azure Static Web Apps compatible)

This project provides a complete Node.js/Express API under `/api` and a static frontend at repository root (`index.html`, `app.js`, `styles.css`).

## Features

- Email login with JWT-based authentication.
- Role model:
  - Default admin email: `22004249@st.vlute.edu.vn`
  - Any other email defaults to role `user`
  - Admin can promote users to admin.
- Auth + role middleware for protected endpoints.
- Sensor ingestion:
  - HTTP endpoint (`POST /api/sensors/ingest`)
  - MQTT subscriber ingestion (broker/topic via env)
- **Per-user telemetry via MQTT (Wokwi / ESP32 devices):**
  - Each user generates a private device token (rotatable).
  - Devices publish JSON messages to MQTT; server maps token → user and persists data under `data/telemetry/{userId}.json`.
  - Atomic writes prevent file corruption.
- Daily sensor summary endpoint.
- Daily email summary scheduler (Asia/Ho_Chi_Minh timezone), idempotent per user/day.
- Admin manual trigger for daily emails.
- JSON-file persistence (`data/store.json`, per-user `data/telemetry/`).

## API Endpoints

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users` (admin)
- `POST /api/users/:id/promote` (admin)
- `POST /api/sensors/ingest` (protected)
- `GET /api/sensors/daily-summary` (user/admin scoped)
- `POST /api/admin/send-daily-emails` (admin manual trigger)
- `POST /api/telemetry/token` — create or rotate device token (JWT required)
- `GET /api/telemetry/token` — retrieve current device token + MQTT connection info (JWT required)
- `GET /api/telemetry` — retrieve latest telemetry records for the authenticated user (JWT required, `?limit=N`)

## Environment Configuration

Copy `.env` and adjust variables for JWT, MQTT, SMTP, and timezone settings.

Important variables:

- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `DEFAULT_ADMIN_EMAIL`
- `MQTT_BROKER_URL` (default: `mqtt://test.mosquitto.org`)
- `MQTT_TELEMETRY_TOPIC` (default: `iot/gdpr/telemetry`)
- `MQTT_TOPIC` — optional legacy topic
- `MQTT_USERNAME`, `MQTT_PASSWORD` — leave empty for test.mosquitto.org
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

## Wokwi / ESP32 IoT Device Setup

Follow these steps to connect a simulated (or real) ESP32 to the dashboard using [Wokwi](https://wokwi.com/).

### 1. Recommended sensors in Wokwi

| Sensor | Wokwi Part | Readings published |
|--------|------------|--------------------|
| DHT22 | `wokwi-dht22` | `temperature` (°C), `humidity` (%) |
| MAX30102 (simulated via potentiometers) | manual | `heartRate` (bpm), `spo2` (%) |

### 2. MQTT broker

Use the **free public broker** `test.mosquitto.org` (no account required):

| Setting | Value |
|---------|-------|
| Host | `test.mosquitto.org` |
| Port (plain) | `1883` |
| Port (TLS) | `8883` |
| Authentication | None required |

### 3. Topic format

All devices publish to a **single shared topic**:

```
iot/gdpr/telemetry
```

The backend identifies the user by a `deviceToken` field **inside the payload**.

### 4. Payload JSON shape

```json
{
  "deviceToken": "<your-device-token>",
  "deviceId":    "esp32-wokwi-1",
  "temperature": 36.8,
  "humidity":    55.2,
  "heartRate":   75,
  "spo2":        98,
  "timestamp":   "2025-01-15T08:30:00Z"
}
```

All sensor fields are optional but at least one should be present. `timestamp` is optional (server will use current time if omitted).

### 5. Generate your device token

1. Log in to the dashboard at `http://localhost:4280` (or your deployment URL).
2. In the **IoT Device Setup** card, click **Generate / Rotate Token**.
3. Copy the token displayed and paste it into your Wokwi sketch.

### 6. Wokwi sketch

A ready-to-use ESP32 Arduino sketch is provided in [`wokwi.txt`](./wokwi.txt).

> **Note:** Wokwi's typical sketch filename is `sketch.ino`. Because this repository stores it as `wokwi.txt`, follow these steps:
> 1. Open [https://wokwi.com/projects/new/esp32](https://wokwi.com/projects/new/esp32)
> 2. Click the **sketch.ino** tab.
> 3. Select all existing code and delete it.
> 4. Open `wokwi.txt` from this repository, copy all its content.
> 5. Paste into the Wokwi sketch editor.
> 6. Replace `YOUR_DEVICE_TOKEN_HERE` with the token you generated in step 5.
> 7. Click **▶ Start Simulation**.

### 7. View your data

After the simulation starts, return to the dashboard and click **↻ Refresh** in the **Latest Telemetry Readings** section. New readings appear within seconds.

## GDPR-minded retention configuration

No plaintext secrets are hard-coded. Configure retention operationally by periodically deleting old entries from JSON store or external DB. Recommended policy (adjust for compliance):

- Telemetry files: `data/telemetry/{userId}.json` — retain 30-90 days.
- Sensor records: retain 30-90 days.
- Daily email logs: retain 180 days to preserve idempotency audit trail.
- Rotate `JWT_SECRET`, device tokens, MQTT, and SMTP credentials regularly.
- Device tokens can be rotated at any time via `POST /api/telemetry/token`.
