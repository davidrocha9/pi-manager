# Pi Manager - Server

The backend for Pi Manager, written in **Go**. It serves the API, manages system processes, collects metrics, and serves the embedded frontend.

## 📂 Structure

- `cmd/pi-manager/`: Main entry point.
- `internal/api/`: HTTP API handlers and router setup.
    - `api.go`: Main API setup.
    - `handlers.go`: Project management handlers.
    - `health_handler.go`: System metric handlers (`/pi-health`).
    - `web/`: Embedded frontend assets.
- `internal/manager/`: Core logic for managing projects and processes.
- `pi-manager`: Compiled binary (after build).

## 🚀 Usage

### Building

```bash
go build -o pi-manager ./cmd/pi-manager
```

### Running

```bash
./pi-manager [flags]
```

**Flags:**

- `--addr <host:port>`: Address to listen on (default `127.0.0.1:8080`).
- `--state <path>`: Path to the state JSON file (default `state.json`).
- `--allow-actions`: Enable state-changing actions (start/stop projects). Default is read-only for safety.

### 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Simple liveness check |
| `GET` | `/api/v1/pi-health` | Returns system metrics (CPU, RAM, Temp, etc.) |
| `GET` | `/api/v1/projects` | List all configured projects |
| `POST` | `/api/v1/projects` | Create a new project |
| `GET` | `/api/v1/projects/:id` | Get details for a specific project |
| `POST` | `/api/v1/projects/:id/start` | Start a project's boot command |
| `POST` | `/api/v1/projects/:id/stop` | Stop a running project |
| `GET` | `/api/v1/projects/:id/logs` | Stream logs for a project (WebSocket/SSE) |

## 📊 Metrics

The `/api/v1/pi-health` endpoint gathers metrics using standard Linux system calls and files (e.g., `/proc/stat`, `/sys/class/thermal`). It returns data on:

- **CPU**: Usage percentage.
- **Memory**: Total, Used, Available, Usage percentage.
- **Disk**: Usage percentage.
- **Temperature**: SoC temperature.
- **Load Averages**: 1m, 5m, 15m.
- **Uptime**: System uptime.
