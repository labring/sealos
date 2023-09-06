// Copyright © 2023 sealos.
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

package k3s

import (
	"time"
)

// from github.com/k3s-io/k3s/pkg/cli/cmds/server.go
type Config struct {
	ClusterCIDR          []string `json:"cluster-cidr,omitempty"`
	AgentToken           string   `json:"agent-token,omitempty"`
	AgentTokenFile       string   `json:"agent-token-file,omitempty"`
	ClusterSecret        string   `json:"-"`
	ServiceCIDR          []string `json:"service-cidr,omitempty"`
	ServiceNodePortRange string   `json:"service-node-port-range,omitempty"`
	ClusterDNS           []string `json:"cluster-dns,omitempty"`
	ClusterDomain        string   `json:"cluster-domain,omitempty"`
	// The port which kubectl clients can access k8s
	HTTPSPort int `json:"https-listen-port,omitempty"`
	// The port which custom k3s API runs on
	SupervisorPort int `json:"-"`
	// The port which kube-apiserver runs on
	APIServerPort            int           `json:"-"`
	APIServerBindAddress     string        `json:"-"`
	DisableAgent             bool          `json:"disable-agent,omitempty"`
	KubeConfigOutput         string        `json:"write-kubeconfig,omitempty"`
	KubeConfigMode           string        `json:"write-kubeconfig-mode,omitempty"`
	HelmJobImage             string        `json:"helm-job-image,omitempty"`
	TLSSan                   []string      `json:"tls-san,omitempty"`
	BindAddress              string        `json:"bind-address,omitempty"`
	EnablePProf              bool          `json:"enable-pprof,omitempty"`
	ExtraAPIArgs             []string      `json:"kube-apiserver-arg,omitempty"`
	ExtraEtcdArgs            []string      `json:"etcd-arg,omitempty"`
	ExtraSchedulerArgs       []string      `json:"kube-scheduler-arg,omitempty"`
	ExtraControllerArgs      []string      `json:"kube-controller-manager-arg,omitempty"`
	ExtraCloudControllerArgs []string      `json:"kube-cloud-controller-manager-arg,omitempty"`
	DatastoreEndpoint        string        `json:"datastore-endpoint,omitempty"`
	DatastoreCAFile          string        `json:"datastore-cafile,omitempty"`
	DatastoreCertFile        string        `json:"datastore-certfile,omitempty"`
	DatastoreKeyFile         string        `json:"datastore-keyfile,omitempty"`
	AdvertiseIP              string        `json:"advertise-address,omitempty"`
	AdvertisePort            int           `json:"advertise-port,omitempty"`
	DisableScheduler         bool          `json:"disable-scheduler,omitempty"`
	MultiClusterCIDR         bool          `json:"multi-cluster-cidr,omitempty"`
	FlannelBackend           string        `json:"flannel-backend,omitempty"`
	FlannelIPv6Masq          bool          `json:"flannel-ipv6-masq,omitempty"`
	FlannelExternalIP        bool          `json:"flannel-external-ip,omitempty"`
	EgressSelectorMode       string        `json:"egress-selector-mode,omitempty"`
	DefaultLocalStoragePath  string        `json:"default-local-storage-path,omitempty"`
	Disable                  []string      `json:"disable,omitempty"`
	DisableCCM               bool          `json:"disable-cloud-controller,omitempty"`
	DisableNPC               bool          `json:"disable-network-policy,omitempty"`
	DisableHelmController    bool          `json:"disable-helm-controller,omitempty"`
	DisableKubeProxy         bool          `json:"disable-kube-proxy,omitempty"`
	DisableAPIServer         bool          `json:"disable-apiserver,omitempty"`
	DisableControllerManager bool          `json:"disable-controller-manager,omitempty"`
	DisableETCD              bool          `json:"disable-etcd,omitempty"`
	ClusterInit              bool          `json:"cluster-init,omitempty"`
	ClusterReset             bool          `json:"cluster-reset,omitempty"`
	ClusterResetRestorePath  string        `json:"cluster-reset-restore-path,omitempty"`
	EncryptSecrets           bool          `json:"secrets-encryption,omitempty"`
	EncryptForce             bool          `json:"-"`
	EncryptOutput            string        `json:"-"`
	EncryptSkip              bool          `json:"-"`
	SystemDefaultRegistry    string        `json:"system-default-registry,omitempty"`
	EtcdSnapshotName         string        `json:"etcd-snapshot-name,omitempty"`
	EtcdDisableSnapshots     bool          `json:"etcd-disable-snapshots,omitempty"`
	EtcdExposeMetrics        bool          `json:"etcd-expose-metrics,omitempty"`
	EtcdSnapshotDir          string        `json:"etcd-snapshot-dir,omitempty"`
	EtcdSnapshotCron         string        `json:"etcd-snapshot-schedule-cron,omitempty"`
	EtcdSnapshotRetention    int           `json:"etcd-snapshot-retention,omitempty"`
	EtcdSnapshotCompress     bool          `json:"etcd-snapshot-compress,omitempty"`
	EtcdS3                   bool          `json:"etcd-s3,omitempty"`
	EtcdS3Endpoint           string        `json:"etcd-s3-endpoint,omitempty"`
	EtcdS3EndpointCA         string        `json:"etcd-s3-endpoint-ca,omitempty"`
	EtcdS3SkipSSLVerify      bool          `json:"etcd-s3-skip-ssl-verify,omitempty"`
	EtcdS3AccessKey          string        `json:"etcd-s3-access-key,omitempty"`
	EtcdS3SecretKey          string        `json:"etcd-s3-secret-key,omitempty"`
	EtcdS3BucketName         string        `json:"etcd-s3-bucket,omitempty"`
	EtcdS3Region             string        `json:"etcd-s3-region,omitempty"`
	EtcdS3Folder             string        `json:"etcd-s3-folder,omitempty"`
	EtcdS3Timeout            time.Duration `json:"etcd-s3-timeout,omitempty"`
	EtcdS3Insecure           bool          `json:"etcd-s3-insecure,omitempty"`
	ServiceLBNamespace       string        `json:"servicelb-namespace,omitempty"`
	*AgentConfig
}

