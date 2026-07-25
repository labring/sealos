// Copyright © 2021 Alibaba Group Holding Ltd.
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
	"errors"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/labring/sealos/pkg/cert"
	"github.com/labring/sealos/pkg/runtime"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
)

const (
	AdminConf      = "admin.conf"
	SuperAdminConf = "super-admin.conf"
	ControllerConf = "controller-manager.conf"
	SchedulerConf  = "scheduler.conf"
	KubeletConf    = "kubelet.conf"
)

func (k *KubeadmRuntime) localKubeVersion() string {
	if version := k.getKubeVersion(); version != "" {
		return version
	}
	return k.getKubeVersionFromImage()
}

func (k *KubeadmRuntime) Renew(opts runtime.CertRenewOptions) error {
	normalizedTargets, renewAll, err := normalizeRenewTargets(opts.Targets)
	if err != nil {
		return err
	}
	if err = validateRenewGroups(normalizedTargets, renewAll, opts.Groups); err != nil {
		return err
	}

	if renewAll {
		return k.renewAllLocalCertMaterials(opts.Groups)
	}

	hostName, err := k.execHostname(k.getMaster0IPAndPort())
	if err != nil {
		return fmt.Errorf("get hostname failed %v", err)
	}
	localTargets := effectiveLocalKubeConfigRenewTargets(normalizedTargets, k.localKubeVersion())
	if err = renewLocalKubeConfigFiles(k, hostName, localTargets, opts.Groups); err != nil {
		return err
	}
	if shouldEnsureAdminClusterRoleBinding(k.localKubeVersion(), opts.Groups, false, localTargets) {
		if err = k.ensureAdminClusterRoleBinding(); err != nil {
			return err
		}
	}
	if containsRenewTarget(normalizedTargets, AdminConf) {
		if err := k.syncLocalAdminKubeConfigCopies(); err != nil {
			return err
		}
	}
	k.cli = nil
	return nil
}

func containsRenewTarget(targets []string, want string) bool {
	for _, target := range targets {
		if target == want {
			return true
		}
	}
	return false
}

func effectiveLocalKubeConfigRenewTargets(targets []string, kubeVersion string) []string {
	effectiveTargets := append([]string{}, targets...)
	if containsRenewTarget(targets, AdminConf) && certUsesClusterAdminsIdentityModel(kubeVersion) && !containsRenewTarget(targets, SuperAdminConf) {
		effectiveTargets = append(effectiveTargets, SuperAdminConf)
	}
	return effectiveTargets
}

func (k *KubeadmRuntime) renewAllLocalCertMaterials(adminOrganizations []string) error {
	if err := k.mergeWithBuiltinKubeadmConfig(); err != nil {
		if strings.TrimSpace(k.getServiceCIDR()) == "" {
			return fmt.Errorf("load cluster networking and certSANs for local cert renew: %w", err)
		}
		logger.Warn("failed to refresh kubeadm config for local cert renew, using local config: %s", err.Error())
	}

	hostName, err := k.execHostname(k.getMaster0IPAndPort())
	if err != nil {
		return fmt.Errorf("get hostname failed %v", err)
	}
	if err := cert.RenewLeafCertsForKubeVersion(
		k.pathResolver.PkiPath(),
		k.pathResolver.PkiEtcdPath(),
		k.getCertSANs(),
		k.getMaster0IP(),
		hostName,
		k.getServiceCIDR(),
		k.getDNSDomain(),
		k.localKubeVersion(),
	); err != nil {
		return fmt.Errorf("failed to renew local pki files: %w", err)
	}
	localTargets := defaultLocalKubeConfigFiles(k.localKubeVersion())
	if err := renewLocalKubeConfigFiles(k, hostName, localTargets, adminOrganizations); err != nil {
		return err
	}
	if shouldEnsureAdminClusterRoleBinding(k.localKubeVersion(), adminOrganizations, true, localTargets) {
		if err := k.ensureAdminClusterRoleBinding(); err != nil {
			return err
		}
	}
	if err := k.syncLocalAdminKubeConfigCopies(); err != nil {
		return err
	}
	k.cli = nil
	return nil
}

