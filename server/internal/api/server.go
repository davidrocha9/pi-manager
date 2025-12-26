package api

import (
	"bufio"
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/davidrocha/pi-manager/internal/state"
	"github.com/davidrocha/pi-manager/internal/systemd"
)

//go:embed web/*
var webFS embed.FS

type Handler struct {
	store        *state.Store
	sd           *systemd.Client
	startTime    time.Time
	allowActions bool
	mux          *http.ServeMux
	fsBase       string
	activeTasks  sync.Map // map[string]context.CancelFunc
}

func NewHandler(s *state.Store, sd *systemd.Client, start time.Time, allowActions bool, fsBase string) http.Handler {
	if fsBase == "" {
		fsBase = "/"
	}
	fsBase = filepath.Clean(fsBase)
	h := &Handler{store: s, sd: sd, startTime: start, allowActions: allowActions, mux: http.NewServeMux(), fsBase: fsBase}
	h.routes()
	go h.backgroundHealthCollection()
	return h
}

func (h *Handler) routes() {
	h.mux.HandleFunc("/api/v1/", h.handleRoot)
	h.mux.HandleFunc("/api/v1/projects", h.handleProjects)
	h.mux.HandleFunc("/api/v1/projects/", h.handleProjectAction)
	h.mux.HandleFunc("/api/v1/fs", h.handleFS)
	h.mux.HandleFunc("/api/v1/health", h.handleHealth)
	h.mux.HandleFunc("/api/v1/pi-health", h.handlePiHealth)
	h.mux.HandleFunc("/api/v1/boots/last", h.handleBootsLast)
	// static UI
	h.mux.HandleFunc("/", h.handleStatic)
}

// handleFS lists directories/files under the server-configured base path.
// Query param: ?path=relative/path (optional). Response: [{name, path, is_dir}]
func (h *Handler) handleFS(w http.ResponseWriter, r *http.Request) {
	qp := r.URL.Query().Get("path")
	// sanitize and resolve
	tgt := filepath.Join(h.fsBase, qp)
	tgt = filepath.Clean(tgt)
	// ensure tgt is within fsBase
	if !strings.HasPrefix(tgt, h.fsBase) {
		w.WriteHeader(http.StatusForbidden)
		writeJSON(w, map[string]string{"error": "path outside allowed base"})
		return
	}
	info, err := os.Stat(tgt)
	if err != nil || !info.IsDir() {
		w.WriteHeader(http.StatusNotFound)
		writeJSON(w, map[string]string{"error": "not found or not a directory"})
		return
	}
	entries, err := os.ReadDir(tgt)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		writeJSON(w, map[string]string{"error": err.Error()})
		return
	}
	out := make([]map[string]interface{}, 0, len(entries))
	for _, e := range entries {
		// Only show directories
		if !e.IsDir() {
			continue
		}

		// Hide dot-folders and specific noise folders
		name := e.Name()
		if strings.HasPrefix(name, ".") ||
			name == "go" ||
			name == "snap" ||
			name == "node_modules" {
			continue
		}

		full := filepath.Join(tgt, name)
		rel, _ := filepath.Rel(h.fsBase, full)
		out = append(out, map[string]interface{}{
			"name":     name,
			"path":     rel,
			"abs_path": full,
			"is_dir":   true,
		})
	}
	writeJSON(w, map[string]interface{}{
		"current_path": tgt,
		"entries":      out,
	})
}

func (h *Handler) handleStatic(w http.ResponseWriter, r *http.Request) {
	// Root sub-filesystem for the "web" directory
	web, err := fs.Sub(webFS, "web")
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Try to serve the file normally
	f, err := web.Open(strings.TrimPrefix(r.URL.Path, "/"))
	if err == nil {
		f.Close()
		http.FileServer(http.FS(web)).ServeHTTP(w, r)
		return
	}

	// Fallback: serve index.html for client-side routing
	data, err := fs.ReadFile(web, "index.html")
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write(data)
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.mux.ServeHTTP(w, r)
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	if err := enc.Encode(v); err != nil {
		log.Printf("write json err: %v", err)
	}
}

func (h *Handler) handleRoot(w http.ResponseWriter, r *http.Request) {
	uptime := time.Since(h.startTime)
	writeJSON(w, map[string]interface{}{
		"name":     "pi-manager",
		"version":  "0.1",
		"uptime_s": int64(uptime.Seconds()),
	})
}

