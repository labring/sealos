// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	cri "k8s.io/cri-api/pkg/apis/runtime/v1"
)

type ResetOptions struct {
	DestroyCluster     bool
	CheckOnly          bool
	Timeout            time.Duration
	Output             io.Writer
	AllowUninitialized bool
}

type resetState struct {
	Endpoint       string
	Peer           string
	ClusterID      uint64
	MemberID       uint64
	EtcdEndpoints  []string
	DataPaths      []string
	RouteTable     int
	RouteProtocol  int
	Detached       bool
	DestroyCluster bool
	Complete       bool
	AllowAbsent    bool
}

const resetStatePath = modeRoot + "/reset.json"

func Reset(ctx context.Context, options ResetOptions) error {
	if options.AllowUninitialized && !options.DestroyCluster {
		return fmt.Errorf("allow-uninitialized is only valid for whole-cluster destruction")
	}
	return maintenance(ctx, options.Timeout, func(ctx context.Context) error {
		return resetStandalone(ctx, options)
	})
}

func resetStandalone(ctx context.Context, options ResetOptions) error {
	state := &resetState{}
	data, err := os.ReadFile(resetStatePath)
	if err == nil {
		if err := json.Unmarshal(data, state); err != nil {
			return err
		}
		if state.DestroyCluster != options.DestroyCluster {
			return fmt.Errorf("resume reset with the original destroy-cluster setting")
		}
		if state.Complete {
			return nil
		}
	} else if os.IsNotExist(err) {
		data, err := os.ReadFile(filepath.Join(modeRoot, "state.json"))
		if err != nil {
			if !os.IsNotExist(err) {
				return err
			}
			state, err = resetBootstrapState(options.DestroyCluster)
			if err != nil {
				if options.DestroyCluster && options.AllowUninitialized && errors.Is(err, os.ErrNotExist) {
					return resetUninitializedHost(options.CheckOnly)
				}
				return err
			}
		} else {
			state, err = resetModeState(data, options.DestroyCluster)
			if err != nil {
				return err
			}
		}
		pod, err := readPod(filepath.Join(manifestDir, "etcd.yaml"))
		if err == nil {
			state.Peer = flagValue(componentArgs(pod), "initial-advertise-peer-urls")
			if state.Peer == "" || strings.Contains(state.Peer, ",") {
				return fmt.Errorf("cannot identify a unique local etcd peer URL")
			}
			for _, flag := range []string{"data-dir", "wal-dir"} {
				value := flagValue(componentArgs(pod), flag)
				if value == "" {
					continue
				}
				path, err := mountedHostPath(pod, value)
				if err != nil {
					return err
				}
				state.DataPaths = append(state.DataPaths, path)
			}
		} else if !os.IsNotExist(err) {
			return err
		}
	} else {
		return err
	}
	if state.Endpoint == "" || state.RouteTable <= 0 || state.RouteProtocol < 1 || state.RouteProtocol > 255 {
		return fmt.Errorf("invalid standalone reset baseline")
	}
	for _, path := range state.DataPaths {
		if err := validateEtcdRemovalPath(path); err != nil {
			return err
		}
	}
	if !options.CheckOnly {
		if err := saveResetState(state); err != nil {
			return err
		}
	}
	if !state.Detached && state.Peer != "" && !options.DestroyCluster {
		if err := detachEtcdMember(ctx, state, options.CheckOnly); err != nil {
			return err
		}
	}
	if options.CheckOnly {
		return nil
	}
	state.Detached = true
	if err := saveResetState(state); err != nil {
		return err
	}
	if err := maintenanceCommand(ctx, options.Output, "systemctl", "stop", "kubelet"); err != nil {
		return err
	}
	runtime, err := connectRuntime(ctx, state.Endpoint)
	if err != nil {
		return err
	}
	defer runtime.close()
	sandboxes, err := runtime.ListPodSandbox(ctx, &cri.ListPodSandboxRequest{})
	if err != nil {
		return err
	}
	for _, sandbox := range sandboxes.Items {
		if _, err := runtime.StopPodSandbox(ctx, &cri.StopPodSandboxRequest{
			PodSandboxId: sandbox.Id,
		}); err != nil {
			return err
		}
		if _, err := runtime.RemovePodSandbox(ctx, &cri.RemovePodSandboxRequest{
			PodSandboxId: sandbox.Id,
		}); err != nil {
			return err
		}
	}
	if err := removeReservedRoutes(state.RouteTable, state.RouteProtocol); err != nil {
		return err
	}
	// Membership was handled above. This public phase only stops workloads and
	// unmounts/cleans kubelet files; it does not discover etcd through mirror Pods.
	if err := maintenanceCommand(ctx, options.Output, "kubeadm", "reset", "phase", "cleanup-node", "--cri-socket", state.Endpoint); err != nil {
		return err
	}
	if err := verifyResetCleanup(); err != nil {
		return err
	}
	for _, path := range state.DataPaths {
		if err := os.RemoveAll(path); err != nil {
			return err
		}
	}
	for _, path := range []string{modeDropin, registeredDropin, bootstrapStatePath, filepath.Join(modeRoot, "state.json"), CompletedConfigPath, modeRoot + "/input.json", modeRoot + "/bootstrap-kubeadm.yaml"} {
		if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
			return err
		}
	}
	if err := os.RemoveAll(filepath.Join(modeRoot, "shared")); err != nil {
		return err
	}
	if err := maintenanceCommand(ctx, options.Output, "systemctl", "daemon-reload"); err != nil {
		return err
	}
	state.Complete = true
	return saveResetState(state)
}