func renewLocalKubeConfigFiles(k *KubeadmRuntime, hostName string, files []string, adminOrganizations []string) error {
	return renewLocalKubeConfigFilesForVersion(k, hostName, k.localKubeVersion(), files, adminOrganizations)
}

func renewLocalKubeConfigFilesForVersion(k *KubeadmRuntime, hostName, kubeVersion string, files []string, adminOrganizations []string) error {
	certConfig := cert.Config{
		Path:     k.pathResolver.PkiPath(),
		BaseName: "ca",
	}
	if err := cert.RenewKubeConfigFilesForKubeVersion(
		k.pathResolver.EtcPath(),
		certConfig,
		hostName,
		k.getClusterAPIServer(),
		"kubernetes",
		adminOrganizations,
		kubeVersion,
		files...,
	); err != nil {
		return fmt.Errorf("failed to renew local kubeconfig files %v: %w", files, err)
	}
	return nil
}

func defaultLocalKubeConfigFiles(kubeVersion string) []string {
	files := []string{AdminConf, ControllerConf, SchedulerConf, KubeletConf}
	if certUsesClusterAdminsIdentityModel(kubeVersion) {
		files = append(files, SuperAdminConf)
	}
	return files
}

func remoteControlPlaneKubeConfigFiles(includeKubelet bool) []string {
	// super-admin.conf is intentionally kept local to the sealos host.
	files := []string{AdminConf, ControllerConf, SchedulerConf}
	if includeKubelet {
		files = append(files, KubeletConf)
	}
	return files
}

func certUsesClusterAdminsIdentityModel(kubeVersion string) bool {
	return cert.UsesClusterAdminsIdentityModel(kubeVersion)
}

func shouldEnsureAdminClusterRoleBinding(kubeVersion string, adminOrganizations []string, renewAll bool, targets []string) bool {
	if !certUsesClusterAdminsIdentityModel(kubeVersion) || adminOrganizations != nil {
		return false
	}
	if renewAll {
		return true
	}
	for _, target := range targets {
		if target == AdminConf {
			return true
		}
	}
	return false
}

func (k *KubeadmRuntime) fetchMasterKubeConfigFile(name string) (string, error) {
	localPath := filepath.Join(k.pathResolver.EtcPath(), name)
	if err := os.MkdirAll(k.pathResolver.EtcPath(), 0o755); err != nil {
		return "", fmt.Errorf("create local etc dir for %s: %w", name, err)
	}
	remotePath := path.Join(kubernetesEtc, name)
	if err := k.sshFetch(k.getMaster0IPAndPort(), remotePath, localPath); err != nil {
		return "", fmt.Errorf("fetch %s from master0: %w", remotePath, err)
	}
	return localPath, nil
}

// resolvePrivilegedKubeConfig returns a kubeconfig that still has cluster-admin
// privileges on the live cluster. Prefer master0 copies over sealos-managed local
// files, which may be signed by stale PKI from a previous partial upgrade.
func (k *KubeadmRuntime) resolvePrivilegedKubeConfig() (string, error) {
	if kubeconfig, err := k.fetchMasterKubeConfigFile(SuperAdminConf); err == nil {
		return kubeconfig, nil
	}
	if kubeconfig, err := k.fetchMasterKubeConfigFile(AdminConf); err == nil {
		return kubeconfig, nil
	}
	localSuperAdmin := filepath.Join(k.pathResolver.EtcPath(), SuperAdminConf)
	if file.IsExist(localSuperAdmin) {
		return localSuperAdmin, nil
	}
	return k.pathResolver.AdminFile(), nil
}

func (k *KubeadmRuntime) resolveSuperAdminKubeConfig() (string, error) {
	return k.resolvePrivilegedKubeConfig()
}