// no service/unit endpoints — UI manages projects only

// handleProjects supports GET to list and POST to create a project
func (h *Handler) handleProjects(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		ps := h.store.GetProjects()
		writeJSON(w, ps)
		return
	case http.MethodPost:
		var p state.Project
		dec := json.NewDecoder(r.Body)
		if err := dec.Decode(&p); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			writeJSON(w, map[string]string{"error": "invalid json"})
			return
		}
		if p.ID == "" {
			w.WriteHeader(http.StatusBadRequest)
			writeJSON(w, map[string]string{"error": "id required"})
			return
		}
		if p.Status == "" {
			p.Status = "IDLE"
		}
		h.store.AddProject(p)
		if err := h.store.Snapshot(); err != nil {
			log.Printf("snapshot error: %v", err)
		}
		writeJSON(w, p)
		return
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
}

// handleProjectAction handles GET/DELETE for project detail and POST for actions like /start
func (h *Handler) handleProjectAction(w http.ResponseWriter, r *http.Request) {
	// path is /api/v1/projects/{id} or /api/v1/projects/{id}/start
	path := r.URL.Path[len("/api/v1/projects/"):]
	if path == "" {
		h.handleProjects(w, r)
		return
	}
	// split on /
	var id, action string
	if idx := len(path); idx > 0 {
		// find first slash
		for i := 0; i < len(path); i++ {
			if path[i] == '/' {
				id = path[:i]
				action = path[i+1:]
				break
			}
		}
		if id == "" {
			id = path
		}
	}
	switch r.Method {
	case http.MethodGet:
		if p, ok := h.store.GetProject(id); ok {
			writeJSON(w, p)
			return
		}
		h.wNotFound(w)
		return
	case http.MethodDelete:
		h.killProject(id)
		h.store.RemoveProject(id)
		if err := h.store.Snapshot(); err != nil {
			log.Printf("snapshot error: %v", err)
		}
		w.WriteHeader(http.StatusNoContent)
		return
	case http.MethodPost:
		if action == "start" {
			if !h.allowActions {
				w.WriteHeader(http.StatusForbidden)
				writeJSON(w, map[string]string{"error": "actions disabled"})
				return
			}
			p, ok := h.store.GetProject(id)
			if !ok {
				h.wNotFound(w)
				return
			}

			if p.Status == "RUNNING" {
				writeJSON(w, map[string]string{"error": "project already running"})
				return
			}

			// Run in background
			ctx, cancel := context.WithCancel(context.Background())
			h.activeTasks.Store(id, cancel)

			go func(proj state.Project) {
				defer h.activeTasks.Delete(id)
				defer cancel()

				proj.Status = "BOOTING"
				proj.LastLog = ""
				proj.Progress = 0
				h.store.AddProject(proj) // Update status to BOOTING

				var combinedOutput strings.Builder
				var finalErr error
				var projLock sync.Mutex
				totalSteps := len(proj.Pipeline)

				for i, step := range proj.Pipeline {
					if ctx.Err() != nil {
						finalErr = ctx.Err()
						break
					}

					projLock.Lock()
					proj.CurrentStep = step.Name
					// Progress: if we have 3 steps, they should be 33, 66, 100
					proj.Progress = (i + 1) * 100 / totalSteps
					h.store.AddProject(proj)

					combinedOutput.WriteString(fmt.Sprintf("===> [%d/%d] Running Step: %s\n", i+1, totalSteps, step.Name))
					proj.LastLog = combinedOutput.String()
					h.store.AddProject(proj)
					projLock.Unlock()

					cmdStr := step.Cmd
					if strings.Contains(cmdStr, "boot.sh") || strings.Contains(cmdStr, "dev.sh") {
						cmdStr = "tailscale up && " + cmdStr
					}

					cmd := exec.CommandContext(ctx, "sh", "-c", cmdStr)
					if proj.Path != "" {
						cmd.Dir = proj.Path
					}
					// Set process group so we can kill children (like dev servers)
					cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

					// Use a writer that updates the store in real-time
					writer := &logWriter{
						h:        h,
						proj:     &proj,
						projLock: &projLock,
						build:    &combinedOutput,
					}
					cmd.Stdout = writer
					cmd.Stderr = writer

					if err := cmd.Start(); err != nil {
						combinedOutput.WriteString(fmt.Sprintf("Failed to start: %v\n", err))
						finalErr = err
						break
					}

					// Attempt auto-discovery of port if missing
					if proj.Port == "" {
						go func(pid int) {
							// Try multiple times over a few seconds
							for i := 0; i < 30; i++ {
								time.Sleep(1 * time.Second)
								port := findPortForPID(pid)
								if port != "" {
									projLock.Lock()
									// Only update if still running and not set
									if proj.Status == "BOOTING" || proj.Status == "ACTIVE" {
										if proj.Port == "" {
											proj.Port = port
											h.store.AddProject(proj)
										}
									}
									projLock.Unlock()
									return
								}
							}
						}(cmd.Process.Pid)
					}

					// Helper to kill the entire process group if context is cancelled
					go func() {
						<-ctx.Done()
						if cmd.Process != nil {
							pgid, err := syscall.Getpgid(cmd.Process.Pid)
							if err == nil {
								syscall.Kill(-pgid, syscall.SIGKILL)
							}
						}
					}()

					finalErr = cmd.Wait()
					if finalErr != nil {
						combinedOutput.WriteString(fmt.Sprintf("\nERROR in step '%s': %v\n", step.Name, finalErr))
						break
					}
					combinedOutput.WriteString("\n")
				}

				projLock.Lock()
				proj.CurrentStep = ""
				if finalErr != nil {
					// Check if context was canceled or if task was removed from active map (user stop)
					_, isActive := h.activeTasks.Load(id)
					if finalErr == context.Canceled || ctx.Err() == context.Canceled || !isActive {
						proj.Status = "IDLE"
						combinedOutput.WriteString("\nStopped by user.\n")
					} else {
						proj.Status = "FAILED"
					}
				} else {
					proj.Status = "ACTIVE"
				}
				proj.LastLog = combinedOutput.String()
				h.store.AddProject(proj)
				h.store.Snapshot()
				projLock.Unlock()
			}(p)

			writeJSON(w, map[string]string{"status": "started"})
			return
		}

		if action == "stop" {
			h.killProject(id)
			p, ok := h.store.GetProject(id)
			if !ok {
				h.wNotFound(w)
				return
			}

			p.Status = "IDLE"
			p.Progress = 0
			p.CurrentStep = ""
			h.store.AddProject(p)
			writeJSON(w, map[string]string{"status": "stopped"})
			return
		}
		w.WriteHeader(http.StatusBadRequest)
		writeJSON(w, map[string]string{"error": "unknown action"})
		return
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
}

func (h *Handler) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, map[string]interface{}{
		"ok":             true,
		"last_check":     time.Now().Format(time.RFC3339),
		"tailscale_name": getTailscaleDNSName(),
	})
}

