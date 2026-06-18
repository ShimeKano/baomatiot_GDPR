IoT CI/CD Deployment System using GitHub Actions
Project Overview

This project demonstrates the application of Continuous Integration and Continuous Deployment (CI/CD) in an IoT monitoring system. The system uses ESP32 and multiple sensors simulated on Wokwi to collect environmental data, which is transmitted via MQTT and displayed on a cloud-hosted web dashboard.

The project is deployed automatically using GitHub Actions and Microsoft Azure, providing a practical example of DevOps practices in IoT environments.

System Architecture
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

Deployment Architecture:

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
Features
IoT Monitoring
Temperature monitoring (DHT22)
Humidity monitoring (DHT22)
Motion detection (PIR)
Distance measurement (HC-SR04)
Light intensity monitoring (LDR)
User Management
JWT Authentication
Role-based Access Control
Admin/User accounts
Device Token Management
MQTT Telemetry
ESP32 publishes sensor data through MQTT
Device token based user mapping
Per-user telemetry storage
Real-time dashboard updates
CI/CD Automation
Automatic build on push
Automatic deployment to Azure
GitHub Actions workflow
Continuous Integration
Continuous Deployment
Technologies Used
IoT
ESP32
DHT22
PIR Sensor
HC-SR04 Ultrasonic Sensor
LDR Sensor
MQTT
Backend
Node.js
Express.js
JWT Authentication
Frontend
HTML
CSS
JavaScript
Cloud
Microsoft Azure
Azure App Service
Azure Static Web Apps
DevOps
Git
GitHub
GitHub Actions
CI/CD Pipeline
MQTT Configuration

Broker:

test.mosquitto.org

Port:

1883

Topic:

iot/gdpr/telemetry

Payload Example:

{
  "deviceToken": "YOUR_DEVICE_TOKEN",
  "deviceId": "wokwi-esp32-01",
  "temperature": 28.5,
  "humidity": 70.2,
  "motion": 1,
  "distance": 52.4,
  "light": 1320
}
API Endpoints

Authentication:

POST /api/auth/login
GET  /api/auth/me

Users:

GET  /api/users
POST /api/users/:id/promote

Telemetry:

GET  /api/telemetry
GET  /api/telemetry/token
POST /api/telemetry/token

Sensors:

POST /api/sensors/ingest
GET  /api/sensors/daily-summary

Admin:

POST /api/admin/send-daily-emails
Local Deployment
npm install
npm test
npm start

Application URL:

http://localhost:4280
Azure Deployment

Frontend:

Azure Static Web Apps

Backend:

Azure App Service

Deployment is fully automated using GitHub Actions.

Whenever code is pushed to the main branch:

GitHub Actions executes the workflow.
Application is built automatically.
Deployment to Azure is triggered automatically.
Updated version becomes available online.
Wokwi Simulation

The project uses Wokwi to simulate:

ESP32
DHT22
PIR
HC-SR04
LDR

The provided sketch publishes telemetry data every 5 seconds through MQTT.

Educational Purpose

This project was developed for the course:

Cloud Computing Applications in IoT

Topic:

Application of CI/CD for Automated IoT System Deployment using GitHub Actions

README này phù hợp hơn nhiều với báo cáo đề tài của bạn vì nó thể hiện rõ:

IoT
MQTT
Azure
GitHub Actions
CI/CD
