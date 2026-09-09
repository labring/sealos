// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package clusterfile

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"slices"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/utils/iputils"
)

// WithJoinPreflight records which hosts were checked before this operation
// installed containerd. The caller must hold the lifecycle maintenance lease.
// Retrying the same journal can then resume a partially completed bootstrap.
func WithJoinPreflight(name string, hosts []string, check func([]string) error) error {
	return withHostPreflight(name, hosts, false, check)
}

// WithRootfsPreflight checkpoints the image's own host checks separately from
// the containerd check. An interrupted installation must not skip failed checks.
func WithRootfsPreflight(name string, hosts []string, check func([]string) error) error {
	return withHostPreflight(name, hosts, true, check)
}

func withHostPreflight(name string, hosts []string, rootfs bool, check func([]string) error) error {
	path := filepath.Join(constants.ClusterDir(name), LifecycleFilename)
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	var journal lifecycleInventory
	if err := json.Unmarshal(data, &journal); err != nil {
		return err
	}
	if journal.Action != "apply" {
		return errors.New("join preflight requires an active apply journal")
	}
	var pending []string
	completed := journal.JoinPreflightHosts
	if rootfs {
		completed = journal.RootfsPreflightHosts
	}
	for _, host := range hosts {
		if !containsPreflightHost(journal.Hosts, iputils.GetHostIP(host)) {
			return errors.New("join host is outside the active lifecycle inventory")
		}
		if !containsPreflightHost(completed, host) {
			pending = append(pending, host)
		}
	}
	if len(pending) == 0 {
		return nil
	}
	if err := check(pending); err != nil {
		return err
	}
	if rootfs {
		journal.RootfsPreflightHosts = append(journal.RootfsPreflightHosts, pending...)
	} else {
		journal.JoinPreflightHosts = append(journal.JoinPreflightHosts, pending...)
	}
	return WriteMaintenanceJSON(path, journal)
}

func containsPreflightHost(hosts []string, target string) bool {
	return slices.Contains(hosts, target)
}
