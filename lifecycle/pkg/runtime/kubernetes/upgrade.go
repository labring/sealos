// Copyright © 2022 sealos.
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
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/Masterminds/semver/v3"
	v1 "k8s.io/api/core/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm"

	"github.com/labring/sealos/pkg/cert"
	"github.com/labring/sealos/pkg/runtime/decode"
	"github.com/labring/sealos/pkg/runtime/kubernetes/types"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
)

const (
	upgradeApplyCmd              = "kubeadm upgrade apply %s --yes --ignore-preflight-errors=SystemVerification,ControlPlaneNodesReady,CreateJob"
	upgradeApplyCmdNoCertRenewal = "kubeadm upgrade apply %s --certificate-renewal=false --yes --ignore-preflight-errors=SystemVerification,ControlPlaneNodesReady,CreateJob"
	upgradeNodeCmd               = "kubeadm upgrade node --skip-phases preflight"
	upgradeNodeCmdNoCertRenewal  = "kubeadm upgrade node --certificate-renewal=false --skip-phases preflight"
	//drainNodeCmd    = "kubectl drain %s --ignore-daemonsets"
	cordonNodeCmd   = "kubectl cordon %s"
	uncordonNodeCmd = "kubectl uncordon %s"
	daemonReload    = "systemctl daemon-reload"
	restartKubelet  = "systemctl restart kubelet"

	installKubeadmCmd = "cp -rf %s/kubeadm /usr/bin"
	installKubeletCmd = "cp -rf %s/kubelet /usr/bin"
	installKubectlCmd = "cp -rf %s/kubectl /usr/bin"
	renewCertCmd      = "kubeadm certs renew %s"

	writeKubeadmConfig = `cat > %s << EOF
%s
EOF`

	kubeletConfigPath              = "/var/lib/kubelet/config.yaml"
	apiserverKubeletClientCertName = "apiserver-kubelet-client"
	apiserverEtcdClientCertName    = "apiserver-etcd-client"
	etcdHealthcheckClientCertName  = "etcd-healthcheck-client"
	adminKubeConfigName            = "admin.conf"
)

type remoteCertMigration struct {
	name      string
	phaseName string
	files     []string
}

func (k *KubeadmRuntime) upgradeCluster(version string) error {
	logger.Info("Change ClusterConfiguration up to newVersion if need.")
	conversion, hasLocalEtcd, err := k.autoUpdateConfig(version)
	if err != nil {
		return err
	}
	if err := k.runUpgradeMigrations(conversion, version, hasLocalEtcd); err != nil {
		return err
	}
	//upgrade master0
	logger.Info("start to upgrade master0")
	err = k.upgradeMaster0(conversion, version)
	if err != nil {
		return err
	}
	//upgrade other control-planes and worker nodes
	var upgradeNodes []string
	for _, node := range append(k.getMasterIPAndPortList(), k.getNodeIPAndPortList()...) {
		if node == k.getMaster0IPAndPort() {
			continue
		}
		upgradeNodes = append(upgradeNodes, node)
	}
	logger.Info("start to upgrade other control-planes and worker nodes")
	if err := k.upgradeOtherNodes(conversion, upgradeNodes, version); err != nil {
		return err
	}
	return k.syncLocalCertificateIdentity(version)
}

func (k *KubeadmRuntime) runUpgradeMigrations(conversion *types.ConvertedKubeadmConfig, version string, hasLocalEtcd bool) error {
	currentVersion := k.getKubeVersionFromImage()
	migrations, err := getRemoteCertMigrations(currentVersion, version, hasLocalEtcd)
	if err != nil {
		return err
	}
	if len(migrations) == 0 {
		return nil
	}
	configPath, err := k.stageUpgradeMigrationConfig(version, conversion)
	if err != nil {
		return err
	}
	for _, migration := range migrations {
		if err := k.migrateRemoteCert(migration, configPath, version); err != nil {
			return err
		}
	}
	return nil
}

