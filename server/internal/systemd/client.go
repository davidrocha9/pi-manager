package systemd

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"time"

	dbus "github.com/godbus/dbus/v5"
)

// Unit represents the minimal unit state we care about.
type Unit struct {
	ID                   string `json:"id"`
	Description          string `json:"description"`
	LoadState            string `json:"load_state"`
	ActiveState          string `json:"active_state"`
	SubState             string `json:"sub_state"`
	ActiveEnterTimestamp int64  `json:"active_enter_timestamp"`
	LastChecked          int64  `json:"last_checked"`
}

// Client provides systemd access. It attempts to subscribe to manager signals
// and falls back to polling/listing via `systemctl` for properties.
type Client struct {
	conn      *dbus.Conn
	signals   chan *dbus.Signal
	connected bool
}

// NewClient attempts to connect to the system bus and subscribe to systemd manager signals.
func NewClient() *Client {
	c := &Client{connected: false}
	conn, err := dbus.SystemBus()
	if err != nil {
		// unable to connect to system bus, will operate in polling mode
		return c
	}
	c.conn = conn
	c.signals = make(chan *dbus.Signal, 10)
	conn.Signal(c.signals)
	// add match rule for systemd manager signals
	match := "type='signal',sender='org.freedesktop.systemd1',interface='org.freedesktop.systemd1.Manager'"
	conn.BusObject().Call("org.freedesktop.DBus.AddMatch", 0, match)
	c.connected = true
	// start goroutine to drain signals (no-op handler here, consumers can use SubscribeUpdates)
	go func() {
		for sig := range c.signals {
			_ = sig
			// signals are drained; callers should use SubscribeUpdates to be notified
		}
	}()
	return c
}

// ListUnits uses `systemctl` (reliable parsing) to list units and their properties.
// We keep systemctl usage for property extraction and use DBus signals only as triggers.
func (c *Client) ListUnits() ([]Unit, error) {
	cmd := exec.Command("systemctl", "list-units", "--type=service", "--all", "--no-legend", "--no-pager")
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	lines := strings.Split(string(out), "\n")
	units := make([]Unit, 0, len(lines))
	for _, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) == 0 {
			continue
		}
		id := fields[0]
		if !strings.HasSuffix(id, ".service") {
			continue
		}
		if u, err := c.getUnitProps(id); err == nil {
			units = append(units, u)
		}
	}
	return units, nil
}

func (c *Client) getUnitProps(id string) (Unit, error) {
	cmd := exec.Command("systemctl", "show", id, "--property=Id,Description,LoadState,ActiveState,SubState,ActiveEnterTimestamp")
	out, err := cmd.Output()
	if err != nil {
		return Unit{}, err
	}
	props := map[string]string{}
	lines := strings.Split(string(out), "\n")
	for _, line := range lines {
		if eq := strings.Index(line, "="); eq >= 0 {
			k := line[:eq]
			v := line[eq+1:]
			props[k] = v
		}
	}
	u := Unit{ID: id}
	if v, ok := props["Description"]; ok {
		u.Description = v
	}
	if v, ok := props["LoadState"]; ok {
		u.LoadState = v
	}
	if v, ok := props["ActiveState"]; ok {
		u.ActiveState = v
	}
	if v, ok := props["SubState"]; ok {
		u.SubState = v
	}
	if v, ok := props["ActiveEnterTimestamp"]; ok && v != "" {
		if t, err := parseMicroseconds(v); err == nil {
			u.ActiveEnterTimestamp = t
		}
	}
	u.LastChecked = time.Now().Unix()
	return u, nil
}

func parseMicroseconds(s string) (int64, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, fmt.Errorf("empty")
	}
	// systemctl reports microseconds since epoch
	var micros int64
	if _, err := fmt.Sscan(s, &micros); err != nil {
		return 0, err
	}
	return micros / 1000000, nil
}

// SubscribeUpdates returns a channel that receives a struct{} whenever a systemd manager
// signal is observed. Caller should cancel the provided context to stop.
func (c *Client) SubscribeUpdates(ctx context.Context) <-chan struct{} {
	ch := make(chan struct{}, 4)
	if !c.connected {
		// no DBus: return closed channel that never emits
		close(ch)
		return ch
	}
	go func() {
		for {
			select {
			case <-ctx.Done():
				close(ch)
				return
			case sig := <-c.signals:
				// interested signals: UnitNew, UnitRemoved, JobRemoved, PropertiesChanged
				if sig == nil || sig.Name == "" {
					continue
				}
				// emit a notification
				select {
				case ch <- struct{}{}:
				default:
				}
			}
		}
	}()
	return ch
}

// LastBootReason inspects the previous boot's journal to decide whether shutdown was clean.
// It returns a brief reason and a small snippet.
func (c *Client) LastBootReason() (string, string, error) {
	// attempt to fetch previous boot logs
	cmd := exec.Command("journalctl", "-b", "-1", "--no-pager", "-n", "200")
	out, err := cmd.Output()
	if err != nil {
		return "unknown", "", err
	}
	text := string(out)
	// simple heuristics
	lower := strings.ToLower(text)
	reason := "clean"
	notes := ""
	if strings.Contains(lower, "kernel panic") || strings.Contains(lower, "panic:") || strings.Contains(lower, "fatal") {
		reason = "crash"
	} else if strings.Contains(lower, "power key") || strings.Contains(lower, "power loss") || strings.Contains(lower, "unexpected") {
		reason = "power-loss"
	} else if strings.Contains(lower, "shutdown") && !strings.Contains(lower, "starting") {
		// presence of shutdown messages doesn't mean unclean; keep default
	}
	// take first 5 lines as snippet
	var snippet []string
	lines := strings.Split(text, "\n")
	for i := 0; i < len(lines) && i < 10; i++ {
		snippet = append(snippet, lines[i])
	}
	b, _ := json.Marshal(snippet)
	notes = string(b)
	return reason, notes, nil
}

// JournalForUnit returns the most recent journal lines for the given unit.
func (c *Client) JournalForUnit(unit string, lines int) ([]string, error) {
	if lines <= 0 {
		lines = 100
	}
	// use journalctl to fetch logs for the unit
	cmd := exec.Command("journalctl", "-u", unit, "-n", fmt.Sprint(lines), "--no-pager", "-o", "short")
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	txt := strings.TrimRight(string(out), "\n")
	if txt == "" {
		return []string{}, nil
	}
	outLines := strings.Split(txt, "\n")
	return outLines, nil
}
