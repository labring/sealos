// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"

	clientv3 "go.etcd.io/etcd/client/v3"
)

func resetModeState(data []byte, destroy bool) (*resetState, error) {
	var baseline modeState
	if err := json.Unmarshal(data, &baseline); err != nil {
		return nil, err
	}
	if baseline.Mode != ModeStandalone || baseline.Target != "" {
		return nil, errors.New("finish mode conversion before removing this control plane")
	}
	return &resetState{
		Endpoint:       baseline.Endpoint,
		RouteTable:     baseline.RouteTable,
		RouteProtocol:  baseline.RouteProtocol,
		DestroyCluster: destroy,
	}, nil
}

// Bootstrap may fail after adding a learner but before generating manifests.
// Its durable plan contains enough identity to safely detach that member.
func resetBootstrapState(destroy bool) (*resetState, error) {
	data, err := os.ReadFile(bootstrapStatePath)
	if err != nil {
		return nil, fmt.Errorf(
			"standalone reset requires a managed baseline or bootstrap journal: %w",
			err,
		)
	}
	var bootstrap bootstrapState
	if err := json.Unmarshal(data, &bootstrap); err != nil {
		return nil, err
	}
	cluster, init, _, err := bootstrapDocuments(bootstrap.Plan.Config)
	if err != nil {
		return nil, err
	}
	registration, _ := init["nodeRegistration"].(map[string]any)
	endpoint, _ := registration["criSocket"].(string)
	state := &resetState{
		Endpoint:       endpoint,
		ClusterID:      bootstrap.ClusterID,
		MemberID:       bootstrap.MemberID,
		EtcdEndpoints:  bootstrap.Plan.EtcdEndpoints,
		AllowAbsent:    bootstrap.MemberID == 0,
		RouteTable:     bootstrap.Plan.Controller.Table,
		RouteProtocol:  bootstrap.Plan.Controller.Protocol,
		DestroyCluster: destroy,
	}
	etcd, _ := cluster["etcd"].(map[string]any)
	if _, external := etcd["external"]; external {
		return state, nil
	}
	local, _ := etcd["local"].(map[string]any)
	dataDir, _ := local["dataDir"].(string)
	if dataDir == "" {
		dataDir = "/var/lib/etcd"
	}
	state.DataPaths = []string{dataDir}
	if bootstrap.ClusterID != 0 {
		api, _ := init["localAPIEndpoint"].(map[string]any)
		address, _ := api["advertiseAddress"].(string)
		state.Peer = "https://" + net.JoinHostPort(address, "2380")
	}
	return state, nil
}

func removalEtcdClient(endpoints []string) (*clientv3.Client, error) {
	api, err := readPod(filepath.Join(manifestDir, "kube-apiserver.yaml"))
	if os.IsNotExist(err) {
		return bootstrapEtcdClient(endpoints)
	}
	if err != nil {
		return nil, err
	}
	config, err := etcdConfig(api)
	if err != nil {
		return nil, err
	}
	if len(endpoints) != 0 {
		config.Endpoints = endpoints
	}
	return clientv3.New(config)
}

func verifyResetCleanup() error {
	for _, path := range []string{manifestDir, "/etc/kubernetes/pki", "/var/lib/kubelet"} {
		entries, err := os.ReadDir(path)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return err
		}
		if len(entries) != 0 {
			return fmt.Errorf(
				"kubeadm cleanup left files in %s; repair cleanup and repeat reset",
				path,
			)
		}
	}
	for _, name := range []string{"admin.conf", "super-admin.conf", "kubelet.conf", "bootstrap-kubelet.conf", "controller-manager.conf", "scheduler.conf"} {
		_, err := os.Lstat(filepath.Join("/etc/kubernetes", name))
		if err == nil {
			return fmt.Errorf("kubeadm cleanup did not remove %s", name)
		}
		if !os.IsNotExist(err) {
			return fmt.Errorf("cannot verify kubeadm cleanup of %s: %w", name, err)
		}
	}
	return nil
}