type AgentConfig struct {
	Debug                    bool     `json:"debug,omitempty"`
	VLevel                   int      `json:"v,omitempty"`
	VModule                  string   `json:"vmodule,omitempty"`
	LogFile                  string   `json:"log,omitempty"`
	AlsoLogToStderr          bool     `json:"alsologtostderr,omitempty"`
	Token                    string   `json:"token,omitempty"`
	TokenFile                string   `json:"token-file,omitempty"`
	ServerURL                string   `json:"server,omitempty"`
	DataDir                  string   `json:"data-dir,omitempty"`
	LBServerPort             int      `json:"lb-server-port,omitempty"`
	ResolvConf               string   `json:"resolv-conf,omitempty"`
	NodeIP                   []string `json:"node-ip,omitempty"`
	NodeExternalIP           []string `json:"node-external-ip,omitempty"`
	NodeName                 string   `json:"node-name,omitempty"`
	PauseImage               string   `json:"pause-image,omitempty"`
	Snapshotter              string   `json:"snapshotter,omitempty"`
	Docker                   bool     `json:"docker,omitempty"`
	ContainerRuntimeEndpoint string   `json:"container-runtime-endpoint,omitempty"`
	FlannelIface             string   `json:"flannel-iface,omitempty"`
	FlannelConf              string   `json:"flannel-conf,omitempty"`
	FlannelCniConfFile       string   `json:"flannel-cni-conf,omitempty"`
	VPNAuth                  string   `json:"vpn-auth,omitempty"`
	VPNAuthFile              string   `json:"vpn-auth-file,omitempty"`
	RootlessAlreadyUnshared  bool     `json:"-"`
	WithNodeID               bool     `json:"with-node-id,omitempty"`
	EnableSELinux            bool     `json:"selinux,omitempty"`
	ProtectKernelDefaults    bool     `json:"protect-kernel-defaults,omitempty"`
	PrivateRegistry          string   `json:"private-registry,omitempty"`
	AirgapExtraRegistry      []string `json:"airgap-extra-registry,omitempty"`
	ExtraKubeletArgs         []string `json:"kubelet-arg,omitempty"`
	ExtraKubeProxyArgs       []string `json:"kube-proxy-arg,omitempty"`
	Labels                   []string `json:"node-label,omitempty"`
	Taints                   []string `json:"node-taint,omitempty"`
	ImageCredProvBinDir      string   `json:"image-credential-provider-bin-dir,omitempty"`
	ImageCredProvConfig      string   `json:"image-credential-provider-config,omitempty"`
	Rootless                 bool     `json:"rootless,omitempty"`
	PreferBundledBin         bool     `json:"prefer-bundled-bin,omitempty"`
}

func (c *Config) GetComponents() []any {
	return []any{c}
}
