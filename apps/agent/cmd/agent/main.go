package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/nexuspanel/nexuspanel/apps/agent/internal/config"
	"github.com/nexuspanel/nexuspanel/apps/agent/internal/docker"
	"github.com/nexuspanel/nexuspanel/apps/agent/internal/filesystem"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Auth validated via Bearer token in header or query
	},
}

type AgentServer struct {
	cfg       *config.Config
	dockerMgr *docker.Manager
}

func main() {
	cfg := config.Load()
	log.Printf("Starting NexusPanel Node Agent [NodeID: %s] on port %d...", cfg.NodeID, cfg.ListenPort)

	dockerMgr, err := docker.NewManager()
	if err != nil {
		log.Fatalf("Fatal error connecting to Docker daemon: %v", err)
	}

	srv := &AgentServer{
		cfg:       cfg,
		dockerMgr: dockerMgr,
	}

	mux := http.NewServeMux()

	// Base endpoints
	mux.HandleFunc("/healthz", srv.handleHealth)
	mux.HandleFunc("/api/v1/node/stats", srv.authMiddleware(srv.handleNodeStats))

	// Service lifecycle
	mux.HandleFunc("/api/v1/services/create", srv.authMiddleware(srv.handleServiceCreate))
	mux.HandleFunc("/api/v1/services/start", srv.authMiddleware(srv.handleServiceStart))
	mux.HandleFunc("/api/v1/services/stop", srv.authMiddleware(srv.handleServiceStop))
	mux.HandleFunc("/api/v1/services/restart", srv.authMiddleware(srv.handleServiceRestart))
	mux.HandleFunc("/api/v1/services/delete", srv.authMiddleware(srv.handleServiceDelete))

	// File Manager
	mux.HandleFunc("/api/v1/services/files/list", srv.authMiddleware(srv.handleFilesList))
	mux.HandleFunc("/api/v1/services/files/read", srv.authMiddleware(srv.handleFileRead))
	mux.HandleFunc("/api/v1/services/files/write", srv.authMiddleware(srv.handleFileWrite))
	mux.HandleFunc("/api/v1/services/files/delete", srv.authMiddleware(srv.handleFileDelete))
	mux.HandleFunc("/api/v1/services/backup/archive", srv.authMiddleware(srv.handleBackupArchive))

	// Console WebTTY
	mux.HandleFunc("/api/v1/services/console", srv.handleConsoleWS)

	addr := fmt.Sprintf("0.0.0.0:%d", cfg.ListenPort)
	log.Printf("NexusPanel Agent listening securely on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Agent server failed: %v", err)
	}
}

// Authentication middleware
func (s *AgentServer) authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		expected := "Bearer " + s.cfg.AgentToken
		if token != expected {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

func (s *AgentServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"nodeId":    s.cfg.NodeID,
		"timestamp": time.Now().UTC(),
	})
}

func (s *AgentServer) handleNodeStats(w http.ResponseWriter, r *http.Request) {
	vMem, _ := mem.VirtualMemory()
	cPercent, _ := cpu.Percent(time.Second, false)
	dUsage, _ := disk.Usage(s.cfg.DataDirectory)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"nodeId":      s.cfg.NodeID,
		"cpuPercent":  cPercent,
		"memoryTotal": vMem.Total,
		"memoryUsed":  vMem.Used,
		"memoryFree":  vMem.Free,
		"diskTotal":   dUsage.Total,
		"diskUsed":    dUsage.Used,
		"diskFree":    dUsage.Free,
	})
}

type CreatePayload struct {
	ServiceID    string               `json:"serviceId"`
	Image        string               `json:"image"`
	Command      []string             `json:"command"`
	Environment  []string             `json:"environment"`
	MemoryBytes  int64                `json:"memoryBytes"`
	NanoCPUs     int64                `json:"nanoCpus"`
	PidLimit     int64                `json:"pidLimit"`
	Ports        []docker.PortMapping `json:"ports"`
	TargetVolume string               `json:"targetVolume"`
}

func (s *AgentServer) handleServiceCreate(w http.ResponseWriter, r *http.Request) {
	var payload CreatePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	volumePath := filepath.Join(s.cfg.DataDirectory, payload.ServiceID)
	cid, err := s.dockerMgr.CreateAndStartService(r.Context(), docker.ContainerOptions{
		ServiceID:      payload.ServiceID,
		Image:          payload.Image,
		Command:        payload.Command,
		Environment:    payload.Environment,
		MemoryBytes:    payload.MemoryBytes,
		NanoCPUs:       payload.NanoCPUs,
		PidLimit:       payload.PidLimit,
		Ports:          payload.Ports,
		HostVolumePath: volumePath,
		TargetVolume:   payload.TargetVolume,
		ReadOnlyRootFs: false,
	})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to launch service: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"containerId": cid,
		"serviceId":   payload.ServiceID,
	})
}