func getRemoteCertMigrations(currentVersion, targetVersion string, hasLocalEtcd bool) ([]remoteCertMigration, error) {
	current, err := semver.NewVersion(currentVersion)
	if err != nil {
		return nil, fmt.Errorf("parse current kubernetes version %q: %w", currentVersion, err)
	}
	target, err := semver.NewVersion(targetVersion)
	if err != nil {
		return nil, fmt.Errorf("parse target kubernetes version %q: %w", targetVersion, err)
	}
	if !current.LessThan(V1290) || target.LessThan(V1290) {
		return nil, nil
	}

	migrations := []remoteCertMigration{
		{
			name:      apiserverKubeletClientCertName,
			phaseName: apiserverKubeletClientCertName,
			files: []string{
				apiserverKubeletClientCertName + ".crt",
				apiserverKubeletClientCertName + ".key",
			},
		},
	}
	if hasLocalEtcd {
		migrations = append(migrations,
			remoteCertMigration{
				name:      apiserverEtcdClientCertName,
				phaseName: apiserverEtcdClientCertName,
				files: []string{
					apiserverEtcdClientCertName + ".crt",
					apiserverEtcdClientCertName + ".key",
				},
			},
			remoteCertMigration{
				name:      etcdHealthcheckClientCertName,
				phaseName: etcdHealthcheckClientCertName,
				files: []string{
					"etcd/healthcheck-client.crt",
					"etcd/healthcheck-client.key",
				},
			},
		)
	}
	return migrations, nil
}

func shouldMigrateAPIServerKubeletClientCert(currentVersion, targetVersion string) (bool, error) {
	migrations, err := getRemoteCertMigrations(currentVersion, targetVersion, false)
	if err != nil {
		return false, err
	}
	for _, migration := range migrations {
		if migration.name == apiserverKubeletClientCertName {
			return true, nil
		}
	}
	return false, nil
}

func (k *KubeadmRuntime) migrateRemoteCert(migration remoteCertMigration, configPath, version string) error {
	logger.Info("regenerate %s on master0 before upgrading to %s", migration.name, version)
	var stageFile func(string) (string, error)
	if shouldUseKubeadmV1beta4Features, err := shouldUseKubeadmV1beta4Features(version); err != nil {
		return err
	} else if shouldUseKubeadmV1beta4Features {
		master0 := k.getMaster0IPAndPort()
		kubeBinaryPath := k.pathResolver.RootFSBinPath()
		if err := k.sshCmdAsyncSeq(
			master0,
			fmt.Sprintf(installKubeadmCmd, kubeBinaryPath),
			buildRegenerateRemoteCertCmd(migration.phaseName, configPath, migration.files),
		); err != nil {
			return fmt.Errorf("regenerate %s on master0: %w", migration.name, err)
		}
		stageFile = k.stagePKIFileFromMaster0
	} else {
		stagingDir, err := k.regenerateRemoteCertWithLocalIdentityModel(migration, version)
		if err != nil {
			return err
		}
		stageFile = func(fileName string) (string, error) {
			return stagedLocalPKIFile(stagingDir, fileName)
		}
	}

	for _, fileName := range migration.files {
		stagedFile, err := stageFile(fileName)
		if err != nil {
			return err
		}
		if err := k.sendFileToHosts(k.getMasterIPAndPortList(), stagedFile, path.Join(kubernetesEtcPKI, fileName)); err != nil {
			return fmt.Errorf("sync %s to control-plane nodes: %w", migration.name, err)
		}
	}
	return nil
}

func stagedLocalPKIFile(stagingDir, fileName string) (string, error) {
	stagedFile := filepath.Join(stagingDir, filepath.FromSlash(fileName))
	if _, err := os.Stat(stagedFile); err != nil {
		return "", fmt.Errorf("local regenerated PKI file %s: %w", stagedFile, err)
	}
	return stagedFile, nil
}

func (k *KubeadmRuntime) regenerateRemoteCertWithLocalIdentityModel(migration remoteCertMigration, version string) (string, error) {
	if err := k.mergeWithBuiltinKubeadmConfig(); err != nil {
		return "", fmt.Errorf("load cluster networking and certSANs for %s migration: %w", migration.name, err)
	}

	stagingDir := filepath.Join(k.pathResolver.TmpPath(), "upgrade-migrations", "remote-cert-regeneration")
	if err := os.RemoveAll(stagingDir); err != nil {
		return "", fmt.Errorf("cleanup local cert staging dir %s: %w", stagingDir, err)
	}
	if err := os.MkdirAll(filepath.Join(stagingDir, "etcd"), 0o755); err != nil {
		return "", fmt.Errorf("create local cert staging dir %s: %w", stagingDir, err)
	}

	for _, caFile := range []string{
		"ca.crt", "ca.key",
		"front-proxy-ca.crt", "front-proxy-ca.key",
		"etcd/ca.crt", "etcd/ca.key",
		"sa.key", "sa.pub",
	} {
		src := path.Join(kubernetesEtcPKI, caFile)
		dst := filepath.Join(stagingDir, filepath.FromSlash(caFile))
		if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
			return "", fmt.Errorf("create local dir for %s: %w", caFile, err)
		}
		if err := k.sshFetch(k.getMaster0IPAndPort(), src, dst); err != nil {
			return "", fmt.Errorf("fetch %s from master0: %w", caFile, err)
		}
	}

	hostName, err := k.execHostname(k.getMaster0IPAndPort())
	if err != nil {
		return "", fmt.Errorf("get master0 hostname for %s migration: %w", migration.name, err)
	}

	if err := cert.RenewLeafCertsForKubeVersion(
		stagingDir,
		filepath.Join(stagingDir, "etcd"),
		k.getCertSANs(),
		k.getMaster0IP(),
		hostName,
		k.getServiceCIDR(),
		k.getDNSDomain(),
		version,
	); err != nil {
		return "", fmt.Errorf("regenerate %s with local identity model: %w", migration.name, err)
	}
	return stagingDir, nil
}