func resetUninitializedHost(checkOnly bool) error {
	for _, name := range []string{"kubelet.conf", "bootstrap-kubelet.conf", "admin.conf"} {
		path := filepath.Join("/etc/kubernetes", name)
		if _, err := os.Lstat(path); !os.IsNotExist(err) {
			return fmt.Errorf("host has Kubernetes credentials without a managed baseline: %s", path)
		}
	}
	entries, err := os.ReadDir(manifestDir)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	if len(entries) != 0 {
		return fmt.Errorf("host has static manifests without a managed baseline")
	}
	if checkOnly {
		return nil
	}
	return saveResetState(&resetState{Complete: true, DestroyCluster: true})
}

func saveResetState(state *resetState) error {
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	return atomicModeFile(resetStatePath, data, 0o600)
}

func validateEtcdRemovalPath(path string) error {
	clean := filepath.Clean(path)
	if !filepath.IsAbs(path) || clean != path {
		return fmt.Errorf("etcd removal path must be absolute and clean: %s", path)
	}
	// Only remove a dedicated data directory. Ancestors of managed configuration
	// or system roots cannot be accepted as data/WAL mounts.
	for _, protected := range []string{"/etc", "/usr", "/bin", "/sbin", "/lib", "/lib64", "/proc", "/sys", "/dev", "/var/lib/sealos", "/var/lib/kubelet", "/run", "/opt", "/home", "/root"} {
		if clean == protected || strings.HasPrefix(protected, clean+"/") || strings.HasPrefix(clean, protected+"/") || clean == "/" {
			return fmt.Errorf("refusing to remove unsafe etcd data path %s", path)
		}
	}
	// Reject symlinks in any ancestor, including dangling links. RemoveAll does
	// not follow the final link, but a symlinked parent redirects its traversal.
	for current := clean; current != "/"; current = filepath.Dir(current) {
		info, err := os.Lstat(current)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return err
		}
		if info.Mode()&os.ModeSymlink != 0 {
			return fmt.Errorf("etcd data path contains a symlink: %s", current)
		}
	}
	return nil
}

func detachEtcdMember(ctx context.Context, state *resetState, checkOnly bool) error {
	client, err := removalEtcdClient(state.EtcdEndpoints)
	if err != nil {
		return err
	}
	defer client.Close()
	list, err := client.MemberList(ctx)
	if err != nil {
		return err
	}
	if state.ClusterID != 0 && state.ClusterID != list.Header.ClusterId {
		return fmt.Errorf("etcd cluster identity changed during removal")
	}
	member, err := memberByPeer(list.Members, state.Peer)
	if err != nil {
		return err
	}
	if member == nil {
		for _, candidate := range list.Members {
			if candidate.ID == state.MemberID {
				return fmt.Errorf("saved etcd member now advertises a different peer URL")
			}
		}
		if state.MemberID == 0 && !state.AllowAbsent {
			return fmt.Errorf("local etcd peer is not a member of the selected cluster")
		}
		return nil
	}
	if state.MemberID != 0 && member.ID != state.MemberID {
		return fmt.Errorf("etcd member identity changed during removal")
	}
	if err := checkRemovalQuorum(ctx, client, list.Members, member.ID, list.Header.ClusterId); err != nil {
		return err
	}
	if checkOnly {
		return nil
	}
	state.ClusterID = list.Header.ClusterId
	state.MemberID = member.ID
	state.EtcdEndpoints = nil
	for _, survivor := range list.Members {
		if survivor.ID != member.ID && !survivor.IsLearner {
			state.EtcdEndpoints = append(state.EtcdEndpoints, survivor.ClientURLs...)
		}
	}
	if err := saveResetState(state); err != nil {
		return err
	}
	_, err = client.MemberRemove(ctx, member.ID)
	return err
}
