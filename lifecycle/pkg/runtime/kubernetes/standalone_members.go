// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package kubernetes

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"

	sealoskube "github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/runtime/kubernetes/standalone"
	"github.com/labring/sealos/pkg/utils/iputils"
	"sigs.k8s.io/yaml"
)

func (k *KubeadmRuntime) initStandaloneMaster() error {
	config, err := k.generateInitConfigs()
	if err != nil {
		return err
	}
	if err := k.CopyStaticFilesToMasters(); err != nil {
		return err
	}
	controller := standalone.DefaultRouteControllerOptions()
	if saved := k.cluster.Spec.RouteController; saved != nil {
		if saved.Image != "" {
			controller.Image = saved.Image
		}
		if saved.Kubeconfig != "" {
			controller.Kubeconfig = saved.Kubeconfig
		}
		controller.Config = saved.Config
		if saved.Table != 0 {
			controller.Table = saved.Table
		}
		if saved.Protocol != 0 {
			controller.Protocol = saved.Protocol
		}
	}
	host := k.getMaster0IPAndPort()
	command, err := k.prepareStandaloneBootstrap(host, standalone.BootstrapPlan{
		Config:     config,
		Controller: controller,
	})
	if err != nil {
		return err
	}
	if err := k.sshCmdAsync(host, command+" --check-only"); err != nil {
		return err
	}
	if err := k.imagePull(host, ""); err != nil {
		return err
	}
	if err := k.sshCmdAsync(host, command); err != nil {
		return err
	}
	// These phases operate through the API and do not require a control-plane
	// Node. Keep the uploaded kubelet configuration suitable for workers.
	configArg := " --config " + shellArgument(k.getInitMasterKubeadmConfigFilePath())
	if err := k.InitKubeadmConfigToMaster0(); err != nil {
		return err
	}
	for _, phase := range []string{"upload-config all", "bootstrap-token", "addon all"} {
		if err := k.sshCmdAsync(host, "kubeadm init phase "+phase+configArg); err != nil {
			return err
		}
	}
	if err := k.sshFetch(
		host,
		"/etc/kubernetes/admin.conf",
		k.pathResolver.AdminFile(),
	); err != nil {
		return err
	}
	return k.copyMasterKubeConfig(host)
}

func (k *KubeadmRuntime) joinStandaloneMasters(hosts []string) error {
	if len(hosts) == 0 {
		return nil
	}
	var existing []string
	for _, host := range k.getMasterIPAndPortList() {
		if !containsHost(hosts, host) {
			existing = append(existing, host)
		}
	}
	if len(existing) == 0 {
		return errors.New("standalone join requires an existing control plane")
	}
	seed := existing[0]
	client, err := sealoskube.NewKubernetesClient(
		k.pathResolver.AdminFile(),
		"https://"+net.JoinHostPort(
			iputils.GetHostIP(seed),
			strconv.Itoa(int(k.getAPIServerPort())),
		),
	)
	if err != nil {
		return err
	}
	k.cli = client
	controllerJSON, err := k.sshCmdToString(
		seed,
		shellArgument(k.pathResolver.RootFSSealctlPath())+" standalone controller-config",
	)
	if err != nil {
		return err
	}
	var controller standalone.RouteControllerOptions
	if err := json.Unmarshal([]byte(controllerJSON), &controller); err != nil {
		return err
	}
	exp, err := k.getKubeExpansion()
	if err != nil {
		return err
	}
	clusterConfig, err := exp.FetchKubeadmConfig(context.Background())
	if err != nil {
		return err
	}
	var layout struct {
		Etcd struct {
			External any
		}
	}
	if err := yaml.Unmarshal([]byte(clusterConfig), &layout); err != nil {
		return err
	}
	externalEtcd := layout.Etcd.External != nil
	kubeletConfig, err := exp.FetchKubeletConfig(context.Background())
	if err != nil {
		return err
	}
	config := []byte(clusterConfig + "\n---\n" + kubeletConfig)
	if err := k.copyStaticFiles(hosts); err != nil {
		return err
	}
	var endpoints []string
	if !externalEtcd {
		output, err := k.sshCmdToString(
			seed,
			shellArgument(k.pathResolver.RootFSSealctlPath())+" standalone etcd-endpoints",
		)
		if err != nil {
			return err
		}
		if err := json.Unmarshal([]byte(output), &endpoints); err != nil {
			return err
		}
	}
	commands := make(map[string]string)
	for _, host := range hosts {
		if err := k.copyStandaloneSharedCredentials(seed, host, externalEtcd); err != nil {
			return err
		}
		command, err := k.prepareStandaloneBootstrap(host, standalone.BootstrapPlan{
			Config:        config,
			Controller:    controller,
			Join:          true,
			EtcdEndpoints: endpoints,
		})
		if err != nil {
			return err
		}
		commands[host] = command
		if err := k.sshCmdAsync(host, command+" --check-only"); err != nil {
			return err
		}
		if err := k.imagePull(host, ""); err != nil {
			return err
		}
	}
	for _, host := range hosts {
		if err := k.sshCmdAsync(host, commands[host]); err != nil {
			return fmt.Errorf("standalone join on %s paused: %w", host, err)
		}
		if err := k.execHostsAppend(host, host, k.getAPIServerDomain()); err != nil {
			return err
		}
		if err := k.copyMasterKubeConfig(host); err != nil {
			return err
		}
	}
	return nil
}