func (h *Handler) handlePiHealth(w http.ResponseWriter, r *http.Request) {
	result := h.collectPiHealth()
	result["history"] = h.store.GetPiHealthHistory()
	writeJSON(w, result)
}

func (h *Handler) killProject(id string) {
	if cancel, ok := h.activeTasks.Load(id); ok {
		cancel.(context.CancelFunc)()
		h.activeTasks.Delete(id)
	}

	if p, ok := h.store.GetProject(id); ok {
		// If project has a port defined, try to kill whatever is using it
		if p.Port != "" {
			// We use lsof -ti:PORT to find PIDs and kill them
			exec.Command("sh", "-c", fmt.Sprintf("lsof -ti:%s | xargs kill -9", p.Port)).Run()
		}
	}
}

func (h *Handler) backgroundHealthCollection() {
	// Take initial snapshot immediately
	stats := h.collectPiHealthStats()
	h.store.AddPiHealthStat(stats)

	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	for {
		<-ticker.C
		stats := h.collectPiHealthStats()
		h.store.AddPiHealthStat(stats)
	}
}

func (h *Handler) collectPiHealthStats() state.PiHealthStats {
	cpu := getCPUUsage()
	memTotal, memAvail := getMemInfo()
	memUsed := memTotal - memAvail
	memPercent := 0.0
	if memTotal > 0 {
		memPercent = float64(memUsed) / float64(memTotal) * 100
	}
	temp := getTemperature()
	diskTotal, diskUsed := getDiskUsage("/")
	diskPercent := 0.0
	if diskTotal > 0 {
		diskPercent = float64(diskUsed) / float64(diskTotal) * 100
	}

	return state.PiHealthStats{
		Time:          time.Now(),
		CPUUsage:      cpu,
		MemoryPercent: memPercent,
		Temperature:   temp,
		DiskPercent:   diskPercent,
	}
}