func isRetryableKubernetesClientError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "connection refused") ||
		strings.Contains(msg, "no route to host") ||
		strings.Contains(msg, "i/o timeout") ||
		strings.Contains(msg, "TLS handshake timeout") ||
		strings.Contains(msg, "EOF")
}

func (k *KubeadmRuntime) ensureAdminClusterRoleBinding() error {
	kubeconfig, err := k.resolvePrivilegedKubeConfig()
	if err != nil {
		return err
	}
	apiserver := k.getClusterAPIServer()

	clusterRoleBinding := &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name: "kubeadm:cluster-admins",
		},
		RoleRef: rbacv1.RoleRef{
			APIGroup: rbacv1.GroupName,
			Kind:     "ClusterRole",
			Name:     "cluster-admin",
		},
		Subjects: []rbacv1.Subject{
			{
				Kind: rbacv1.GroupKind,
				Name: "kubeadm:cluster-admins",
			},
		},
	}

	deadline := time.Now().Add(2 * time.Minute)
	var lastErr error
	for {
		client, err := kubernetes.NewKubernetesClient(kubeconfig, apiserver)
		if err != nil {
			return fmt.Errorf("build kubernetes client from %s: %w", kubeconfig, err)
		}
		lastErr = kubernetes.NewKubeIdempotency(client.Kubernetes()).CreateOrUpdateClusterRoleBinding(clusterRoleBinding)
		if lastErr == nil {
			return nil
		}
		if !isRetryableKubernetesClientError(lastErr) || time.Now().After(deadline) {
			return fmt.Errorf("ensure kubeadm:cluster-admins ClusterRoleBinding: %w", lastErr)
		}
		logger.Warn("api-server not ready while ensuring kubeadm:cluster-admins ClusterRoleBinding, retrying: %s", lastErr.Error())
		time.Sleep(5 * time.Second)
	}
}

func normalizeRenewTargets(targets []string) ([]string, bool, error) {
	allowed := map[string]struct{}{
		"all":          {},
		AdminConf:      {},
		SuperAdminConf: {},
		ControllerConf: {},
		SchedulerConf:  {},
		KubeletConf:    {},
	}

	normalized := make([]string, 0, len(targets))
	seen := make(map[string]struct{}, len(targets))
	for _, target := range targets {
		t := strings.TrimSpace(target)
		if t == "" {
			continue
		}
		if _, ok := allowed[t]; !ok {
			return nil, false, fmt.Errorf("unsupported renew target %q", t)
		}
		if _, ok := seen[t]; ok {
			continue
		}
		seen[t] = struct{}{}
		normalized = append(normalized, t)
	}
	if len(normalized) == 0 {
		return nil, false, errors.New("at least one renew target must be specified")
	}
	if _, ok := seen["all"]; ok {
		return normalized, true, nil
	}
	return normalized, false, nil
}

func validateRenewGroups(targets []string, renewAll bool, groups []string) error {
	if groups == nil || renewAll {
		return nil
	}
	for _, target := range targets {
		if target == AdminConf {
			return nil
		}
	}
	return errors.New("renew groups can only be used with target admin.conf or all")
}

func (k *KubeadmRuntime) UpdateCertSANs(certSans []string) error {
	// set extra cert SANs for kubeadm configmap object
	if err := k.CompleteKubeadmConfig(setCGroupDriverAndSocket, setCertificateKey); err != nil {
		return err
	}
	setCertSANS := func() error {
		if err := k.mergeWithBuiltinKubeadmConfig(); err != nil {
			return err
		}
		if len(certSans) != 0 {
			k.setCertSANs(append(k.getCertSANs(), certSans...))
		}
		return nil
	}
	pipeline := []func() error{
		setCertSANS,
		k.initCert,
		k.saveNewKubeadmConfig,
		k.uploadConfigFromKubeadm,
		k.syncCert,
		k.deleteAPIServer,
		k.showKubeadmCert,
	}
	for i, f := range pipeline {
		if err := f(); err != nil {
			return fmt.Errorf("failed to generate cert %v in %d", err, i)
		}
	}
	return nil
}

