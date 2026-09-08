// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package clusterfile

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"golang.org/x/sys/unix"
	utilyaml "k8s.io/apimachinery/pkg/util/yaml"
	"sigs.k8s.io/yaml"

	"github.com/labring/sealos/pkg/constants"
)

const ModeTransitionFilename = "control-plane-transition.json"

// LockMaintenance serializes lifecycle operations using the same cluster
// inventory. A durable transition marker blocks unrelated mutations on retry.
func LockMaintenance(name string, conversion bool) (func(), error) {
	return lockMaintenance(name, conversion, false)
}

func LockLifecycleMaintenance(name string) (func(), error) {
	return lockMaintenance(name, false, true)
}

func lockMaintenance(name string, conversion, lifecycle bool) (func(), error) {
	dir := constants.ClusterDir(name)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, err
	}
	file, err := os.OpenFile(filepath.Join(dir, "maintenance.lock"), os.O_CREATE|os.O_RDWR, 0o600)
	if err != nil {
		return nil, err
	}
	if err := unix.Flock(int(file.Fd()), unix.LOCK_EX|unix.LOCK_NB); err != nil {
		file.Close()
		return nil, fmt.Errorf("another lifecycle command is using this cluster: %w", err)
	}
	release := func() {
		_ = unix.Flock(int(file.Fd()), unix.LOCK_UN)
		_ = file.Close()
	}
	if !conversion {
		if _, err := os.Stat(filepath.Join(dir, ModeTransitionFilename)); !os.IsNotExist(err) {
			release()
			return nil, fmt.Errorf("control-plane mode conversion is incomplete; resume with sealos switch")
		}
	}
	if !lifecycle {
		if _, err := os.Stat(filepath.Join(dir, LifecycleFilename)); !os.IsNotExist(err) {
			release()
			return nil, fmt.Errorf("standalone lifecycle is incomplete; resume the original command")
		}
	}
	return release, nil
}

// SetControlPlaneMode preserves all Clusterfile documents and unknown fields.
// Only the cluster's committed mode changes after every host has been verified.
func SetControlPlaneMode(path, mode string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	data, err = replaceControlPlaneMode(data, mode)
	if err != nil {
		return err
	}
	return WriteMaintenanceFile(path, data)
}

func replaceControlPlaneMode(data []byte, mode string) ([]byte, error) {
	decoder := utilyaml.NewYAMLOrJSONDecoder(bytes.NewReader(data), 4096)
	var result bytes.Buffer
	count := 0
	for {
		var doc map[string]interface{}
		err := decoder.Decode(&doc)
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
		if len(doc) == 0 {
			continue
		}
		if doc["kind"] == "Cluster" {
			count++
			spec, ok := doc["spec"].(map[string]interface{})
			if !ok {
				return nil, fmt.Errorf("Cluster spec is missing")
			}
			spec["controlPlaneMode"] = mode
		}
		encoded, err := yaml.Marshal(doc)
		if err != nil {
			return nil, err
		}
		if result.Len() != 0 {
			result.WriteString("---\n")
		}
		result.Write(encoded)
	}
	if count != 1 {
		return nil, fmt.Errorf("expected one Cluster document, found %d", count)
	}
	return result.Bytes(), nil
}

func WriteMaintenanceJSON(path string, value interface{}) error {
	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	return WriteMaintenanceFile(path, data)
}

func WriteMaintenanceFile(path string, data []byte) error {
	file, err := os.CreateTemp(filepath.Dir(path), ".sealos-maintenance-")
	if err != nil {
		return err
	}
	defer os.Remove(file.Name())
	defer file.Close()
	if err := file.Chmod(0o600); err != nil {
		return err
	}
	if _, err := file.Write(data); err != nil {
		return err
	}
	if err := file.Sync(); err != nil {
		return err
	}
	if err := file.Close(); err != nil {
		return err
	}
	if err := os.Rename(file.Name(), path); err != nil {
		return err
	}
	dir, err := os.Open(filepath.Dir(path))
	if err != nil {
		return err
	}
	defer dir.Close()
	return dir.Sync()
}
