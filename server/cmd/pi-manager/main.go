package main

import (
	"context"
	"flag"
	"log"
	"mime"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/davidrocha/pi-manager/internal/api"
	"github.com/davidrocha/pi-manager/internal/state"
	"github.com/davidrocha/pi-manager/internal/systemd"
)

func main() {
	var addr string
	var snapshotPath string
	flag.StringVar(&addr, "addr", "127.0.0.1:8080", "bind address for HTTP server")
	flag.StringVar(&snapshotPath, "state", "/var/lib/pi-manager/state.json", "path to persist state snapshots")
	var allowActions bool
	flag.BoolVar(&allowActions, "allow-actions", false, "allow API to execute configured project start commands (dangerous - default false)")
	var fsBase string
	home, _ := os.UserHomeDir()
	if home == "" {
		home = "/"
	}
	flag.StringVar(&fsBase, "fs-base", home, "base path the file-browser API is allowed to access (default: home directory)")
	flag.Parse()

	// Serve the PWA manifest with its official content type. Go's mime table
	// doesn't map .webmanifest, and browsers ignore manifests served as text.
	if err := mime.AddExtensionType(".webmanifest", "application/manifest+json"); err != nil {
		log.Printf("warning: could not register webmanifest mime type: %v", err)
	}

	log.Println("pi-manager starting")
	startTime := time.Now()

	store := state.NewStore(snapshotPath)
	if err := store.Load(); err != nil {
		log.Printf("warning: failed to load snapshot: %v", err)
	}

	sd := systemd.NewClient()

	// start periodic snapshotter only (do not list system services)
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
			}
			if err := store.Snapshot(); err != nil {
				log.Printf("snapshot error: %v", err)
			}
		}
	}()

	// start HTTP server
	h := api.NewHandler(store, sd, startTime, allowActions, fsBase)
	srv := &http.Server{Addr: addr, Handler: h}
	go func() {
		log.Printf("http server listening on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("http server failed: %v", err)
		}
	}()

	// pick back up where we left off: relaunch projects that were running
	// when the last snapshot was taken (e.g. after a host reboot)
	go h.ResumeRunningProjects()

	// graceful shutdown
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt)
	<-sig
	log.Println("shutting down")
	cancel()
	ctxShut, cancel2 := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel2()
	srv.Shutdown(ctxShut)
	if err := store.Snapshot(); err != nil {
		log.Printf("snapshot on exit failed: %v", err)
	}
	log.Println("exited")
}