func (h *Handler) collectPiHealth() map[string]interface{} {
	result := make(map[string]interface{})

	// Hostname
	if hostname, err := os.Hostname(); err == nil {
		result["hostname"] = hostname
	}
	result["tailscale_name"] = getTailscaleDNSName()

	// CPU Usage from /proc/stat
	result["cpu_usage"] = getCPUUsage()

	// Memory from /proc/meminfo
	memTotal, memAvail := getMemInfo()
	memUsed := memTotal - memAvail
	result["memory_total"] = memTotal
	result["memory_used"] = memUsed
	if memTotal > 0 {
		result["memory_percent"] = float64(memUsed) / float64(memTotal) * 100
	} else {
		result["memory_percent"] = 0.0
	}

	// Temperature from /sys/class/thermal/thermal_zone0/temp (Raspberry Pi)
	result["temperature"] = getTemperature()

	// Disk usage from syscall.Statfs
	diskTotal, diskUsed := getDiskUsage("/")
	result["disk_total"] = diskTotal
	result["disk_used"] = diskUsed
	if diskTotal > 0 {
		result["disk_percent"] = float64(diskUsed) / float64(diskTotal) * 100
	} else {
		result["disk_percent"] = 0.0
	}

	// Load average from /proc/loadavg
	load1, load5, load15 := getLoadAvg()
	result["load_avg_1"] = load1
	result["load_avg_5"] = load5
	result["load_avg_15"] = load15

	// Uptime from /proc/uptime
	result["uptime"] = getUptime()

	return result
}

func getCPUUsage() float64 {
	// Read /proc/stat twice with a small delay to calculate CPU usage
	idle1, total1 := readCPUStat()
	time.Sleep(100 * time.Millisecond)
	idle2, total2 := readCPUStat()

	idleDelta := idle2 - idle1
	totalDelta := total2 - total1

	if totalDelta == 0 {
		return 0.0
	}
	return (1.0 - float64(idleDelta)/float64(totalDelta)) * 100
}

func readCPUStat() (idle, total uint64) {
	file, err := os.Open("/proc/stat")
	if err != nil {
		return 0, 0
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	if scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "cpu ") {
			fields := strings.Fields(line)
			if len(fields) >= 5 {
				for i := 1; i < len(fields); i++ {
					val, _ := strconv.ParseUint(fields[i], 10, 64)
					total += val
					if i == 4 { // idle is the 4th value (0-indexed: fields[4])
						idle = val
					}
				}
			}
		}
	}
	return idle, total
}

func getMemInfo() (total, available uint64) {
	file, err := os.Open("/proc/meminfo")
	if err != nil {
		return 0, 0
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "MemTotal:") {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				val, _ := strconv.ParseUint(fields[1], 10, 64)
				total = val * 1024 // Convert from kB to bytes
			}
		} else if strings.HasPrefix(line, "MemAvailable:") {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				val, _ := strconv.ParseUint(fields[1], 10, 64)
				available = val * 1024
			}
		}
	}
	return total, available
}

func getTemperature() float64 {
	// Try Raspberry Pi thermal zone first
	paths := []string{
		"/sys/class/thermal/thermal_zone0/temp",
		"/sys/class/hwmon/hwmon0/temp1_input",
	}
	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err == nil {
			val, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64)
			if err == nil {
				return val / 1000.0 // Convert from millidegrees to degrees
			}
		}
	}
	return 0.0
}

func getDiskUsage(path string) (total, used uint64) {
	var stat syscall.Statfs_t
	if err := syscall.Statfs(path, &stat); err != nil {
		return 0, 0
	}
	total = stat.Blocks * uint64(stat.Bsize)
	free := stat.Bfree * uint64(stat.Bsize)
	used = total - free
	return total, used
}

func getLoadAvg() (load1, load5, load15 float64) {
	data, err := os.ReadFile("/proc/loadavg")
	if err != nil {
		return 0, 0, 0
	}
	fields := strings.Fields(string(data))
	if len(fields) >= 3 {
		load1, _ = strconv.ParseFloat(fields[0], 64)
		load5, _ = strconv.ParseFloat(fields[1], 64)
		load15, _ = strconv.ParseFloat(fields[2], 64)
	}
	return load1, load5, load15
}