func (k *KubeadmRuntime) prepareStandaloneBootstrap(
	host string,
	plan standalone.BootstrapPlan,
) (string, error) {
	name, err := k.execHostname(host)
	if err != nil {
		return "", err
	}
	endpoint, err := k.getCRISocket(host)
	if err != nil {
		return "", err
	}
	if !strings.HasPrefix(endpoint, "unix://") {
		endpoint = "unix://" + endpoint
	}
	version := k.getKubeVersion()
	if version == "" {
		return "", errors.New(
			"cannot determine Kubernetes version from kubeadm configuration or committed rootfs image labels",
		)
	}
	plan.Config, err = standalone.BootstrapConfig(
		plan.Config,
		version,
		name,
		iputils.GetHostIP(host),
		endpoint,
		int(k.getAPIServerPort()),
	)
	if err != nil {
		return "", err
	}
	dir, err := os.MkdirTemp("", "sealos-bootstrap-")
	if err != nil {
		return "", err
	}
	defer os.RemoveAll(dir)
	data, err := json.MarshalIndent(plan, "", "  ")
	if err != nil {
		return "", err
	}
	local := filepath.Join(dir, "plan.json")
	if err := os.WriteFile(local, data, 0o600); err != nil {
		return "", err
	}
	remote := "/var/lib/sealos/control-plane-mode/input.json"
	if err := k.sshCmdAsync(
		host,
		"install -d -m 700 "+shellArgument(filepath.Dir(remote)),
	); err != nil {
		return "", err
	}
	if err := k.sshCopy(host, local, remote+".incoming"); err != nil {
		return "", err
	}
	// The cluster operation journal validates the request. Preserve its first
	// host plan so changing live ConfigMaps or bootstrap tokens cannot alter a retry.
	if err := k.sshCmdAsync(host, "chmod 600 -- "+shellArgument(remote+".incoming")+
		" && if test -e "+shellArgument(remote)+"; then rm -f -- "+shellArgument(remote+".incoming")+
		"; else mv -- "+shellArgument(remote+".incoming")+" "+shellArgument(remote)+"; fi"); err != nil {
		return "", err
	}
	return shellArgument(
		k.pathResolver.RootFSSealctlPath(),
	) + " standalone bootstrap --plan " + shellArgument(
		remote,
	), nil
}

func (k *KubeadmRuntime) copyStandaloneSharedCredentials(
	seed, host string,
	externalEtcd bool,
) error {
	dir, err := os.MkdirTemp("", "sealos-shared-pki-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(dir)
	files := []string{
		"ca.crt",
		"ca.key",
		"front-proxy-ca.crt",
		"front-proxy-ca.key",
		"sa.pub",
		"sa.key",
	}
	if !externalEtcd {
		files = append(files, "etcd/ca.crt", "etcd/ca.key")
	}
	for _, file := range files {
		local := filepath.Join(dir, file)
		remote := filepath.Join("/etc/kubernetes/pki", file)
		target := filepath.Join("/var/lib/sealos/control-plane-mode/shared/pki", file)
		if err := os.MkdirAll(filepath.Dir(local), 0o700); err != nil {
			return err
		}
		if err := k.sshFetch(seed, remote, local); err != nil {
			return err
		}
		if err := k.sshCmdAsync(
			host,
			"install -d -m 700 "+shellArgument(filepath.Dir(target)),
		); err != nil {
			return err
		}
		if err := k.sshCopy(host, local, target); err != nil {
			return err
		}
	}
	local := filepath.Join(dir, "admin.conf")
	if err := k.sshFetch(seed, "/etc/kubernetes/admin.conf", local); err != nil {
		return err
	}
	return k.sshCopy(host, local, "/var/lib/sealos/control-plane-mode/shared/admin.conf")
}

func (k *KubeadmRuntime) removeStandaloneMasters(
	hosts []string,
	destroy bool,
	removedWorkers ...string,
) error {
	if len(hosts) == 0 {
		return nil
	}
	if !destroy && len(hosts) >= len(k.getMasterIPAndPortList()) {
		return errors.New(
			"cannot remove every control plane; use sealos reset to destroy the cluster",
		)
	}
	command := shellArgument(k.pathResolver.RootFSSealctlPath()) + " standalone reset"
	if destroy {
		command += " --destroy-cluster --allow-uninitialized"
	}
	for _, host := range hosts {
		if err := k.sshCmdAsync(host, command+" --check-only"); err != nil {
			return err
		}
	}
	if !destroy && len(hosts) > 0 {
		if err := k.prepareStandaloneRemovalEndpoint(hosts, removedWorkers); err != nil {
			return err
		}
	}
	for _, host := range hosts {
		if err := k.sshCmdAsync(host, command); err != nil {
			return fmt.Errorf("standalone removal on %s paused: %w", host, err)
		}
	}
	return nil
}

func containsHost(hosts []string, host string) bool {
	return slices.Contains(hosts, host)
}
