// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package kubernetes

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/Masterminds/semver/v3"
	"github.com/labring/sealos/pkg/runtime/kubernetes/standalone"
	"github.com/labring/sealos/pkg/utils/logger"
	v1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	patchtypes "k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"
	clientset "k8s.io/client-go/kubernetes"
)

func shellArgument(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "'\"'\"'") + "'"
}

func (k *KubeadmRuntime) upgradeStandaloneCluster(version string) error {
	if err := standalone.ValidateVersionChange(k.getKubeVersionFromImage(), version); err != nil {
		return err
	}
	exp, err := k.getKubeExpansion()
	if err != nil {
		return err
	}
	config, err := exp.FetchKubeadmConfig(context.Background())
	if err != nil {
		return err
	}
	workerConfig, err := exp.FetchKubeletConfig(context.Background())
	if err != nil {
		return err
	}
	config += "\n---\n" + workerConfig
	client, err := k.getKubeInterface()
	if err != nil {
		return err
	}
	workerNames := make(map[string]string)
	for _, host := range k.getNodeIPAndPortList() {
		name, err := exp.FetchHostNameFromInternalIP(context.Background(), host)
		if err != nil {
			return err
		}
		node, err := client.Kubernetes().
			CoreV1().
			Nodes().
			Get(context.Background(), name, metav1.GetOptions{})
		if err != nil {
			return err
		}
		if err := standalone.ValidateVersionChange(
			node.Status.NodeInfo.KubeletVersion,
			version,
		); err != nil {
			return fmt.Errorf("worker %s: %w", name, err)
		}
		workerNames[host] = name
	}
	proxy, err := client.Kubernetes().
		CoreV1().
		ConfigMaps("kube-system").
		Get(context.Background(), "kube-proxy", metav1.GetOptions{})
	if err == nil {
		if data := proxy.Data["config.conf"]; data != "" {
			config += "\n---\n" + data
		}
	} else if !apierrors.IsNotFound(err) {
		return err
	}
	if err := os.MkdirAll(k.pathResolver.TmpPath(), 0o700); err != nil {
		return err
	}
	dir, err := os.MkdirTemp(k.pathResolver.TmpPath(), "standalone-upgrade-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(dir)
	localConfig := filepath.Join(dir, "cluster.yaml")
	if err := os.WriteFile(localConfig, []byte(config), 0o600); err != nil {
		return err
	}
	const remoteConfig = "/var/lib/sealos/standalone-upgrades/input.yaml"
	command := strings.Join([]string{
		shellArgument(k.pathResolver.RootFSSealctlPath()), "standalone-upgrade",
		"--version", shellArgument(version), "--config", shellArgument(remoteConfig),
		"--binary-dir", shellArgument(k.pathResolver.RootFSBinPath()),
	}, " ")
	if patches := k.kubeadmConfig.InitConfiguration.Patches; patches != nil &&
		patches.Directory != "" {
		command += " --patches " + shellArgument(patches.Directory)
	}
	masters := k.getMasterIPAndPortList()
	// Validate every control plane before taking the first one out of service.
	for _, host := range masters {
		if err := k.sshCmdAsync(
			host,
			"install -d -m 700 /var/lib/sealos/standalone-upgrades",
		); err != nil {
			return err
		}
		if err := k.sshCopy(host, localConfig, remoteConfig); err != nil {
			return err
		}
		if err := k.sshCmdAsync(host, command+" --check-only"); err != nil {
			return fmt.Errorf("standalone preflight on %s: %w", host, err)
		}
	}
	for _, host := range masters {
		logger.Info("upgrade standalone control plane %s", host)
		if err := k.sshCmdAsync(host, command); err != nil {
			return fmt.Errorf("standalone upgrade on %s: %w", host, err)
		}
	}
	master0 := k.getMaster0IPAndPort()
	configArg := " --config " + shellArgument(standalone.CompletedConfigPath)
	if err := k.sshCmdAsync(
		master0,
		"kubeadm init phase upload-config kubeadm"+configArg,
	); err != nil {
		return err
	}
	if err := k.sshFetch(
		master0,
		"/etc/kubernetes/admin.conf",
		k.pathResolver.AdminFile(),
	); err != nil {
		return err
	}
	if err := k.syncLocalAdminKubeConfigCopies(); err != nil {
		return err
	}
	// Registered workers can use kubeadm's normal node upgrade. Their kubelet
	// configuration remains the cluster's worker configuration.
	for _, host := range k.getNodeIPAndPortList() {
		name := workerNames[host]
		node, err := client.Kubernetes().
			CoreV1().
			Nodes().
			Get(context.Background(), name, metav1.GetOptions{})
		if err != nil {
			return err
		}
		wasCordoned := node.Spec.Unschedulable
		if !wasCordoned {
			_, err := client.Kubernetes().CoreV1().Nodes().Patch(
				context.Background(), name, patchtypes.MergePatchType,
				[]byte(`{"spec":{"unschedulable":true}}`), metav1.PatchOptions{},
			)
			if err != nil {
				return err
			}
		}
		bin := shellArgument(k.pathResolver.RootFSBinPath())
		if err := k.sshCmdAsyncSeq(host,
			fmt.Sprintf(installKubeadmCmd, bin),
			"kubeadm upgrade node phase kubelet-config",
			fmt.Sprintf(installKubectlCmd, bin),
			fmt.Sprintf(installKubeletCmd, bin),
			daemonReload,
		); err != nil {
			return err
		}
		// Use the worker's clock, which also timestamps its Node conditions.
		// A Ready condition from before restart must not complete the upgrade.
		restarted, err := k.sshCmdToString(host, restartKubelet+" && date +%s")
		if err != nil {
			return err
		}
		seconds, err := strconv.ParseInt(strings.TrimSpace(restarted), 10, 64)
		if err != nil {
			return fmt.Errorf("read worker restart time: %w", err)
		}
		restartedAt := time.Unix(seconds, 0)
		target, err := semver.NewVersion(version)
		if err != nil {
			return err
		}
		if err := wait.PollUntilContextTimeout(
			context.Background(),
			5*time.Second,
			5*time.Minute,
			true,
			func(ctx context.Context) (bool, error) {
				node, err := client.Kubernetes().
					CoreV1().
					Nodes().
					Get(ctx, name, metav1.GetOptions{})
				if err != nil {
					return false, err
				}
				return upgradedWorkerReady(node, target, restartedAt), nil
			},
		); err != nil {
			return fmt.Errorf("worker %s has not become Ready at %s: %w", name, version, err)
		}
		if !wasCordoned {
			_, err := client.Kubernetes().CoreV1().Nodes().Patch(
				context.Background(), name, patchtypes.MergePatchType,
				[]byte(`{"spec":{"unschedulable":false}}`), metav1.PatchOptions{},
			)
			if err != nil {
				return err
			}
		}
	}
	_, dnsErr := client.Kubernetes().
		AppsV1().
		Deployments("kube-system").
		Get(context.Background(), "coredns", metav1.GetOptions{})
	_, proxyErr := client.Kubernetes().
		AppsV1().
		DaemonSets("kube-system").
		Get(context.Background(), "kube-proxy", metav1.GetOptions{})
	for _, addon := range []struct {
		name string
		err  error
	}{
		{
			name: "coredns",
			err:  dnsErr,
		},
		{
			name: "kube-proxy",
			err:  proxyErr,
		},
	} {
		if apierrors.IsNotFound(addon.err) {
			continue
		}
		if addon.err != nil {
			return addon.err
		}
		if err := k.sshCmdAsync(
			master0,
			"kubeadm init phase addon "+addon.name+configArg,
		); err != nil {
			return err
		}
		if err := wait.PollUntilContextTimeout(
			context.Background(),
			5*time.Second,
			5*time.Minute,
			true,
			func(ctx context.Context) (bool, error) {
				return standaloneAddonReady(ctx, client.Kubernetes(), addon.name)
			},
		); err != nil {
			return fmt.Errorf("addon %s rollout failed: %w", addon.name, err)
		}
	}
	return nil
}

func upgradedWorkerReady(node *v1.Node, target *semver.Version, restartedAt time.Time) bool {
	actual, err := semver.NewVersion(node.Status.NodeInfo.KubeletVersion)
	if err != nil || !actual.Equal(target) {
		return false
	}
	for _, condition := range node.Status.Conditions {
		if condition.Type == v1.NodeReady && condition.Status == v1.ConditionTrue &&
			condition.LastHeartbeatTime.After(restartedAt) {
			return true
		}
	}
	return false
}

func standaloneAddonReady(
	ctx context.Context,
	client clientset.Interface,
	name string,
) (bool, error) {
	switch name {
	case "coredns":
		deployment, err := client.AppsV1().
			Deployments("kube-system").
			Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			return false, err
		}
		desired := int32(1)
		if deployment.Spec.Replicas != nil {
			desired = *deployment.Spec.Replicas
		}
		status := deployment.Status
		return status.ObservedGeneration >= deployment.Generation &&
			status.UpdatedReplicas == desired &&
			status.Replicas == desired &&
			status.AvailableReplicas == desired, nil
	case "kube-proxy":
		daemonSet, err := client.AppsV1().
			DaemonSets("kube-system").
			Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			return false, err
		}
		status := daemonSet.Status
		return status.ObservedGeneration >= daemonSet.Generation &&
			status.UpdatedNumberScheduled == status.DesiredNumberScheduled &&
			status.NumberAvailable == status.DesiredNumberScheduled, nil
	default:
		return false, fmt.Errorf("unknown kubeadm addon: %s", name)
	}
}