func (k *KubeadmRuntime) stageUpgradeMigrationConfig(version string, conversion *types.ConvertedKubeadmConfig) (string, error) {
	data, err := marshalConfigsForVersion(version, &conversion.InitConfiguration, &conversion.ClusterConfiguration)
	if err != nil {
		return "", fmt.Errorf("marshal kubeadm migration config for %s: %w", version, err)
	}

	stagingDir := path.Join(k.pathResolver.TmpPath(), "upgrade-migrations")
	if err := os.MkdirAll(stagingDir, 0o755); err != nil {
		return "", fmt.Errorf("create migration staging dir %s: %w", stagingDir, err)
	}

	localConfigPath := k.upgradeMigrationConfigLocalPath()
	if err := os.WriteFile(localConfigPath, data, 0o600); err != nil {
		return "", fmt.Errorf("write local migration config %s: %w", localConfigPath, err)
	}

	master0 := k.getMaster0IPAndPort()
	remoteConfigPath := k.remoteUpgradeMigrationConfigPath()
	if err := k.sshCmdAsync(master0, fmt.Sprintf("mkdir -p %s", remoteConfigDir)); err != nil {
		return "", fmt.Errorf("create remote migration dir %s on master0: %w", remoteConfigDir, err)
	}
	if err := k.sshCopy(master0, localConfigPath, remoteConfigPath); err != nil {
		return "", fmt.Errorf("copy migration config to master0: %w", err)
	}

	return remoteConfigPath, nil
}

const remoteConfigDir = "/tmp/sealos-upgrade-migrations"

func (k *KubeadmRuntime) upgradeMigrationConfigLocalPath() string {
	return path.Join(k.pathResolver.TmpPath(), "upgrade-migrations", "kubeadm-migration.yaml")
}

func (k *KubeadmRuntime) remoteUpgradeMigrationConfigPath() string {
	return path.Join(remoteConfigDir, "kubeadm-migration.yaml")
}

func (k *KubeadmRuntime) syncUpgradeMigrationConfig(hosts []string) error {
	localConfigPath := k.upgradeMigrationConfigLocalPath()
	remoteConfigPath := k.remoteUpgradeMigrationConfigPath()
	for _, host := range hosts {
		if err := k.sshCmdAsync(host, fmt.Sprintf("mkdir -p %s", remoteConfigDir)); err != nil {
			return fmt.Errorf("create remote migration dir %s on %s: %w", remoteConfigDir, host, err)
		}
		if err := k.sshCopy(host, localConfigPath, remoteConfigPath); err != nil {
			return fmt.Errorf("copy migration config to %s: %w", host, err)
		}
	}
	return nil
}

func (k *KubeadmRuntime) stagePKIFileFromMaster0(fileName string) (string, error) {
	stagingDir := path.Join(k.pathResolver.TmpPath(), "upgrade-migrations")
	if err := os.MkdirAll(stagingDir, 0o755); err != nil {
		return "", fmt.Errorf("create migration staging dir %s: %w", stagingDir, err)
	}

	stagedFile := path.Join(stagingDir, fileName)
	if err := os.MkdirAll(path.Dir(stagedFile), 0o755); err != nil {
		return "", fmt.Errorf("create local staging dir for %s: %w", fileName, err)
	}
	if err := k.sshFetch(k.getMaster0IPAndPort(), path.Join(kubernetesEtcPKI, fileName), stagedFile); err != nil {
		return "", fmt.Errorf("fetch %s from master0: %w", fileName, err)
	}
	return stagedFile, nil
}

