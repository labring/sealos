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
	"bytes"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/dynamic"
	kubernetesclient "k8s.io/client-go/kubernetes"
	clientset "k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/rest"
	"k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm"
	ckubeadm "k8s.io/kubernetes/cmd/kubeadm/app/constants"

	clientkubernetes "github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/runtime/kubernetes/types"
	v1beta1 "github.com/labring/sealos/pkg/types/v1beta1"
)

func TestSanitizeKubeletConfigForPre130(t *testing.T) {
	kubeletConfig := []byte(`apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
containerRuntimeEndpoint: unix:///run/containerd/containerd.sock
imageMaximumGCAge: 0s
logging:
  format: text
  options:
    json:
      infoBufferSize: "0"
    text:
      infoBufferSize: "0"
`)

	got, err := sanitizeKubeletConfigForVersion(kubeletConfig, "v1.27.1")
	if err != nil {
		t.Fatalf("sanitize kubelet config: %v", err)
	}

	for _, field := range []string{"containerRuntimeEndpoint", "imageMaximumGCAge"} {
		if strings.Contains(string(got), field) {
			t.Fatalf("expected %q to be removed from kubelet config:\n%s", field, got)
		}
	}
	if strings.Contains(string(got), "\n    text:") {
		t.Fatalf("expected logging.options.text to be removed from kubelet config:\n%s", got)
	}
	if !strings.Contains(string(got), "format: text") {
		t.Fatalf("expected logging.format to be preserved:\n%s", got)
	}
	if !strings.Contains(string(got), "json:") {
		t.Fatalf("expected logging.options.json to be preserved:\n%s", got)
	}
}

func TestSanitizeKubeletConfigFor130KeepsFields(t *testing.T) {
	kubeletConfig := []byte(`apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
containerRuntimeEndpoint: unix:///run/containerd/containerd.sock
imageMaximumGCAge: 0s
logging:
  options:
    text:
      infoBufferSize: "0"
`)

	got, err := sanitizeKubeletConfigForVersion(kubeletConfig, "v1.30.0")
	if err != nil {
		t.Fatalf("sanitize kubelet config: %v", err)
	}
	if !bytes.Equal(got, kubeletConfig) {
		t.Fatalf("expected kubelet config for v1.30.0 to be unchanged:\n%s", got)
	}
}

func TestUpgradeApplyCommandIgnoresHealthCheckJob(t *testing.T) {
	got, err := getUpgradeApplyCmd("v1.30.9")
	if err != nil {
		t.Fatalf("getUpgradeApplyCmd() error = %v", err)
	}
	for _, want := range []string{
		"--ignore-preflight-errors=",
		"SystemVerification",
		"ControlPlaneNodesReady",
		"CreateJob",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("upgrade apply command %q does not contain %q", got, want)
		}
	}
}

func TestGetUpgradeCommandsFollowCertificateRenewalPolicy(t *testing.T) {
	tests := []struct {
		name                  string
		version               string
		wantApplyDisableRenew bool
		wantNodeDisableRenew  bool
	}{
		{
			name:                  "keep disable-renewal before v131",
			version:               "v1.30.9",
			wantApplyDisableRenew: true,
			wantNodeDisableRenew:  true,
		},
		{
			name:                  "enable kubeadm renewal on v131 and later",
			version:               "v1.31.0",
			wantApplyDisableRenew: false,
			wantNodeDisableRenew:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			applyCmd, err := getUpgradeApplyCmd(tt.version)
			if err != nil {
				t.Fatalf("getUpgradeApplyCmd() error = %v", err)
			}
			if got := strings.Contains(applyCmd, "--certificate-renewal=false"); got != tt.wantApplyDisableRenew {
				t.Fatalf("getUpgradeApplyCmd() disable-renewal = %v, want %v, cmd = %q", got, tt.wantApplyDisableRenew, applyCmd)
			}

			nodeCmd, err := getUpgradeNodeCmd(tt.version)
			if err != nil {
				t.Fatalf("getUpgradeNodeCmd() error = %v", err)
			}
			if got := strings.Contains(nodeCmd, "--certificate-renewal=false"); got != tt.wantNodeDisableRenew {
				t.Fatalf("getUpgradeNodeCmd() disable-renewal = %v, want %v, cmd = %q", got, tt.wantNodeDisableRenew, nodeCmd)
			}
		})
	}
}

