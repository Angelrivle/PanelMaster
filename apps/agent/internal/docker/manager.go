package docker

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
)

type ContainerOptions struct {
	ServiceID      string
	Image          string
	Command        []string
	Environment    []string
	MemoryBytes    int64
	NanoCPUs       int64
	PidLimit       int64
	BlkioWeight    uint16
	Ports          []PortMapping
	HostVolumePath string
	TargetVolume   string
	ReadOnlyRootFs Boolean
}

type Boolean = bool

type PortMapping struct {
	HostPort      int
	ContainerPort int
	Protocol      string // "tcp" or "udp"
}

type Manager struct {
	cli *client.Client
}

func NewManager() (*Manager, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("failed to init docker client: %w", err)
	}
	return &Manager{cli: cli}, nil
}

// PullImage pulls image if not present locally
func (m *Manager) PullImage(ctx context.Context, imageName string) error {
	reader, err := m.cli.ImagePull(ctx, imageName, image.PullOptions{})
	if err != nil {
		return err
	}
	defer reader.Close()
	_, _ = io.Copy(io.Discard, reader)
	return nil
}

// CreateAndStartService creates container with production hardening and starts it
func (m *Manager) CreateAndStartService(ctx context.Context, opts ContainerOptions) (string, error) {
	containerName := fmt.Sprintf("nexus-%s", opts.ServiceID)

	// Ensure image exists
	if err := m.PullImage(ctx, opts.Image); err != nil {
		// Log and continue if already local
		fmt.Printf("Notice: pull failed or cached image used for %s: %v\n", opts.Image, err)
	}

	// Prepare Port bindings
	exposedPorts := nat.PortSet{}
	portBindings := nat.PortMap{}

	for _, p := range opts.Ports {
		proto := strings.ToLower(p.Protocol)
		if proto == "" {
			proto = "tcp"
		}
		natPort, err := nat.NewPort(proto, fmt.Sprintf("%d", p.ContainerPort))
		if err != nil {
			continue
		}
		exposedPorts[natPort] = struct{}{}
		portBindings[natPort] = []nat.PortBinding{
			{
				HostIP:   "0.0.0.0",
				HostPort: fmt.Sprintf("%d", p.HostPort),
			},
		}
	}

	// Prepare mounts
	if err := os.MkdirAll(opts.HostVolumePath, 0755); err != nil {
		return "", fmt.Errorf("failed to create host data directory: %w", err)
	}

	targetMount := opts.TargetVolume
	if targetMount == "" {
		targetMount = "/data"
	}
	binds := []string{
		fmt.Sprintf("%s:%s:rw", filepath.Clean(opts.HostVolumePath), targetMount),
	}

	// Container config
	config := &container.Config{
		Image:        opts.Image,
		Cmd:          opts.Command,
		Env:          opts.Environment,
		ExposedPorts: exposedPorts,
		AttachStdin:  true,
		AttachStdout: true,
		AttachStderr: true,
		OpenStdin:    true,
		Tty:          true,
	}

	// Hardening and strict resource limits
	pidsLimit := opts.PidLimit
	if pidsLimit <= 0 {
		pidsLimit = 512
	}

	blkioWeight := opts.BlkioWeight
	if blkioWeight < 10 || blkioWeight > 1000 {
		blkioWeight = 500
	}

	hostConfig := &container.HostConfig{
		PortBindings: portBindings,
		Binds:        binds,
		RestartPolicy: container.RestartPolicy{
			Name: "unless-stopped",
		},
		Resources: container.Resources{
			Memory:      opts.MemoryBytes,
			NanoCPUs:    opts.NanoCPUs,
			PidsLimit:   &pidsLimit,
			BlkioWeight: blkioWeight,
		},
		SecurityOpt: []string{
			"no-new-privileges:true",
		},
		ReadonlyRootfs: opts.ReadOnlyRootFs,
	}

	networkingConfig := &network.NetworkingConfig{}

	// Create
	resp, err := m.cli.ContainerCreate(ctx, config, hostConfig, networkingConfig, nil, containerName)
	if err != nil {
		return "", fmt.Errorf("docker create failed: %w", err)
	}

	// Start
	if err := m.cli.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		return resp.ID, fmt.Errorf("docker start failed: %w", err)
	}

	return resp.ID, nil
}

// StopContainer safely stops container with timeout
func (m *Manager) StopContainer(ctx context.Context, containerID string, timeoutSec int) error {
	stopTimeout := timeoutSec
	if stopTimeout <= 0 {
		stopTimeout = 15
	}
	return m.cli.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &stopTimeout})
}

// RestartContainer restarts container
func (m *Manager) RestartContainer(ctx context.Context, containerID string) error {
	timeout := 15
	return m.cli.ContainerRestart(ctx, containerID, container.StopOptions{Timeout: &timeout})
}

// RemoveContainer removes container
func (m *Manager) RemoveContainer(ctx context.Context, containerID string, force bool) error {
	return m.cli.ContainerRemove(ctx, containerID, container.RemoveOptions{
		Force:         force,
		RemoveVolumes: false,
	})
}

// GetContainerStats fetches CPU and memory real-time stats
func (m *Manager) GetContainerStats(ctx context.Context, containerID string) (io.ReadCloser, error) {
	stats, err := m.cli.ContainerStats(ctx, containerID, false)
	if err != nil {
		return nil, err
	}
	return stats.Body, nil
}

// AttachStream attaches to stdin/stdout/stderr for live console
func (m *Manager) AttachStream(ctx context.Context, containerID string) (container.HijackedResponse, error) {
	return m.cli.ContainerAttach(ctx, containerID, container.AttachOptions{
		Stream: true,
		Stdin:  true,
		Stdout: true,
		Stderr: true,
	})
}