func buildRegenerateRemoteCertCmd(phaseName, configPath string, files []string) string {
	var script strings.Builder
	script.WriteString("set -e; ")
	script.WriteString("backup_dir=$(mktemp -d /tmp/sealos-cert-migration-XXXXXX); ")
	for _, file := range files {
		remoteFile := path.Join(kubernetesEtcPKI, file)
		backupDir := path.Dir(file)
		if backupDir != "." {
			script.WriteString(fmt.Sprintf("mkdir -p \"$backup_dir/%s\"; ", backupDir))
		}
		script.WriteString(fmt.Sprintf("if [ -f %s ]; then cp -f %s \"$backup_dir/%s\"; fi; ", remoteFile, remoteFile, file))
		script.WriteString(fmt.Sprintf("rm -f %s; ", remoteFile))
	}
	script.WriteString(fmt.Sprintf("if ! kubeadm init phase certs %s --config %s; then ", phaseName, configPath))
	for _, file := range files {
		remoteFile := path.Join(kubernetesEtcPKI, file)
		script.WriteString(fmt.Sprintf("if [ -f \"$backup_dir/%s\" ]; then mkdir -p %s; mv -f \"$backup_dir/%s\" %s; fi; ", file, path.Dir(remoteFile), file, remoteFile))
	}
	script.WriteString("exit 1; fi; ")
	script.WriteString("rm -rf \"$backup_dir\"")
	return fmt.Sprintf("bash -c '%s'", script.String())
}

func buildRegenerateRemoteAdminKubeConfigCmd(configPath string) string {
	var script strings.Builder
	script.WriteString("set -e; ")
	script.WriteString("backup_dir=$(mktemp -d /tmp/sealos-kubeconfig-migration-XXXXXX); ")
	script.WriteString(fmt.Sprintf("if [ -f /etc/kubernetes/%s ]; then cp -f /etc/kubernetes/%s \"$backup_dir/%s\"; fi; ", adminKubeConfigName, adminKubeConfigName, adminKubeConfigName))
	script.WriteString(fmt.Sprintf("rm -f /etc/kubernetes/%s; ", adminKubeConfigName))
	script.WriteString(fmt.Sprintf("if ! kubeadm init phase kubeconfig admin --config %s; then ", configPath))
	script.WriteString(fmt.Sprintf("if [ -f \"$backup_dir/%s\" ]; then mv -f \"$backup_dir/%s\" /etc/kubernetes/%s; fi; ", adminKubeConfigName, adminKubeConfigName, adminKubeConfigName))
	script.WriteString("exit 1; fi; ")
	script.WriteString("rm -rf \"$backup_dir\"")
	return fmt.Sprintf("bash -c '%s'", script.String())
}

func (k *KubeadmRuntime) syncLocalCertificateIdentity(version string) error {
	if err := k.mergeWithBuiltinKubeadmConfig(); err != nil {
		return fmt.Errorf("load cluster networking and certSANs for local identity sync: %w", err)
	}

	hostName, err := k.execHostname(k.getMaster0IPAndPort())
	if err != nil {
		return fmt.Errorf("get hostname failed while syncing local certificate identity: %w", err)
	}

	if err := cert.RenewLeafCertsForKubeVersion(
		k.pathResolver.PkiPath(),
		k.pathResolver.PkiEtcdPath(),
		k.getCertSANs(),
		k.getMaster0IP(),
		hostName,
		k.getServiceCIDR(),
		k.getDNSDomain(),
		version,
	); err != nil {
		return fmt.Errorf("refresh local pki identity model for %s: %w", version, err)
	}

	localKubeConfigFiles := defaultLocalKubeConfigFiles(version)
	if err := renewLocalKubeConfigFilesForVersion(k, hostName, version, localKubeConfigFiles, nil); err != nil {
		return err
	}
	if shouldEnsureAdminClusterRoleBinding(version, nil, true, localKubeConfigFiles) {
		if err := k.ensureAdminClusterRoleBinding(); err != nil {
			return err
		}
	}
	if shouldRegenerateRemoteAdminKubeConfig(version) {
		if err := k.syncRemoteAdminKubeConfigIdentity(version); err != nil {
			return err
		}
	}

	k.cli = nil
	return nil
}

func shouldRegenerateRemoteAdminKubeConfig(version string) bool {
	return certUsesClusterAdminsIdentityModel(version)
}

