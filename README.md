# Pi Manager

**Pi Manager** is a lightweight, systemd-aware monitoring daemon and management interface for Raspberry Pi (and other Linux systems). It provides a sleek, modern web UI to monitor system health and manage custom applications/processes.

## ✨ Features

- **System Health Dashboard**: Real-time monitoring of CPU usage, Memory, Temperature, Disk usage, Load averages, and Uptime.
- **Process Management**: Start, stop, and monitor custom applications ("Projects").
- **Pipeline Execution**: Visual tracking of project states (`IDLE`, `BOOTING`, `ACTIVE`, `FAILED`) with real-time logs.
- **Systemd Integration**: Designed to work seamlessly with systemd for process supervision.
- **Modern UI**: Built with React, TypeScript, TailwindCSS, and shadcn/ui for a responsive and beautiful experience.
- **Installable (PWA)**: Add it to your phone's home screen from Safari or Chrome for a fullscreen, offline-capable app.

## 📂 Project Structure

- `server/`: Go backend. Handles system metrics, process management, and serves the API & static assets.
- `client/`: React/Vite frontend. Provides the dashboard and management UI.
- `start.sh`: Production build script.
- `dev.sh`: Development startup script (hot-reload).

## 🚀 Quick Start

### Prerequisites
- Go 1.21+
- [bun](https://bun.sh/) 1.2.x

### Development Mode
To start both the Go backend and the Vite development server (with proxying and hot-reload):

```bash
./dev.sh
```
Access the UI at `http://localhost:2000`.

### Production Build
To build the client assets and the server binary:

```bash
./start.sh
```
This will:
1. Build the React client.
2. Embed the assets into the Go binary.
3. Build the `pi-manager` binary in `server/` and start it on port 2001.

> Note: client assets are embedded into the Go binary at build time, so rebuilding the client always requires rebuilding the Go binary before the new UI is served.

## 📦 Installation (Example)

```bash
# Create a user
sudo useradd --system --no-create-home --group systemd-journal pi-manager

# Install service file
sudo cp server/packaging/pi-manager.service /etc/systemd/system/pi-manager.service

# Install binary
sudo cp server/pi-manager /usr/local/bin/pi-manager

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable --now pi-manager.service
```

## 🔌 API Usage

The server exposes a REST API for automation.

- **Health Check**: `GET /api/v1/health`
- **Pi Stats**: `GET /api/v1/pi-health`
- **List Projects**: `GET /api/v1/projects`
- **Start Project**: `POST /api/v1/projects/:id/start`
- **Stop Project**: `POST /api/v1/projects/:id/stop`

To enable action capabilities (start/stop), run the server with the `--allow-actions` flag.
