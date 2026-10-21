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
	v1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	kubeletconfig "k8s.io/kubelet/config/v1beta1"
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
		if saved.Enabled != nil {
			controller.Enabled = *saved.Enabled
		}
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
	// Fetch credentials before publishing the worker configuration through the API.
	if err := k.sshFetch(
		host,
		"/etc/kubernetes/admin.conf",
		k.pathResolver.AdminFile(),
	); err != nil {
		return err
	}
	externalEtcd := k.kubeadmConfig.Etcd.External != nil
	if err := k.cacheStandalonePKI(externalEtcd); err != nil {
		return err
	}
	if err := k.uploadStandaloneKubeletConfig(); err != nil {
		return err
	}
	configArg := " --config " + shellArgument(k.getInitMasterKubeadmConfigFilePath())
	if err := k.InitKubeadmConfigToMaster0(); err != nil {
		return err
	}
	for _, phase := range []string{"upload-config kubeadm", "bootstrap-token", "addon all"} {
		if err := k.sshCmdAsync(host, "kubeadm init phase "+phase+configArg); err != nil {
			return err
		}
	}
	return k.copyMasterKubeConfig(host)
}

// kubeadm's upload-config kubelet phase also patches the local Node's CRI
// annotation. Publish the worker configuration and its read permissions through
// client-go so fresh standalone clusters never need that Node to exist. Workers
// apply their kubeadm version's defaults when loading this component config.
func (k *KubeadmRuntime) uploadStandaloneKubeletConfig() error {
	client, err := k.getKubeInterface()
	if err != nil {
		return err
	}
	config := k.kubeadmConfig.KubeletConfiguration.DeepCopy()
	config.APIVersion = kubeletconfig.SchemeGroupVersion.String()
	config.Kind = "KubeletConfiguration"
	data, err := yaml.Marshal(config)
	if err != nil {
		return err
	}
	resources := sealoskube.NewKubeIdempotency(client.Kubernetes())
	if err := resources.CreateOrUpdateConfigMap(&v1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "kubelet-config",
			Namespace: metav1.NamespaceSystem,
		},
		Data: map[string]string{"kubelet": string(data)},
	}); err != nil {
		return err
	}
	const roleName = "kubeadm:kubelet-config"
	if err := resources.CreateOrUpdateRole(&rbacv1.Role{
		ObjectMeta: metav1.ObjectMeta{
			Name:      roleName,
			Namespace: metav1.NamespaceSystem,
		},
		Rules: []rbacv1.PolicyRule{
			{
				Verbs:         []string{"get"},
				APIGroups:     []string{""},
				Resources:     []string{"configmaps"},
				ResourceNames: []string{"kubelet-config"},
			},
		},
	}); err != nil {
		return err
	}
	return resources.CreateOrUpdateRoleBinding(&rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      roleName,
			Namespace: metav1.NamespaceSystem,
		},
		RoleRef: rbacv1.RoleRef{
			APIGroup: rbacv1.GroupName,
			Kind:     "Role",
			Name:     roleName,
		},
		Subjects: []rbacv1.Subject{
			{Kind: rbacv1.GroupKind, Name: "system:nodes", APIGroup: rbacv1.GroupName},
			{
				Kind:     rbacv1.GroupKind,
				Name:     "system:bootstrappers:kubeadm:default-node-token",
				APIGroup: rbacv1.GroupName,
			},
		},
	})
}

func (k *KubeadmRuntime) joinStandaloneMasters(hosts []string) error {
	if len(hosts) == 0 {
		return nil
	}
	var existing []string
	for _, host := range k.getMasterIPAndPortList() {
		if !slices.Contains(hosts, host) {
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
			Config:         config,
			Controller:     controller,
			Join:           true,
			InitialCluster: k.cluster.CreationTimestamp.IsZero(),
			EtcdEndpoints:  endpoints,
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

func standaloneSharedPKIFiles(externalEtcd bool) []string {
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
	return files
}

// Native kubeadm bootstrap creates PKI on the host. Ordinary certificate and
// upgrade commands also need its signing material in the local Sealos cache.
func (k *KubeadmRuntime) cacheStandalonePKI(externalEtcd bool) error {
	destination := k.pathResolver.PkiPath()
	if err := os.MkdirAll(destination, 0o700); err != nil {
		return err
	}
	dir, err := os.MkdirTemp(filepath.Dir(destination), ".standalone-pki-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(dir)
	files := standaloneSharedPKIFiles(externalEtcd)
	for _, name := range files {
		local := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(local), 0o700); err != nil {
			return err
		}
		remote := filepath.Join(kubernetesEtcPKI, name)
		if err := k.sshFetch(k.getMaster0IPAndPort(), remote, local); err != nil {
			return fmt.Errorf("cache control-plane signing material %s: %w", name, err)
		}
		if err := os.Chmod(local, 0o600); err != nil {
			return err
		}
	}
	// Fetch every file before replacing a previously usable cache.
	for _, name := range files {
		target := filepath.Join(destination, name)
		if err := os.MkdirAll(filepath.Dir(target), 0o700); err != nil {
			return err
		}
		if err := os.Rename(filepath.Join(dir, name), target); err != nil {
			return err
		}
	}
	return nil
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
	for _, file := range standaloneSharedPKIFiles(externalEtcd) {
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
		var err error
		if destroy {
			err = k.sshCmdAsync(host, command)
		} else {
			err = k.removeStandaloneMaster(host, command)
		}
		if err != nil {
			return fmt.Errorf("standalone removal on %s paused: %w", host, err)
		}
	}
	return nil
}
