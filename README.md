# IoT CI/CD Deployment System using GitHub Actions

## Project Overview

This project demonstrates the implementation of Continuous Integration and Continuous Deployment (CI/CD) in an IoT monitoring system. The system collects environmental data from multiple sensors connected to an ESP32 microcontroller simulated on Wokwi. Sensor data is transmitted through MQTT, processed by a Node.js backend, stored for historical tracking, and displayed on a cloud-hosted web dashboard.

The project integrates GitHub Actions and Microsoft Azure to automate testing, building, and deployment processes, providing a practical example of DevOps practices applied to IoT systems.

---

## System Architecture

### IoT Data Flow

```text
ESP32 + Sensors (Wokwi)
          │
          ▼
      MQTT Broker
          │
          ▼
     Node.js Backend
          │
          ▼
   Telemetry Storage
          │
          ▼
      Web Dashboard
```

### CI/CD Deployment Flow

```text
Developer
    │
    ▼
GitHub Repository
    │
    ▼
GitHub Actions
 ┌──────┴──────┐
 ▼             ▼
Frontend     Backend
Azure SWA    Azure App Service
```

---

## Features

### IoT Monitoring

The system supports real-time monitoring of environmental data:

* Temperature monitoring (DHT22)
* Humidity monitoring (DHT22)
* Motion detection (PIR)
* Distance measurement (HC-SR04)
* Light intensity monitoring (LDR)

### User Management

The platform includes authentication and user administration features:

* JWT Authentication
* User Registration and Login
* Role-Based Access Control
* Admin/User Accounts
* Device Token Management

### MQTT Telemetry

Sensor data is transmitted using MQTT:

* ESP32 publishes telemetry data
* Device token based ownership mapping
* Per-user telemetry history
* Real-time dashboard updates
* Last sensor update tracking

### CI/CD Automation

The deployment process is fully automated:

* Automatic build on code push
* GitHub Actions workflow execution
* Continuous Integration
* Continuous Deployment
* Automatic Azure deployment

---

## Technologies Used

### IoT Layer

* ESP32
* DHT22 Temperature & Humidity Sensor
* PIR Motion Sensor
* HC-SR04 Ultrasonic Sensor
* LDR Light Sensor
* MQTT Protocol

### Backend

* Node.js
* Express.js
* JWT Authentication
* REST API

### Frontend

* HTML5
* CSS3
* JavaScript

### Cloud Platform

* Microsoft Azure
* Azure App Service
* Azure Static Web Apps

### DevOps

* Git
* GitHub
* GitHub Actions
* CI/CD Pipeline

---

## MQTT Configuration

### Broker

```text
test.mosquitto.org
```

### Port

```text
1883
```

### Topic

```text
iot/gdpr/telemetry
```

### Payload Example

```json
{
  "deviceToken": "YOUR_DEVICE_TOKEN",
  "deviceId": "wokwi-esp32-01",
  "temperature": 28.5,
  "humidity": 70.2,
  "motion": 1,
  "distance": 52.4,
  "light": 1320
}
```

---

## REST API Endpoints

### Authentication

```http
POST /api/auth/login
GET  /api/auth/me
```

### Users

```http
GET  /api/users
POST /api/users/:id/promote
```

### Telemetry

```http
GET  /api/telemetry
GET  /api/telemetry/token
POST /api/telemetry/token
```

### Sensors

```http
POST /api/sensors/ingest
GET  /api/sensors/daily-summary
```

### Administration

```http
POST /api/admin/send-daily-emails
```

---

## Local Deployment

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
npm test
```

### Start Application

```bash
npm start
```

### Access Application

```text
http://localhost:4280
```

---

## Azure Deployment

### Frontend Hosting

* Azure Static Web Apps

### Backend Hosting

* Azure App Service

Deployment is fully automated through GitHub Actions.

Whenever changes are pushed to the main branch:

1. GitHub Actions starts the workflow.
2. Dependencies are installed automatically.
3. Build and validation steps are executed.
4. Frontend is deployed to Azure Static Web Apps.
5. Backend is deployed to Azure App Service.
6. Updated services become available online.

---

## Wokwi Simulation

The project uses Wokwi for hardware simulation and testing.

Simulated devices include:

* ESP32
* DHT22
* PIR Sensor
* HC-SR04 Sensor
* LDR Sensor

The ESP32 sketch publishes telemetry data every 5 seconds through MQTT, allowing end-to-end testing without physical hardware.

---

## Educational Purpose

This project was developed for the course:

**Cloud Computing Applications in IoT**

### Project Topic

**Application of CI/CD for Automated IoT System Deployment using GitHub Actions**

---