func getUptime() string {
	data, err := os.ReadFile("/proc/uptime")
	if err != nil {
		return "N/A"
	}
	fields := strings.Fields(string(data))
	if len(fields) < 1 {
		return "N/A"
	}
	secs, err := strconv.ParseFloat(fields[0], 64)
	if err != nil {
		return "N/A"
	}

	days := int(secs) / 86400
	hours := (int(secs) % 86400) / 3600
	mins := (int(secs) % 3600) / 60

	if days > 0 {
		return fmt.Sprintf("%dd %dh %dm", days, hours, mins)
	} else if hours > 0 {
		return fmt.Sprintf("%dh %dm", hours, mins)
	}
	return fmt.Sprintf("%dm", mins)
}

func (h *Handler) handleBootsLast(w http.ResponseWriter, r *http.Request) {
	if h.sd == nil {
		writeJSON(w, map[string]interface{}{"boot_id": "unknown", "reason": "unknown"})
		return
	}
	reason, notes, err := h.sd.LastBootReason()
	if err != nil {
		writeJSON(w, map[string]interface{}{"boot_id": "unknown", "reason": "error", "error": err.Error()})
		return
	}
	writeJSON(w, map[string]interface{}{"boot_id": "previous", "reason": reason, "notes": notes})
}

func (h *Handler) wNotFound(w http.ResponseWriter) {
	resp := map[string]interface{}{"error": "not found"}
	w.WriteHeader(http.StatusNotFound)
	writeJSON(w, resp)
}

type logWriter struct {
	h        *Handler
	proj     *state.Project
	projLock *sync.Mutex
	build    *strings.Builder
}

func (lw *logWriter) Write(p []byte) (n int, err error) {
	lw.projLock.Lock()
	defer lw.projLock.Unlock()
	lw.build.Write(p)
	lw.proj.LastLog = lw.build.String()
	lw.h.store.AddProject(*lw.proj)
	return len(p), nil
}

// findPortForPID attempts to find the TCP listening port for a process tree using pgrep and lsof
func findPortForPID(pid int) string {
	// 1. Get List of PIDs in the process group
	var pids []string
	pids = append(pids, fmt.Sprintf("%d", pid)) // always check the root pid

	pgrep := exec.Command("pgrep", "-g", fmt.Sprintf("%d", pid))
	if out, err := pgrep.Output(); err == nil {
		lines := strings.Split(string(out), "\n")
		for _, line := range lines {
			s := strings.TrimSpace(line)
			if s != "" {
				// avoid duplicate if pgrep includes the root pid
				found := false
				for _, existing := range pids {
					if existing == s {
						found = true
						break
					}
				}
				if !found {
					pids = append(pids, s)
				}
			}
		}
	}

	// 2. Check ports for all PIDs
	// lsof -Pan -p PID,PID,PID -i -sTCP:LISTEN
	cmd := exec.Command("lsof", "-Pan", "-p", strings.Join(pids, ","), "-i", "-sTCP:LISTEN")
	out, _ := cmd.Output() // ignore error as it returns non-zero if no open files

	// Output format example:
	// node 12345 user 20u IPv4 0t0 TCP *:3000 (LISTEN)
	lines := strings.Split(string(out), "\n")
	for _, line := range lines {
		if strings.Contains(line, "(LISTEN)") {
			// Find the part like *:3000 or 127.0.0.1:3000
			parts := strings.Fields(line)
			for _, part := range parts {
				if strings.Contains(part, ":") {
					// take the last part after last colon
					colonIdx := strings.LastIndex(part, ":")
					if colonIdx != -1 && colonIdx < len(part)-1 {
						port := part[colonIdx+1:]
						// Validate it's a number (simple check)
						if len(port) > 0 && port[0] >= '0' && port[0] <= '9' {
							return port
						}
					}
				}
			}
		}
	}
	return ""
}

func getTailscaleDNSName() string {
	cmd := exec.Command("tailscale", "status", "--json")
	out, err := cmd.Output()
	if err != nil {
		return ""
	}

	var status struct {
		Self struct {
			DNSName string `json:"DNSName"`
		} `json:"Self"`
	}
	if err := json.Unmarshal(out, &status); err != nil {
		return ""
	}

	return strings.TrimSuffix(status.Self.DNSName, ".")
}
