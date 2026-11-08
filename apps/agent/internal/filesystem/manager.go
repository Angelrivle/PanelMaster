package filesystem

import (
	"archive/tar"
	"compress/gzip"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type FileItem struct {
	Name         string    `json:"name"`
	Path         string    `json:"path"`
	Size         int64     `json:"size"`
	IsDirectory  bool      `json:"isDirectory"`
	ModifiedTime time.Time `json:"modifiedTime"`
	Mode         string    `json:"mode"`
}

type SafeFS struct {
	baseDir string
}

func NewSafeFS(baseDir string) (*SafeFS, error) {
	cleanBase, err := filepath.Abs(filepath.Clean(baseDir))
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(cleanBase, 0755); err != nil {
		return nil, err
	}
	return &SafeFS{baseDir: cleanBase}, nil
}

// sanitizePath resolves path relative to baseDir and protects against directory traversal
func (fs *SafeFS) sanitizePath(userPath string) (string, error) {
	cleaned := filepath.Clean("/" + userPath)
	fullPath := filepath.Join(fs.baseDir, cleaned)

	// Verify path is enclosed within baseDir
	rel, err := filepath.Rel(fs.baseDir, fullPath)
	if err != nil || strings.HasPrefix(rel, "..") {
		return "", errors.New("access denied: path traversal detected")
	}

	return fullPath, nil
}

// ListDirectory lists files in target path safely
func (fs *SafeFS) ListDirectory(relPath string) ([]FileItem, error) {
	target, err := fs.sanitizePath(relPath)
	if err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(target)
	if err != nil {
		return nil, err
	}

	var items []FileItem
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}
		cleanRel, _ := filepath.Rel(fs.baseDir, filepath.Join(target, entry.Name()))
		items = append(items, FileItem{
			Name:         entry.Name(),
			Path:         filepath.ToSlash(cleanRel),
			Size:         info.Size(),
			IsDirectory:  entry.IsDir(),
			ModifiedTime: info.ModTime(),
			Mode:         info.Mode().String(),
		})
	}
	return items, nil
}

// ReadFile reads contents of a file safely
func (fs *SafeFS) ReadFile(relPath string, maxBytes int64) ([]byte, error) {
	target, err := fs.sanitizePath(relPath)
	if err != nil {
		return nil, err
	}

	f, err := os.Open(target)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	if maxBytes <= 0 {
		maxBytes = 10 * 1024 * 1024 // 10MB default limit for editor
	}

	return io.ReadAll(io.LimitReader(f, maxBytes))
}

// WriteFile writes contents to target file safely
func (fs *SafeFS) WriteFile(relPath string, content []byte) error {
	target, err := fs.sanitizePath(relPath)
	if err != nil {
		return err
	}

	// Ensure parent directory exists
	if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
		return err
	}

	return os.WriteFile(target, content, 0644)
}

// Delete removes file or directory
func (fs *SafeFS) Delete(relPath string) error {
	target, err := fs.sanitizePath(relPath)
	if err != nil {
		return err
	}

	if target == fs.baseDir {
		return errors.New("cannot delete root service directory")
	}

	return os.RemoveAll(target)
}

// CreateArchive creates a tar.gz backup archive stream
func (fs *SafeFS) CreateArchive(writer io.Writer) error {
	gw := gzip.NewWriter(writer)
	defer gw.Close()
	tw := tar.NewWriter(gw)
	defer tw.Close()

	return filepath.Walk(fs.baseDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(fs.baseDir, path)
		if err != nil || relPath == "." {
			return nil
		}

		header, err := tar.FileInfoHeader(info, info.Name())
		if err != nil {
			return err
		}

		header.Name = filepath.ToSlash(relPath)
		if err := tw.WriteHeader(header); err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		_, err = io.Copy(tw, file)
		return err
	})
}
