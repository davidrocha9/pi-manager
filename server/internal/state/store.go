package state

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Store holds unit state in memory and persists snapshots.
type Store struct {
	mu       sync.RWMutex
	projects map[string]Project
	history  []PiHealthStats
	path     string
	stale    time.Time
}

type PiHealthStats struct {
	Time          time.Time `json:"time"`
	CPUUsage      float64   `json:"cpu_usage"`
	MemoryPercent float64   `json:"memory_percent"`
	Temperature   float64   `json:"temperature"`
	DiskPercent   float64   `json:"disk_percent"`
}

// NewStore creates a store with snapshot path.
func NewStore(path string) *Store {
	return &Store{projects: map[string]Project{}, history: []PiHealthStats{}, path: path}
}

// Load reads snapshot from disk if present.
func (s *Store) Load() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Load projects
	f, err := os.Open(s.path)
	if err == nil {
		defer f.Close()
		dec := json.NewDecoder(f)
		var snap struct {
			Projects []Project `json:"projects"`
		}
		if err := dec.Decode(&snap); err == nil {
			s.projects = map[string]Project{}
			for _, p := range snap.Projects {
				s.projects[p.ID] = p
			}
		}
	}

	// Load history from separate file
	histPath := s.historyPath()
	hf, err := os.Open(histPath)
	if err == nil {
		defer hf.Close()
		dec := json.NewDecoder(hf)
		var hist []PiHealthStats
		if err := dec.Decode(&hist); err == nil {
			s.history = hist
		}
	}

	if s.history == nil {
		s.history = []PiHealthStats{}
	}

	return nil
}

func (s *Store) historyPath() string {
	ext := filepath.Ext(s.path)
	base := strings.TrimSuffix(s.path, ext)
	return base + "-history" + ext
}

// Snapshot writes current units to disk atomically.
func (s *Store) Snapshot() error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return err
	}

	// 1. Snapshot Projects
	pf, err := os.CreateTemp(filepath.Dir(s.path), "state-*.tmp")
	if err != nil {
		return err
	}
	s.mu.RLock()
	projects := make([]Project, 0, len(s.projects))
	for _, p := range s.projects {
		projects = append(projects, p)
	}
	s.mu.RUnlock()

	enc := json.NewEncoder(pf)
	enc.SetIndent("", "  ")
	if err := enc.Encode(struct {
		Projects []Project `json:"projects"`
	}{Projects: projects}); err != nil {
		pf.Close()
		os.Remove(pf.Name())
		return err
	}
	pf.Close()
	if err := os.Rename(pf.Name(), s.path); err != nil {
		return err
	}

	// 2. Snapshot History
	hf, err := os.CreateTemp(filepath.Dir(s.path), "history-*.tmp")
	if err != nil {
		return err
	}
	s.mu.RLock()
	history := s.history
	s.mu.RUnlock()

	encH := json.NewEncoder(hf)
	if err := encH.Encode(history); err != nil {
		hf.Close()
		os.Remove(hf.Name())
		return err
	}
	hf.Close()
	return os.Rename(hf.Name(), s.historyPath())
}

// UpdateUnit updates or inserts a unit state.
// (service/unit-specific functions removed; store now only persists projects)

// PipelineStep represents a single command in a sequence.
type PipelineStep struct {
	Name string `json:"name"`
	Cmd  string `json:"cmd"`
}

// Project represents a custom project configuration to manage via the UI/API.
type Project struct {
	ID          string         `json:"id"`
	Description string         `json:"description"`
	CheckCmd    string         `json:"check_cmd"`      // command to check status
	Pipeline    []PipelineStep `json:"pipeline"`       // sequence of commands to run
	Path        string         `json:"path,omitempty"` // optional path to the application
	Status      string         `json:"status"`         // IDLE, RUNNING, FAILED
	LastLog     string         `json:"last_log"`       // output of the last execution
	CurrentStep string         `json:"current_step"`   // name of the currently running step
	Progress    int            `json:"progress"`       // progress percentage 0-100
	Port        string         `json:"port"`           // optional port number
}

// projects map stores configured projects
// add to Store struct via embedding a field (but file-level change easier)

// AddProject registers a project in the store.
func (s *Store) AddProject(p Project) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.projects == nil {
		s.projects = map[string]Project{}
	}
	s.projects[p.ID] = p
}

// RemoveProject deletes a project by id.
func (s *Store) RemoveProject(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.projects, id)
}

// GetProjects returns all projects.
func (s *Store) GetProjects() []Project {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Project, 0, len(s.projects))
	for _, p := range s.projects {
		out = append(out, p)
	}
	return out
}

// GetProject returns a project by id.
func (s *Store) GetProject(id string) (Project, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	p, ok := s.projects[id]
	return p, ok
}

// AddPiHealthStat adds a health snapshot to history.
func (s *Store) AddPiHealthStat(stat PiHealthStats) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.history = append(s.history, stat)
	// Keep last 43200 points (30 days if every 60s)
	if len(s.history) > 43200 {
		s.history = s.history[len(s.history)-43200:]
	}
}

// GetPiHealthHistory returns the stored history.
func (s *Store) GetPiHealthHistory() []PiHealthStats {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]PiHealthStats, len(s.history))
	copy(out, s.history)
	return out
}