func (k *KubeadmRuntime) saveNewKubeadmConfig() error {
	logger.Info("start to save new kubeadm config...")
	exp, err := k.getKubeExpansion()
	if err != nil {
		return err
	}
	data, err := exp.FetchKubeadmConfig(context.Background())
	if err != nil {
		return err
	}
	//unmarshal data from configmap
	obj, err := yaml.UnmarshalToMap([]byte(data))
	if err != nil {
		return err
	}
	logger.Debug("current cluster config data: %+v", obj)
	//set certs to obj interface
	err = unstructured.SetNestedStringSlice(obj, k.getCertSANs(), "apiServer", "certSANs")
	if err != nil {
		return err
	}
	certPath := path.Join(k.pathResolver.EtcPath(), defaultUpdateKubeadmFileName)
	return yaml.MarshalFile(certPath, obj)
}

func (k *KubeadmRuntime) uploadConfigFromKubeadm() error {
	logger.Info("start to upload kubeadm config for inCluster ...")
	in := path.Join(k.pathResolver.EtcPath(), defaultUpdateKubeadmFileName)
	out := path.Join(k.pathResolver.ConfigsPath(), defaultUpdateKubeadmFileName)
	data, err := file.ReadAll(in)
	if err != nil {
		return err
	}
	logger.Debug("current update yaml data is %s", string(data))
	err = k.sshCopy(k.getMaster0IPAndPort(), in, out)
	if err != nil {
		return fmt.Errorf("copy config update kubeadm yaml error: %s", err.Error())
	}
	cmd := k.Command(UpdateCluster)
	if cmd == "" {
		return fmt.Errorf("get config update kubeadm command failed, kubernetes version is %s", k.getKubeVersion())
	}
	if err = k.sshCmdAsync(k.getMaster0IPAndPort(), cmd); err != nil {
		return fmt.Errorf("failed to exec update kubeadm config %s %v", k.getMaster0IPAndPort(), err)
	}
	return nil
}

func (k *KubeadmRuntime) InitCertsAndKubeConfigs() error {
	logger.Info("start to generate cert and kubeConfig...")
	for _, ipAndPort := range k.getMasterIPAndPortList() {
		if err := k.sshCmdAsync(ipAndPort, "rm -rf /etc/kubernetes/admin.conf"); err != nil {
			return err
		}
	}
	if err := k.initCert(); err != nil {
		return err
	}
	if err := k.CreateKubeConfigFiles(); err != nil {
		return fmt.Errorf("failed to generate kubernetes conf: %w", err)
	}
	return k.SendJoinMasterKubeConfigs(k.getMasterIPAndPortList()[:1], remoteControlPlaneKubeConfigFiles(true)...)
}

func (k *KubeadmRuntime) initCert() error {
	return k.runPipelines("init cert", k.GenerateCert, func() error {
		return k.sendNewCertAndKey([]string{k.getMaster0IPAndPort()})
	})
}

func (k *KubeadmRuntime) syncCert() error {
	return k.runPipelines("sync all masters cert", func() error {
		for _, master := range k.getMasterIPAndPortList()[1:] {
			logger.Debug("start to generate cert for master %s", master)
			err := k.execCert(master)
			if err != nil {
				return fmt.Errorf("failed to create cert for master %s: %v", master, err)
			}

			err = k.copyMasterKubeConfig(master)
			if err != nil {
				return err
			}
			logger.Info("succeeded generate cert %s as master", master)
		}
		return nil
	})
}

func (k *KubeadmRuntime) showKubeadmCert() error {
	certCheck := "kubeadm certs check-expiration"
	return k.sshCmdAsync(k.getMaster0IPAndPort(), fmt.Sprintf("%s%s", certCheck, vlogToStr(k.klogLevel)))
}

func (k *KubeadmRuntime) deleteAPIServer() error {
	logger.Info("delete pod apiserver from crictl")
	return k.deleteStaticPod(kubernetes.KubeAPIServer)
}
