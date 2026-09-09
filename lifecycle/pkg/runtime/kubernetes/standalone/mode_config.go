// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"bytes"
	"encoding/json"
	"errors"
	"maps"
	"os"
	"path/filepath"
	"strings"

	"sigs.k8s.io/yaml"
)

const (
	ModeRegistered    = "registered"
	ModeStandalone    = "standalone"
	modeRoot          = "/var/lib/sealos/control-plane-mode"
	modeDropin        = "/etc/systemd/system/kubelet.service.d/99-sealos-standalone.conf"
	routeManifestPath = manifestDir + "/sealos-route-controller.yaml"
)

var standaloneSettings = map[string]any{
	"enableServer":            false,
	"enableDebuggingHandlers": false,
	"readOnlyPort":            0,
	"healthzPort":             0,
	"registerNode":            false,
	"rotateCertificates":      false,
	"serverTLSBootstrap":      false,
}

func modeArgs(args []string) ([]string, error) {
	if !filepath.IsAbs(flagValue(args, "config")) || flagValue(args, "config-dir") != "" {
		return nil, errors.New("mode switching requires an absolute --config and no --config-dir")
	}
	// These flags override the public configuration and must not re-enable
	// API calls or kubelet serving in standalone mode.
	remove := map[string]bool{
		"kubeconfig":                   true,
		"bootstrap-kubeconfig":         true,
		"register-node":                true,
		"rotate-certificates":          true,
		"rotate-server-certificates":   true,
		"authentication-token-webhook": true,
		"authorization-mode":           true,
		"enable-server":                true,
		"enable-debugging-handlers":    true,
		"read-only-port":               true,
		"healthz-port":                 true,
	}
	var result []string
	for i := 0; i < len(args); i++ {
		name := strings.TrimPrefix(strings.SplitN(args[i], "=", 2)[0], "--")
		if remove[name] {
			if !strings.Contains(args[i], "=") && i+1 < len(args) &&
				!strings.HasPrefix(args[i+1], "--") {
				i++
			}
			continue
		}
		result = append(result, args[i])
	}
	return standaloneArgs(result)
}

// Save and restore only the fields changed by conversion. A subsequent
// standalone upgrade may have migrated unrelated configuration fields.
func convertKubeletConfig(
	data []byte,
	original map[string]json.RawMessage,
) ([]byte, map[string]json.RawMessage, error) {
	var config map[string]json.RawMessage
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, nil, err
	}
	if original != nil {
		for key, value := range original {
			if len(value) == 0 || bytes.Equal(bytes.TrimSpace(value), []byte("null")) {
				delete(config, key)
			} else {
				config[key] = value
			}
		}
		result, err := yaml.Marshal(config)
		return result, original, err
	}
	settings := make(map[string]any, len(standaloneSettings)+2)
	maps.Copy(settings, standaloneSettings)
	var auth map[string]any
	if value := config["authentication"]; value != nil {
		if err := json.Unmarshal(value, &auth); err != nil {
			return nil, nil, err
		}
	}
	if auth == nil {
		auth = make(map[string]any)
	}
	webhook, _ := auth["webhook"].(map[string]any)
	if webhook == nil {
		webhook = make(map[string]any)
	}
	webhook["enabled"] = false
	auth["webhook"] = webhook
	settings["authentication"] = auth
	settings["authorization"] = map[string]any{
		"mode": "AlwaysAllow",
	}
	original = make(map[string]json.RawMessage, len(settings))
	for key, value := range settings {
		original[key] = config[key]
		encoded, err := json.Marshal(value)
		if err != nil {
			return nil, nil, err
		}
		config[key] = encoded
	}
	result, err := yaml.Marshal(config)
	return result, original, err
}

func atomicModeFile(path string, data []byte, mode os.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	file, err := os.CreateTemp(filepath.Dir(path), ".sealos-mode-")
	if err != nil {
		return err
	}
	defer os.Remove(file.Name())
	defer file.Close()
	if err := file.Chmod(mode); err != nil {
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