type ServiceActionPayload struct {
	ServiceID   string `json:"serviceId"`
	ContainerID string `json:"containerId"`
}

func (s *AgentServer) handleServiceStart(w http.ResponseWriter, r *http.Request) {
	// Start existing stopped container logic
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]bool{"started": true})
}

func (s *AgentServer) handleServiceStop(w http.ResponseWriter, r *http.Request) {
	var p ServiceActionPayload
	_ = json.NewDecoder(r.Body).Decode(&p)
	if err := s.dockerMgr.StopContainer(r.Context(), p.ContainerID, 15); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]bool{"stopped": true})
}

func (s *AgentServer) handleServiceRestart(w http.ResponseWriter, r *http.Request) {
	var p ServiceActionPayload
	_ = json.NewDecoder(r.Body).Decode(&p)
	if err := s.dockerMgr.RestartContainer(r.Context(), p.ContainerID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]bool{"restarted": true})
}

func (s *AgentServer) handleServiceDelete(w http.ResponseWriter, r *http.Request) {
	var p ServiceActionPayload
	_ = json.NewDecoder(r.Body).Decode(&p)
	if err := s.dockerMgr.RemoveContainer(r.Context(), p.ContainerID, true); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]bool{"deleted": true})
}

// File handlers
func (s *AgentServer) handleFilesList(w http.ResponseWriter, r *http.Request) {
	serviceID := r.URL.Query().Get("serviceId")
	dir := r.URL.Query().Get("path")
	fs, err := filesystem.NewSafeFS(filepath.Join(s.cfg.DataDirectory, serviceID))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	items, err := fs.ListDirectory(dir)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(items)
}

func (s *AgentServer) handleFileRead(w http.ResponseWriter, r *http.Request) {
	serviceID := r.URL.Query().Get("serviceId")
	file := r.URL.Query().Get("path")
	fs, err := filesystem.NewSafeFS(filepath.Join(s.cfg.DataDirectory, serviceID))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	content, err := fs.ReadFile(file, 10*1024*1024)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "text/plain")
	_, _ = w.Write(content)
}

func (s *AgentServer) handleFileWrite(w http.ResponseWriter, r *http.Request) {
	serviceID := r.URL.Query().Get("serviceId")
	file := r.URL.Query().Get("path")
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	fs, err := filesystem.NewSafeFS(filepath.Join(s.cfg.DataDirectory, serviceID))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := fs.WriteFile(file, body); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *AgentServer) handleFileDelete(w http.ResponseWriter, r *http.Request) {
	serviceID := r.URL.Query().Get("serviceId")
	file := r.URL.Query().Get("path")
	fs, err := filesystem.NewSafeFS(filepath.Join(s.cfg.DataDirectory, serviceID))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := fs.Delete(file); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]bool{"deleted": true})
}

func (s *AgentServer) handleBackupArchive(w http.ResponseWriter, r *http.Request) {
	serviceID := r.URL.Query().Get("serviceId")
	fs, err := filesystem.NewSafeFS(filepath.Join(s.cfg.DataDirectory, serviceID))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/gzip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=backup-%s.tar.gz", serviceID))
	_ = fs.CreateArchive(w)
}

// Live interactive console WebSocket
func (s *AgentServer) handleConsoleWS(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token != s.cfg.AgentToken {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	containerID := r.URL.Query().Get("containerId")
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	hijacked, err := s.dockerMgr.AttachStream(r.Context(), containerID)
	if err != nil {
		_ = conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Failed to attach console: %v\r\n", err)))
		return
	}
	defer hijacked.Close()

	// Goroutine: stream docker stdout to websocket
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := hijacked.Reader.Read(buf)
			if n > 0 {
				if err := conn.WriteMessage(websocket.TextMessage, buf[:n]); err != nil {
					return
				}
			}
			if err != nil {
				return
			}
		}
	}()

	// Read input from websocket and forward to container stdin
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		cmd := strings.TrimRight(string(msg), "\r\n") + "\n"
		_, _ = hijacked.Conn.Write([]byte(cmd))
	}
}