func (k *KubeadmRuntime) syncRemoteAdminKubeConfigIdentity(version string) error {
	useV1beta4Features, err := shouldUseKubeadmV1beta4Features(version)
	if err != nil {
		return err
	}
	if useV1beta4Features {
		if k.kubeadmConfig == nil {
			return fmt.Errorf("kubeadm config is not initialized for remote admin.conf sync")
		}
		kubeadmConfig := *k.kubeadmConfig
		kubeadmConfig.SetAPIVersion(getterKubeadmAPIVersion(version))
		conversion, err := kubeadmConfig.ToConvertedKubeadmConfig()
		if err != nil {
			return fmt.Errorf("convert kubeadm config for remote admin.conf sync: %w", err)
		}
		configPath, err := k.stageUpgradeMigrationConfig(version, conversion)
		if err != nil {
			return err
		}
		if err := k.syncUpgradeMigrationConfig(k.getMasterIPAndPortList()[1:]); err != nil {
			return err
		}
		kubeBinaryPath := k.pathResolver.RootFSBinPath()
		for _, master := range k.getMasterIPAndPortList() {
			if err := k.sshCmdAsyncSeq(
				master,
				fmt.Sprintf(installKubeadmCmd, kubeBinaryPath),
				buildRegenerateRemoteAdminKubeConfigCmd(configPath),
			); err != nil {
				return fmt.Errorf("regenerate admin.conf on %s: %w", master, err)
			}
			if err := k.copyMasterKubeConfig(master); err != nil {
				return fmt.Errorf("refresh $HOME/.kube/config on %s: %w", master, err)
			}
		}
		return nil
	}
	return k.syncRemoteAdminKubeConfigWithLocalIdentityModel(version)
}

func (k *KubeadmRuntime) syncRemoteAdminKubeConfigWithLocalIdentityModel(version string) error {
	if err := k.mergeWithBuiltinKubeadmConfig(); err != nil {
		return fmt.Errorf("load cluster networking and certSANs for remote admin.conf sync: %w", err)
	}

	stagingDir := filepath.Join(k.pathResolver.TmpPath(), "upgrade-migrations", "remote-admin-kubeconfig")
	if err := os.RemoveAll(stagingDir); err != nil {
		return fmt.Errorf("cleanup local kubeconfig staging dir %s: %w", stagingDir, err)
	}
	if err := os.MkdirAll(stagingDir, 0o755); err != nil {
		return fmt.Errorf("create local kubeconfig staging dir %s: %w", stagingDir, err)
	}

	for _, caFile := range []string{"ca.crt", "ca.key"} {
		src := path.Join(kubernetesEtcPKI, caFile)
		dst := filepath.Join(stagingDir, caFile)
		if err := k.sshFetch(k.getMaster0IPAndPort(), src, dst); err != nil {
			return fmt.Errorf("fetch %s from master0: %w", caFile, err)
		}
	}

	for _, master := range k.getMasterIPAndPortList() {
		hostName, err := k.execHostname(master)
		if err != nil {
			return fmt.Errorf("get hostname for %s admin.conf migration: %w", master, err)
		}
		if err := cert.RenewAdminKubeConfigFileForKubeVersion(
			stagingDir,
			cert.Config{Path: stagingDir, BaseName: "ca"},
			k.getClusterAPIServer(),
			"kubernetes",
			nil,
			version,
		); err != nil {
			return fmt.Errorf("regenerate local admin.conf staging for %s (%s): %w", master, hostName, err)
		}
		if err := k.sshCopy(master, filepath.Join(stagingDir, adminKubeConfigName), path.Join("/etc/kubernetes", adminKubeConfigName)); err != nil {
			return fmt.Errorf("copy admin.conf to %s: %w", master, err)
		}
		if err := k.copyMasterKubeConfig(master); err != nil {
			return fmt.Errorf("refresh $HOME/.kube/config on %s: %w", master, err)
		}
	}
	return nil
}

func getUpgradeApplyCmd(version string) (string, error) {
	useV1beta4Features, err := shouldUseKubeadmV1beta4Features(version)
	if err != nil {
		return "", err
	}
	if useV1beta4Features {
		return fmt.Sprintf(upgradeApplyCmd, version), nil
	}
	return fmt.Sprintf(upgradeApplyCmdNoCertRenewal, version), nil
}

func getUpgradeNodeCmd(version string) (string, error) {
	useV1beta4Features, err := shouldUseKubeadmV1beta4Features(version)
	if err != nil {
		return "", err
	}
	if useV1beta4Features {
		return upgradeNodeCmd, nil
	}
	return upgradeNodeCmdNoCertRenewal, nil
}

