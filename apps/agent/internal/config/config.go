package config

import (
	"os"
	"strconv"
)

type Config struct {
	NodeID          string
	PanelURL        string
	AgentToken      string
	ListenPort      int
	DataDirectory   string
	DockerSocket    string
	LogLevel        string
	TLSCertPath     string
	TLSKeyPath      string
}

func Load() *Config {
	port, err := strconv.Atoi(getEnv("AGENT_PORT", "8443"))
	if err != nil {
		port = 8443
	}

	return &Config{
		NodeID:        getEnv("NODE_ID", "node-local"),
		PanelURL:      getEnv("PANEL_URL", "http://localhost:3000"),
		AgentToken:    getEnv("AGENT_TOKEN", "nexus-dev-secret-token"),
		ListenPort:    port,
		DataDirectory: getEnv("DATA_DIR", "/var/lib/nexuspanel/volumes"),
		DockerSocket:  getEnv("DOCKER_HOST", "unix:///var/run/docker.sock"),
		LogLevel:      getEnv("LOG_LEVEL", "info"),
		TLSCertPath:   getEnv("TLS_CERT_PATH", ""),
		TLSKeyPath:    getEnv("TLS_KEY_PATH", ""),
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
