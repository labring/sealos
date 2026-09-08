// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"fmt"
	"strings"
)

// Bootstrap supports kubeadm's standard host layout. Reject conflicting public
// overrides before generating keys or changing membership.
func validateBootstrapLayout(cluster map[string]interface{}) error {
	if dir, _ := cluster["certificatesDir"].(string); dir != "" && dir != "/etc/kubernetes/pki" {
		return fmt.Errorf("standalone bootstrap requires certificatesDir=/etc/kubernetes/pki")
	}
	gates, _ := cluster["featureGates"].(map[string]interface{})
	if gates["RootlessControlPlane"] == true {
		return fmt.Errorf("standalone bootstrap does not support RootlessControlPlane")
	}
	etcd, _ := cluster["etcd"].(map[string]interface{})
	local, _ := etcd["local"].(map[string]interface{})
	if local == nil {
		return nil
	}
	dataDir, _ := local["dataDir"].(string)
	if dataDir != "" {
		if err := validateEtcdRemovalPath(dataDir); err != nil {
			return err
		}
	}
	args, err := publicExtraArgs(local["extraArgs"])
	if err != nil {
		return err
	}
	for name := range args {
		switch name {
		case "name", "data-dir", "wal-dir", "initial-cluster", "initial-cluster-state",
			"initial-advertise-peer-urls", "listen-peer-urls", "advertise-client-urls",
			"listen-client-urls", "cert-file", "key-file", "trusted-ca-file",
			"peer-cert-file", "peer-key-file", "peer-trusted-ca-file":
			return fmt.Errorf("standalone bootstrap requires kubeadm-managed etcd identity and paths; remove extraArgs.%s", name)
		}
	}
	return nil
}

func publicExtraArgs(value interface{}) (map[string]string, error) {
	result := make(map[string]string)
	switch args := value.(type) {
	case nil:
	case map[string]interface{}:
		for name, value := range args {
			text, ok := value.(string)
			if !ok || name == "" || strings.HasPrefix(name, "-") {
				return nil, fmt.Errorf("invalid extraArgs entry %q", name)
			}
			result[name] = text
		}
	case []interface{}:
		for _, item := range args {
			arg, ok := item.(map[string]interface{})
			if !ok {
				return nil, fmt.Errorf("invalid extraArgs entry")
			}
			name, _ := arg["name"].(string)
			value, ok := arg["value"].(string)
			if name == "" || strings.HasPrefix(name, "-") || !ok {
				return nil, fmt.Errorf("invalid extraArgs entry %q", name)
			}
			result[name] = value
		}
	default:
		return nil, fmt.Errorf("invalid extraArgs format")
	}
	return result, nil
}