func (k *KubeadmRuntime) upgradeMaster0(conversion *types.ConvertedKubeadmConfig, version string) error {
	master0ip := k.getMaster0IP()
	sver := semver.MustParse(version)
	if err := k.syncKubeletConfig(master0ip, conversion, version); err != nil {
		return err
	}

	if gte(sver, V1260) {
		if err := k.changeCRIVersion(master0ip); err != nil {
			return err
		}
	}

	if gte(sver, V1270) {
		if err := k.changeKubeletExtraArgs(master0ip); err != nil {
			return err
		}
	}

	master0Name, err := k.remoteUtil.Hostname(master0ip)
	if err != nil {
		return err
	}
	//default nodeName in k8s is the lower case of their hostname because of DNS protocol.
	master0Name = strings.ToLower(master0Name)
	kubeBinaryPath := k.pathResolver.RootFSBinPath()
	//assure the connection to api-server succeed before executing upgrade cmds
	if err = k.pingAPIServer(); err != nil {
		return err
	}

	// install kubeadm:{version} at master0 before listing/pulling upgrade images.
	// kubeadm owns the component image matrix, so using the target kubeadm avoids
	// pre-pulling images for the previous Kubernetes minor version.
	if err = k.sshCmdAsyncSeq(master0ip, fmt.Sprintf(installKubeadmCmd, kubeBinaryPath)); err != nil {
		return err
	}

	// force cri to pull the image
	err = k.imagePull(master0ip, version)
	if err != nil {
		logger.Warn("image pull pre-upgrade failed: %s", err.Error())
	}

	config, err := marshalConfigsForVersion(version, &conversion.InitConfiguration, &conversion.ClusterConfiguration)
	if err != nil {
		logger.Error("kubeadm config marshal failed: %s", err.Error())
		return err
	}

	upgradeConfigName := "kubeadm-upgrade.yaml"
	upgradeConfigPath := path.Join(k.pathResolver.EtcPath(), upgradeConfigName)
	upgradeApplyCmd, err := getUpgradeApplyCmd(version)
	if err != nil {
		return err
	}

	err = k.sshCmdAsyncSeq(master0ip,
		// write kubeadm config to file
		fmt.Sprintf(writeKubeadmConfig, upgradeConfigPath, string(config)),
		// execute kubeadm upgrade apply {version} at master0.
		// The desired kubeadm configuration has already been persisted to the
		// cluster ConfigMap by autoUpdateConfig. Passing InitConfiguration and
		// ClusterConfiguration through --config is rejected by newer kubeadm,
		// which expects an UpgradeConfiguration for that flag.
		upgradeApplyCmd,
		//kubectl cordon <node-to-cordon>
		fmt.Sprintf(cordonNodeCmd, master0Name),
		//install kubelet:{version},kubectl{version} at master0
		fmt.Sprintf(installKubectlCmd, kubeBinaryPath),
		fmt.Sprintf(installKubeletCmd, kubeBinaryPath),
		//reload kubelet daemon
		daemonReload,
		restartKubelet,
	)
	if err != nil {
		return err
	}
	return k.tryUncordonNode(master0ip, master0Name)
}

func (k *KubeadmRuntime) upgradeOtherNodes(conversion *types.ConvertedKubeadmConfig, ips []string, version string) error {
	sver := semver.MustParse(version)
	upgradeNodeCmd, err := getUpgradeNodeCmd(version)
	if err != nil {
		return err
	}
	for _, ip := range ips {
		if err := k.syncKubeletConfig(ip, conversion, version); err != nil {
			return err
		}

		if gte(sver, V1260) {
			if err := k.changeCRIVersion(ip); err != nil {
				return err
			}
		}

		if gte(sver, V1270) {
			if err := k.changeKubeletExtraArgs(ip); err != nil {
				return err
			}
		}

		nodename, err := k.remoteUtil.Hostname(ip)
		if err != nil {
			return err
		}
		//default nodeName in k8s is the lower case of their hostname because of DNS protocol.
		nodename = strings.ToLower(nodename)
		kubeBinaryPath := k.pathResolver.RootFSBinPath()
		//assure the connection to api-server succeed before executing upgrade cmds
		if err = k.pingAPIServer(); err != nil {
			return err
		}

		// install kubeadm:{version} at the node before listing/pulling upgrade images.
		err = k.sshCmdAsyncSeq(ip, fmt.Sprintf(installKubeadmCmd, kubeBinaryPath))
		if err != nil {
			return err
		}

		// force cri to pull the image
		err = k.imagePull(ip, version)
		if err != nil {
			logger.Error("image pull pre-upgrade failed: %s", err.Error())
		}

		logger.Info("upgrade node %s", nodename)
		// upgrade other control-plane and nodes
		err = k.tryUpgradeNode(ip, upgradeNodeCmd)
		if err != nil {
			return err
		}
		err = k.sshCmdAsyncSeq(ip,
			// kubectl cordon <node-to-cordon>
			fmt.Sprintf(cordonNodeCmd, nodename),
			// install kubelet:{version},kubectl{version} at the node
			fmt.Sprintf(installKubectlCmd, kubeBinaryPath),
			fmt.Sprintf(installKubeletCmd, kubeBinaryPath),
			// reload kubelet daemon
			daemonReload,
			restartKubelet,
		)
		if err != nil {
			return err
		}
		if err = k.tryUncordonNode(ip, nodename); err != nil {
			return err
		}
	}
	return nil
}

