// Copyright © 2026 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package clusterfile

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/types/v1beta1"
	"golang.org/x/sys/unix"
	utilyaml "k8s.io/apimachinery/pkg/util/yaml"
	"sigs.k8s.io/yaml"
)

const ModeTransitionFilename = "control-plane-transition.json"

// LockMaintenance serializes lifecycle operations using the same cluster
// inventory. A durable transition marker blocks unrelated mutations on retry.
func LockMaintenance(name string, conversion bool) (func(), error) {
	return lockMaintenance(name, conversion)
}

func LockLifecycleMaintenance(name string) (func(), error) {
	return lockMaintenance(name, false)
}

func lockMaintenance(name string, conversion bool) (func(), error) {
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
			return nil, errors.New(
				"control-plane mode conversion is incomplete; resume with sealos switch control-plane",
			)
		}
	}
	return release, nil
}

// SetControlPlaneMode preserves all Clusterfile documents and unknown fields.
// Only the cluster's committed mode changes after every host has been verified.
// A non-nil controller commits the effective route-controller settings next to
// the mode so later conversions and node additions reuse them.
func SetControlPlaneMode(path, mode string, controller *v1beta1.RouteControllerConfig) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	data, err = replaceControlPlaneMode(data, mode, controller)
	if err != nil {
		return err
	}
	return WriteMaintenanceFile(path, data)
}

func replaceControlPlaneMode(
	data []byte,
	mode string,
	controller *v1beta1.RouteControllerConfig,
) ([]byte, error) {
	decoder := utilyaml.NewYAMLOrJSONDecoder(bytes.NewReader(data), 4096)
	var result bytes.Buffer
	count := 0
	for {
		var doc map[string]any
		err := decoder.Decode(&doc)
		if errors.Is(err, io.EOF) {
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
			spec, ok := doc["spec"].(map[string]any)
			if !ok {
				return nil, errors.New("Cluster spec is missing")
			}
			spec["controlPlaneMode"] = mode
			if controller != nil {
				saved, _ := spec["routeController"].(map[string]any)
				if saved == nil {
					saved = make(map[string]any)
				}
				// Only selected fields are rewritten; unknown keys are kept.
				if controller.Enabled != nil {
					saved["enabled"] = *controller.Enabled
				}
				// A nil pointer leaves the saved value untouched; an explicit
				// empty string clears it back to automatic discovery.
				for name, value := range map[string]*string{
					"podCIDR":     controller.PodCIDR,
					"serviceCIDR": controller.ServiceCIDR,
					"routerCIDR":  controller.RouterCIDR,
				} {
					switch {
					case value == nil:
					case *value == "":
						delete(saved, name)
					default:
						saved[name] = *value
					}
				}
				if controller.Image != "" {
					saved["image"] = controller.Image
				}
				if controller.Kubeconfig != "" {
					saved["kubeconfig"] = controller.Kubeconfig
				}
				if controller.Config != "" {
					saved["config"] = controller.Config
				}
				if controller.Table != 0 {
					saved["table"] = controller.Table
				}
				if controller.Protocol != 0 {
					saved["protocol"] = controller.Protocol
				}
				if len(saved) != 0 {
					spec["routeController"] = saved
				}
			}
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

func WriteMaintenanceJSON(path string, value any) error {
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