func TestGetterKubeadmAPIVersion(t *testing.T) {
	tests := []struct {
		version string
		want    string
	}{
		{version: "v1.30.9", want: types.KubeadmV1beta3},
		{version: "v1.31.0", want: types.KubeadmV1beta4},
	}

	for _, tt := range tests {
		if got := getterKubeadmAPIVersion(tt.version); got != tt.want {
			t.Fatalf("getterKubeadmAPIVersion(%q) = %q, want %q", tt.version, got, tt.want)
		}
	}
}

func TestMarshalConfigsForVersionAddsCertValidityPeriodsForV131(t *testing.T) {
	clusterConfig := map[string]interface{}{
		"apiVersion": types.KubeadmV1beta4,
		"kind":       "ClusterConfiguration",
	}

	got, err := marshalConfigsForVersion("v1.31.0", clusterConfig)
	if err != nil {
		t.Fatalf("marshalConfigsForVersion() error = %v", err)
	}

	for _, want := range []string{
		"certificateValidityPeriod: 876000h",
		"caCertificateValidityPeriod: 876000h",
	} {
		if !strings.Contains(string(got), want) {
			t.Fatalf("marshalConfigsForVersion() output %q does not contain %q", got, want)
		}
	}
}

func TestMarshalConfigsForVersionSkipsCertValidityPeriodsBeforeV131(t *testing.T) {
	clusterConfig := map[string]interface{}{
		"apiVersion": types.KubeadmV1beta3,
		"kind":       "ClusterConfiguration",
	}

	got, err := marshalConfigsForVersion("v1.30.9", clusterConfig)
	if err != nil {
		t.Fatalf("marshalConfigsForVersion() error = %v", err)
	}
	if strings.Contains(string(got), "certificateValidityPeriod:") {
		t.Fatalf("expected pre-v1.31 config to skip certificate validity periods, got %q", got)
	}
}