func (k *KubeadmRuntime) syncKubeletConfig(ip string, conversion *types.ConvertedKubeadmConfig, version string) error {
	kubeletConfig, err := marshalKubeletConfigForVersion(conversion.KubeletConfiguration, version)
	if err != nil {
		logger.Error("failed to encode KubeletConfiguration: %s", err)
		return err
	}
	logger.Info("sync kubelet config to node %s", ip)
	return k.sshCmdAsync(ip, fmt.Sprintf(writeKubeadmConfig, kubeletConfigPath, string(kubeletConfig)))
}

func (k *KubeadmRuntime) autoUpdateConfig(version string) (*types.ConvertedKubeadmConfig, bool, error) {
	exp, err := k.getKubeExpansion()
	if err != nil {
		return nil, false, err
	}
	ctx := context.Background()
	clusterCfg, err := exp.FetchKubeadmConfig(ctx)
	if err != nil {
		return nil, false, err
	}
	kubeletCfg, err := exp.FetchKubeletConfig(ctx)
	if err != nil {
		return nil, false, err
	}
	logger.Debug("get cluster configmap data:\n%s", clusterCfg)
	logger.Debug("get kubelet configmap data:\n%s", kubeletCfg)
	allConfig := strings.Join([]string{clusterCfg, kubeletCfg}, "\n---\n")
	defaultKubeadmConfig, err := types.LoadKubeadmConfigs(allConfig, false, decode.CRDFromString)
	if err != nil {
		logger.Error("failed to decode cluster kubeadm config: %s", err)
		return nil, false, err
	}
	hasLocalEtcd := usesLocalEtcd(defaultKubeadmConfig.ClusterConfiguration.Etcd)
	defaultKubeadmConfig.InitConfiguration = kubeadm.InitConfiguration{
		TypeMeta: metaV1.TypeMeta{
			APIVersion: defaultKubeadmConfig.ClusterConfiguration.APIVersion,
		},
	}

	kk := &KubeadmRuntime{
		kubeadmConfig: defaultKubeadmConfig,
	}
	kk.setKubeVersion(version)
	kk.setAPIVersion(getterKubeadmAPIVersion(version))
	kk.setFeatureGatesConfiguration()
	kk.setInitConfigurationPullPolicy(v1.PullNever)

	conversion, err := kk.kubeadmConfig.ToConvertedKubeadmConfig()
	if err != nil {
		return nil, false, err
	}
	newClusterData, err := marshalConfigsForVersion(version, &conversion.ClusterConfiguration)
	if err != nil {
		logger.Error("failed to encode ClusterConfiguration: %s", err)
		return nil, false, err
	}
	logger.Debug("update cluster config:\n%s", string(newClusterData))
	err = exp.UpdateKubeadmConfig(ctx, string(newClusterData))
	if err != nil {
		logger.Error("failed to update kubeadm-config with k8s-client: %s", err)
		return nil, false, err
	}

	newKubeletData, err := marshalKubeletConfigForVersion(conversion.KubeletConfiguration, version)
	if err != nil {
		logger.Error("failed to encode KubeletConfiguration: %s", err)
		return nil, false, err
	}
	logger.Debug("update kubelet config:\n%s", string(newKubeletData))
	err = exp.UpdateKubeletConfig(ctx, string(newKubeletData))
	if err != nil {
		logger.Error("failed to update kubelet-config with k8s-client: %s", err)
		return nil, false, err
	}

	return conversion, hasLocalEtcd, nil
}

func usesLocalEtcd(etcd kubeadm.Etcd) bool {
	return etcd.External == nil || len(etcd.External.Endpoints) == 0
}

func marshalKubeletConfigForVersion(config interface{}, version string) ([]byte, error) {
	kubeletConfig, err := yaml.MarshalConfigs(config)
	if err != nil {
		return nil, err
	}
	return sanitizeKubeletConfigForVersion(kubeletConfig, version)
}

func sanitizeKubeletConfigForVersion(kubeletConfig []byte, version string) ([]byte, error) {
	sver, err := semver.NewVersion(version)
	if err != nil {
		return nil, err
	}
	if gte(sver, V1300) {
		return kubeletConfig, nil
	}

	config, err := yaml.UnmarshalToMap(kubeletConfig)
	if err != nil {
		return nil, err
	}
	delete(config, "containerRuntimeEndpoint")
	delete(config, "imageMaximumGCAge")
	deleteNestedMapKey(config, "logging", "options", "text")
	return yaml.Marshal(config)
}

func deleteNestedMapKey(data map[string]interface{}, keys ...string) {
	if len(keys) == 0 {
		return
	}
	current := data
	for _, key := range keys[:len(keys)-1] {
		next, ok := current[key].(map[string]interface{})
		if !ok {
			return
		}
		current = next
	}
	delete(current, keys[len(keys)-1])
}

func (k *KubeadmRuntime) sshCmdAsyncSeq(host string, cmds ...string) error {
	for _, cmd := range cmds {
		if err := k.sshCmdAsync(host, cmd); err != nil {
			return err
		}
	}
	return nil
}

func (k *KubeadmRuntime) pingAPIServer() error {
	timeout := time.Now().Add(1 * time.Minute)
	client, err := k.getKubeInterface()
	if err != nil {
		return err
	}
	for {
		_, err := client.Kubernetes().CoreV1().Nodes().List(context.TODO(), metaV1.ListOptions{})
		if err == nil {
			break
		}
		if time.Now().After(timeout) {
			return fmt.Errorf("restart api-server timeout within one minute")
		}
		time.Sleep(5 * time.Second)
	}
	return nil
}

func (k *KubeadmRuntime) tryUncordonNode(ip, nodename string) error {
	err := k.sshCmdAsync(ip, fmt.Sprintf(uncordonNodeCmd, nodename))
	timeout := time.Now().Add(1 * time.Minute)
	for err != nil {
		time.Sleep(5 * time.Second)
		err = k.sshCmdAsync(ip, fmt.Sprintf(uncordonNodeCmd, nodename))
		if err == nil {
			break
		}
		if time.Now().After(timeout) {
			return fmt.Errorf("try uncordon node %s timeout one minute", nodename)
		}
	}
	return nil
}

func (k *KubeadmRuntime) tryUpgradeNode(ip, upgradeCmd string) error {
	err := k.sshCmdAsync(ip, upgradeCmd)
	timeout := time.Now().Add(1 * time.Minute)
	for err != nil {
		time.Sleep(5 * time.Second)
		if pingErr := k.pingAPIServer(); pingErr != nil {
			logger.Warn("api-server is not ready before retrying node upgrade: %s", pingErr.Error())
		}
		err = k.sshCmdAsync(ip, upgradeCmd)
		if err == nil {
			break
		}
		if time.Now().After(timeout) {
			return fmt.Errorf("try upgrade node %s timeout one minute: %w", ip, err)
		}
	}
	return nil
}

func (k *KubeadmRuntime) changeCRIVersion(ip string) error {
	return k.sshCmdAsyncSeq(ip,
		"sed -i \"s/v1alpha2/v1/\" /etc/image-cri-shim.yaml",
		"systemctl restart image-cri-shim",
		"systemctl restart kubelet",
	)
}

func (k *KubeadmRuntime) changeKubeletExtraArgs(ip string) error {
	return k.sshCmdAsyncSeq(ip,
		`for FILE in /etc/systemd/system/kubelet.service.d/10-kubeadm.conf /var/lib/kubelet/kubelet-flags.env /var/lib/kubelet/kubeadm-flags.env; do if [ -f "$FILE" ]; then sed -i -E 's#(^|[[:space:]"])-endpoint=#\1--container-runtime-endpoint=#g; s#(^|[[:space:]"])--container-runtime(=[^[:space:]"]*)?([[:space:]"]|$)#\1\3#g; s#(^|[[:space:]"])--pod-infra-container-image(=[^[:space:]"]*)?([[:space:]"]|$)#\1\3#g' "$FILE"; fi; done`,
		"systemctl daemon-reload",
		"systemctl restart kubelet",
	)
}