func TestShouldMigrateAPIServerKubeletClientCert(t *testing.T) {
	tests := []struct {
		name           string
		currentVersion string
		targetVersion  string
		want           bool
	}{
		{
			name:           "migrate across 129 boundary",
			currentVersion: "v1.28.9",
			targetVersion:  "v1.29.0",
			want:           true,
		},
		{
			name:           "skip same minor after 129",
			currentVersion: "v1.29.1",
			targetVersion:  "v1.29.2",
			want:           false,
		},
		{
			name:           "skip below 129",
			currentVersion: "v1.28.1",
			targetVersion:  "v1.28.9",
			want:           false,
		},
		{
			name:           "migrate when upgrading past 129",
			currentVersion: "v1.28.10",
			targetVersion:  "v1.30.1",
			want:           true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := shouldMigrateAPIServerKubeletClientCert(tt.currentVersion, tt.targetVersion)
			if err != nil {
				t.Fatalf("shouldMigrateAPIServerKubeletClientCert() error = %v", err)
			}
			if got != tt.want {
				t.Fatalf("shouldMigrateAPIServerKubeletClientCert() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestShouldMigrateAPIServerKubeletClientCertRejectsInvalidVersions(t *testing.T) {
	if _, err := shouldMigrateAPIServerKubeletClientCert("invalid", "v1.29.0"); err == nil {
		t.Fatal("expected invalid current version to return an error")
	}
	if _, err := shouldMigrateAPIServerKubeletClientCert("v1.28.9", "invalid"); err == nil {
		t.Fatal("expected invalid target version to return an error")
	}
}

func TestGetRemoteCertMigrations(t *testing.T) {
	tests := []struct {
		name         string
		current      string
		target       string
		hasLocalEtcd bool
		wantNames    []string
	}{
		{
			name:         "skip when target stays below 129",
			current:      "v1.28.9",
			target:       "v1.28.10",
			hasLocalEtcd: true,
			wantNames:    nil,
		},
		{
			name:         "migrate kubelet client only for external etcd",
			current:      "v1.28.9",
			target:       "v1.29.0",
			hasLocalEtcd: false,
			wantNames:    []string{apiserverKubeletClientCertName},
		},
		{
			name:         "migrate kubelet and etcd clients for local etcd",
			current:      "v1.28.9",
			target:       "v1.29.0",
			hasLocalEtcd: true,
			wantNames: []string{
				apiserverKubeletClientCertName,
				apiserverEtcdClientCertName,
				etcdHealthcheckClientCertName,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := getRemoteCertMigrations(tt.current, tt.target, tt.hasLocalEtcd)
			if err != nil {
				t.Fatalf("getRemoteCertMigrations() error = %v", err)
			}
			if len(got) != len(tt.wantNames) {
				t.Fatalf("getRemoteCertMigrations() len = %d, want %d (%v)", len(got), len(tt.wantNames), tt.wantNames)
			}
			for i := range got {
				if got[i].name != tt.wantNames[i] {
					t.Fatalf("getRemoteCertMigrations()[%d] = %q, want %q", i, got[i].name, tt.wantNames[i])
				}
			}
		})
	}
}

func TestAutoUpdateConfigTreatsDefaultEtcdAsLocal(t *testing.T) {
	rootDir := t.TempDir()
	prevRuntimeRoot := constants.DefaultRuntimeRootDir
	constants.DefaultRuntimeRootDir = rootDir
	t.Cleanup(func() {
		constants.DefaultRuntimeRootDir = prevRuntimeRoot
	})

	clusterConfig := `apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
kubernetesVersion: v1.28.9
networking:
  serviceSubnet: 10.96.0.0/12
  podSubnet: 10.244.0.0/16
  dnsDomain: cluster.local
apiServer:
  certSANs:
  - 127.0.0.1`
	kubeletConfig := `apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cgroupDriver: systemd`

	client := clientset.NewSimpleClientset(
		&corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{
				Name:      ckubeadm.KubeadmConfigConfigMap,
				Namespace: metav1.NamespaceSystem,
			},
			Data: map[string]string{
				ckubeadm.ClusterConfigurationConfigMapKey: clusterConfig,
			},
		},
		&corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{
				Name:      ckubeadm.KubeletBaseConfigurationConfigMap,
				Namespace: metav1.NamespaceSystem,
			},
			Data: map[string]string{
				ckubeadm.KubeletBaseConfigurationConfigMapKey: kubeletConfig,
			},
		},
	)

	cfgDir := filepath.Join(rootDir, "test-cluster", "etc")
	if err := os.MkdirAll(cfgDir, 0o755); err != nil {
		t.Fatalf("mkdir etc dir: %v", err)
	}
	adminFile := filepath.Join(cfgDir, "admin.conf")
	if err := os.WriteFile(adminFile, []byte("apiVersion: v1\nkind: Config\n"), 0o600); err != nil {
		t.Fatalf("write admin.conf: %v", err)
	}

	rt := &KubeadmRuntime{
		cli: &stubKubeClient{
			k8s: client,
			cfg: &rest.Config{Host: "https://127.0.0.1:6443"},
		},
		cluster:       &v1beta1.Cluster{},
		kubeadmConfig: types.NewKubeadmConfig(),
		pathResolver:  constants.NewPathResolver("test-cluster"),
	}

	_, hasLocalEtcd, err := rt.autoUpdateConfig("v1.29.15")
	if err != nil {
		t.Fatalf("autoUpdateConfig() error = %v", err)
	}
	if !hasLocalEtcd {
		t.Fatal("expected kubeadm default etcd config without external etcd to be treated as local etcd")
	}
}

func TestUsesLocalEtcd(t *testing.T) {
	tests := []struct {
		name string
		etcd kubeadm.Etcd
		want bool
	}{
		{
			name: "default kubeadm etcd",
			etcd: kubeadm.Etcd{},
			want: true,
		},
		{
			name: "explicit local etcd",
			etcd: kubeadm.Etcd{Local: &kubeadm.LocalEtcd{}},
			want: true,
		},
		{
			name: "external etcd with endpoints",
			etcd: kubeadm.Etcd{External: &kubeadm.ExternalEtcd{Endpoints: []string{"https://127.0.0.1:2379"}}},
			want: false,
		},
		{
			name: "empty external etcd falls back to local kubeadm behavior",
			etcd: kubeadm.Etcd{External: &kubeadm.ExternalEtcd{}},
			want: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := usesLocalEtcd(tt.etcd); got != tt.want {
				t.Fatalf("usesLocalEtcd() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestShouldRegenerateRemoteAdminKubeConfig(t *testing.T) {
	tests := []struct {
		version string
		want    bool
	}{
		{version: "v1.28.9", want: false},
		{version: "v1.29.0", want: true},
		{version: "v1.31.1", want: true},
	}

	for _, tt := range tests {
		if got := shouldRegenerateRemoteAdminKubeConfig(tt.version); got != tt.want {
			t.Fatalf("shouldRegenerateRemoteAdminKubeConfig(%q) = %v, want %v", tt.version, got, tt.want)
		}
	}
}

func TestBuildRegenerateRemoteAdminKubeConfigCmd(t *testing.T) {
	cmd := buildRegenerateRemoteAdminKubeConfigCmd("/tmp/kubeadm-migration.yaml")
	for _, want := range []string{
		"rm -f /etc/kubernetes/admin.conf",
		"kubeadm init phase kubeconfig admin --config /tmp/kubeadm-migration.yaml",
		"mv -f \"$backup_dir/admin.conf\" /etc/kubernetes/admin.conf",
	} {
		if !strings.Contains(cmd, want) {
			t.Fatalf("buildRegenerateRemoteAdminKubeConfigCmd() output %q does not contain %q", cmd, want)
		}
	}
	if strings.Contains(cmd, "kubeadm certs renew admin.conf") {
		t.Fatalf("buildRegenerateRemoteAdminKubeConfigCmd() should not use renew, got %q", cmd)
	}
}

func TestSyncUpgradeMigrationConfigCopiesToAllTargets(t *testing.T) {
	rootDir := t.TempDir()
	prevRuntimeRoot := constants.DefaultRuntimeRootDir
	constants.DefaultRuntimeRootDir = rootDir
	t.Cleanup(func() {
		constants.DefaultRuntimeRootDir = prevRuntimeRoot
	})

	rt := &KubeadmRuntime{
		execer:       &stubSSH{},
		cluster:      testCluster([]string{"master0", "master1", "master2"}),
		pathResolver: constants.NewPathResolver("test-cluster"),
	}

	localConfigPath := rt.upgradeMigrationConfigLocalPath()
	if err := os.MkdirAll(filepath.Dir(localConfigPath), 0o755); err != nil {
		t.Fatalf("mkdir migration dir: %v", err)
	}
	if err := os.WriteFile(localConfigPath, []byte("kind: ClusterConfiguration\n"), 0o600); err != nil {
		t.Fatalf("write migration config: %v", err)
	}

	stub := rt.execer.(*stubSSH)
	if err := rt.syncUpgradeMigrationConfig([]string{"master1", "master2"}); err != nil {
		t.Fatalf("syncUpgradeMigrationConfig() error = %v", err)
	}

	wantCopies := []string{
		"master1|" + localConfigPath + "|" + rt.remoteUpgradeMigrationConfigPath(),
		"master2|" + localConfigPath + "|" + rt.remoteUpgradeMigrationConfigPath(),
	}
	gotCopies := append([]string{}, stub.copyCalls...)
	sort.Strings(gotCopies)
	sort.Strings(wantCopies)
	if len(gotCopies) != len(wantCopies) {
		t.Fatalf("syncUpgradeMigrationConfig() copyCalls = %v, want %v", gotCopies, wantCopies)
	}
	for i := range wantCopies {
		if gotCopies[i] != wantCopies[i] {
			t.Fatalf("syncUpgradeMigrationConfig() copyCalls = %v, want %v", gotCopies, wantCopies)
		}
	}
}

func TestPreV131RemoteIdentityMigrationsAvoidKubeadmPhaseRegeneration(t *testing.T) {
	applyCmd, err := getUpgradeApplyCmd("v1.29.15")
	if err != nil {
		t.Fatalf("getUpgradeApplyCmd() error = %v", err)
	}
	if !strings.Contains(applyCmd, "--certificate-renewal=false") {
		t.Fatalf("expected pre-v1.31 upgrade apply to keep certificate renewal disabled, got %q", applyCmd)
	}

	if got := shouldRegenerateRemoteAdminKubeConfig("v1.29.15"); !got {
		t.Fatal("expected remote admin.conf regeneration to remain enabled for v1.29.15")
	}
}

func TestStagedLocalPKIFileUsesRegeneratedLocalFiles(t *testing.T) {
	stagingDir := t.TempDir()
	files := []string{
		"apiserver-etcd-client.crt",
		"etcd/healthcheck-client.crt",
	}
	for _, fileName := range files {
		filePath := filepath.Join(stagingDir, filepath.FromSlash(fileName))
		if err := os.MkdirAll(filepath.Dir(filePath), 0o755); err != nil {
			t.Fatalf("mkdir %s: %v", filepath.Dir(filePath), err)
		}
		if err := os.WriteFile(filePath, []byte("cert"), 0o600); err != nil {
			t.Fatalf("write %s: %v", filePath, err)
		}
		got, err := stagedLocalPKIFile(stagingDir, fileName)
		if err != nil {
			t.Fatalf("stagedLocalPKIFile(%q) error = %v", fileName, err)
		}
		if got != filePath {
			t.Fatalf("stagedLocalPKIFile(%q) = %q, want %q", fileName, got, filePath)
		}
	}

	if _, err := stagedLocalPKIFile(stagingDir, "missing.crt"); err == nil {
		t.Fatal("expected missing staged file to return an error")
	}
}

func TestMergeWithBuiltinKubeadmConfigLoadsNetworkingFromClusterConfig(t *testing.T) {
	rootDir := t.TempDir()
	prevRuntimeRoot := constants.DefaultRuntimeRootDir
	constants.DefaultRuntimeRootDir = rootDir
	t.Cleanup(func() {
		constants.DefaultRuntimeRootDir = prevRuntimeRoot
	})

	clusterConfig := `apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
networking:
  serviceSubnet: 10.96.0.0/12
  podSubnet: 10.244.0.0/16
  dnsDomain: cluster.local
apiServer:
  certSANs:
  - 127.0.0.1
  - apiserver.example.local`

	client := clientset.NewSimpleClientset(&corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      ckubeadm.KubeadmConfigConfigMap,
			Namespace: metav1.NamespaceSystem,
		},
		Data: map[string]string{
			ckubeadm.ClusterConfigurationConfigMapKey: clusterConfig,
		},
	})

	cfgDir := filepath.Join(rootDir, "test-cluster", "etc")
	if err := os.MkdirAll(cfgDir, 0o755); err != nil {
		t.Fatalf("mkdir etc dir: %v", err)
	}
	adminFile := filepath.Join(cfgDir, "admin.conf")
	if err := os.WriteFile(adminFile, []byte("apiVersion: v1\nkind: Config\n"), 0o600); err != nil {
		t.Fatalf("write admin.conf: %v", err)
	}

	rt := &KubeadmRuntime{
		cli: &stubKubeClient{
			k8s: client,
			cfg: &rest.Config{Host: "https://127.0.0.1:6443"},
		},
		cluster:       &v1beta1.Cluster{},
		kubeadmConfig: types.NewKubeadmConfig(),
		pathResolver:  constants.NewPathResolver("test-cluster"),
	}
	rt.kubeadmConfig.ClusterConfiguration.Networking.ServiceSubnet = ""

	if err := rt.mergeWithBuiltinKubeadmConfig(); err != nil {
		t.Fatalf("mergeWithBuiltinKubeadmConfig() error = %v", err)
	}
	if got := rt.getServiceCIDR(); got != "10.96.0.0/12" {
		t.Fatalf("serviceSubnet = %q, want %q", got, "10.96.0.0/12")
	}
	if got := rt.getDNSDomain(); got != "cluster.local" {
		t.Fatalf("dnsDomain = %q, want %q", got, "cluster.local")
	}
	if got := rt.getCertSANs(); len(got) != 2 || got[1] != "apiserver.example.local" {
		t.Fatalf("certSANs = %v, want [127.0.0.1 apiserver.example.local]", got)
	}
}

func TestPreV131RemoteMigrationLoadsNetworkingFromClusterConfig(t *testing.T) {
	rootDir := t.TempDir()
	prevRuntimeRoot := constants.DefaultRuntimeRootDir
	constants.DefaultRuntimeRootDir = rootDir
	t.Cleanup(func() {
		constants.DefaultRuntimeRootDir = prevRuntimeRoot
	})

	clusterConfig := `apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
networking:
  serviceSubnet: 10.96.0.0/12
  podSubnet: 10.244.0.0/16
  dnsDomain: cluster.local
apiServer:
  certSANs:
  - 127.0.0.1
  - apiserver.example.local`

	client := clientset.NewSimpleClientset(&corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      ckubeadm.KubeadmConfigConfigMap,
			Namespace: metav1.NamespaceSystem,
		},
		Data: map[string]string{
			ckubeadm.ClusterConfigurationConfigMapKey: clusterConfig,
		},
	})

	cfgDir := filepath.Join(rootDir, "test-cluster", "etc")
	if err := os.MkdirAll(cfgDir, 0o755); err != nil {
		t.Fatalf("mkdir etc dir: %v", err)
	}
	adminFile := filepath.Join(cfgDir, "admin.conf")
	if err := os.WriteFile(adminFile, []byte("apiVersion: v1\nkind: Config\n"), 0o600); err != nil {
		t.Fatalf("write admin.conf: %v", err)
	}

	rt := &KubeadmRuntime{
		cli: &stubKubeClient{
			k8s: client,
			cfg: &rest.Config{Host: "https://127.0.0.1:6443"},
		},
		cluster:       &v1beta1.Cluster{},
		kubeadmConfig: types.NewKubeadmConfig(),
		pathResolver:  constants.NewPathResolver("test-cluster"),
	}
	rt.kubeadmConfig.ClusterConfiguration.Networking.ServiceSubnet = ""

	if err := rt.mergeWithBuiltinKubeadmConfig(); err != nil {
		t.Fatalf("mergeWithBuiltinKubeadmConfig() error = %v", err)
	}
	if got := rt.getServiceCIDR(); got != "10.96.0.0/12" {
		t.Fatalf("serviceSubnet = %q, want %q", got, "10.96.0.0/12")
	}
}

type stubKubeClient struct {
	k8s kubernetesclient.Interface
	cfg *rest.Config
}

var _ clientkubernetes.Client = (*stubKubeClient)(nil)

func (s *stubKubeClient) Kubernetes() kubernetesclient.Interface { return s.k8s }

func (s *stubKubeClient) Discovery() discovery.DiscoveryInterface { return nil }

func (s *stubKubeClient) KubernetesDynamic() dynamic.Interface { return nil }

func (s *stubKubeClient) Config() *rest.Config { return s.cfg }
