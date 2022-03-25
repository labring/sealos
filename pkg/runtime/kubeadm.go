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

package runtime

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/fanux/sealos/pkg/utils/contants"

	"github.com/fanux/sealos/pkg/runtime/kubeadm_types/v1beta2"
	"github.com/fanux/sealos/pkg/token"
	"github.com/fanux/sealos/pkg/utils/logger"
	strings2 "github.com/fanux/sealos/pkg/utils/strings"
	"github.com/fanux/sealos/pkg/utils/versionutil"
	"github.com/fanux/sealos/pkg/utils/yaml"
	"k8s.io/apimachinery/pkg/util/json"
)

const (
	V1130 = "v1.13.0"
	V1150 = "v1.15.0"
	V1220 = "v1.22.0"

	KubeadmV1beta1 = "kubeadm.k8s.io/v1beta1"
	KubeadmV1beta2 = "kubeadm.k8s.io/v1beta2"
	KubeadmV1beta3 = "kubeadm.k8s.io/v1beta3"

	DefaultAPIServerDomain = "apiserver.cluster.local"
	DefaultDNSDomain       = "cluster.local"
	DefaultVIP             = "10.103.97.2"
)

// k.getKubeVersion can't be empty
func (k *KubeadmRuntime) setKubeadmAPIVersion() {
	version := getterKubeadmAPIVersion(k.getKubeVersion())
	k.setAPIVersion(version)
}

func (k *KubeadmRuntime) setAPIVersion(apiVersion string) {
	k.InitConfiguration.APIVersion = apiVersion
	k.ClusterConfiguration.APIVersion = apiVersion
	k.JoinConfiguration.APIVersion = apiVersion
}

//GetterKubeadmAPIVersion is covert version to kubeadmAPIServerVersion
// The support matrix will look something like this now and in the future:
// v1.10 and earlier: v1alpha1
// v1.11: v1alpha1 read-only, writes only v1alpha2 Config
// v1.12: v1alpha2 read-only, writes only v1alpha3 Config. Errors if the user tries to use v1alpha1
// v1.13: v1alpha3 read-only, writes only v1beta1 Config. Errors if the user tries to use v1alpha1 or v1alpha2
// v1.14: v1alpha3 convert only, writes only v1beta1 Config. Errors if the user tries to use v1alpha1 or v1alpha2
// v1.15: v1beta1 read-only, writes only v1beta2 Config. Errors if the user tries to use v1alpha1, v1alpha2 or v1alpha3
// v1.22: v1beta2 read-only, writes only v1beta3 Config. Errors if the user tries to use v1beta1 and older
func getterKubeadmAPIVersion(kubeVersion string) string {
	var apiVersion string
	switch {
	//kubernetes gt 1.13, lt 1.15
	case versionutil.Compare(kubeVersion, V1130) && !versionutil.Compare(kubeVersion, V1150):
		apiVersion = KubeadmV1beta1
	//kubernetes gt 1.15, lt 1.22
	case versionutil.Compare(kubeVersion, V1150) && !versionutil.Compare(kubeVersion, V1220):
		apiVersion = KubeadmV1beta2
	// kubernetes gt 1.22,
	case versionutil.Compare(kubeVersion, V1220):
		apiVersion = KubeadmV1beta3
	default:
		apiVersion = KubeadmV1beta2
	}
	return apiVersion
}

func (k *KubeadmRuntime) getCGroupDriver(node string) (string, error) {
	driver, err := k.getRemoteInterface().CGroup(node)
	if err != nil {
		return "", err
	}
	logger.Debug("get nodes [%s] cgroup driver is [%s]", node, driver)
	return driver, nil
}

func (k *KubeadmRuntime) MergeKubeadmConfig() error {
	if k.Config.ClusterFileKubeConfig != nil {
		if err := k.LoadFromClusterfile(k.Config.ClusterFileKubeConfig); err != nil {
			return fmt.Errorf("failed to load kubeadm Config from clusterfile: %v", err)
		}
	}
	if err := k.Merge(k.getDefaultKubeadmConfig()); err != nil {
		return fmt.Errorf("failed to merge kubeadm Config: %v", err)
	}
	k.setKubeadmAPIVersion()
	return nil
}

func (k *KubeadmRuntime) getDefaultKubeadmConfig() string {
	return filepath.Join(k.getContantData().RootFSEtcPath(), contants.DefaultRootfsKubeadmFileName)
}

func (k *KubeadmRuntime) getClusterName() string {
	return k.Cluster.Name
}

func (k *KubeadmRuntime) getVip() string {
	return DefaultVIP
}

func (k *KubeadmRuntime) getVipAndPort() string {
	return fmt.Sprintf("%s:6443", k.getVip())
}
func (k *KubeadmRuntime) getAPIServerDomain() string {
	return k.Config.APIServerDomain
}
func (k *KubeadmRuntime) getClusterAPIServer() string {
	return fmt.Sprintf("https://%s:6443", k.getAPIServerDomain())
}

func (k *KubeadmRuntime) getCertSANS() []string {
	return k.ClusterConfiguration.APIServer.CertSANs
}

func (k *KubeadmRuntime) getServiceCIDR() string {
	return k.ClusterConfiguration.Networking.ServiceSubnet
}

func (k *KubeadmRuntime) getDNSDomain() string {
	if k.ClusterConfiguration.Networking.DNSDomain == "" {
		k.ClusterConfiguration.Networking.DNSDomain = DefaultDNSDomain
	}
	return k.ClusterConfiguration.Networking.DNSDomain
}

func (k *KubeadmRuntime) setKubernetesToken() error {
	logger.Info("start to get kubernetes token...")
	data, err := k.execToken(k.getMaster0IP())
	if err != nil {
		return err
	}
	var t token.Token
	err = json.Unmarshal([]byte(data), &t)
	if err != nil {
		return err
	}
	k.setJoinToken(t.JoinToken)
	k.setTokenCaCertHash(t.DiscoveryTokenCaCertHash)
	k.setCertificateKey(t.CertificateKey)
	return nil
}

func (k *KubeadmRuntime) setJoinToken(token string) {
	if k.Discovery.BootstrapToken == nil {
		k.Discovery.BootstrapToken = &v1beta2.BootstrapTokenDiscovery{}
	}
	k.Discovery.BootstrapToken.Token = token
}

func (k *KubeadmRuntime) getJoinToken() string {
	if k.Discovery.BootstrapToken == nil {
		return ""
	}
	return k.JoinConfiguration.Discovery.BootstrapToken.Token
}

func (k *KubeadmRuntime) setTokenCaCertHash(tokenCaCertHash []string) {
	if k.Discovery.BootstrapToken == nil {
		k.Discovery.BootstrapToken = &v1beta2.BootstrapTokenDiscovery{}
	}
	k.Discovery.BootstrapToken.CACertHashes = tokenCaCertHash
}

func (k *KubeadmRuntime) getTokenCaCertHash() []string {
	if k.Discovery.BootstrapToken == nil || len(k.Discovery.BootstrapToken.CACertHashes) == 0 {
		return nil
	}
	return k.Discovery.BootstrapToken.CACertHashes
}

func (k *KubeadmRuntime) setCertificateKey(certificateKey string) {
	k.InitConfiguration.CertificateKey = certificateKey
	k.JoinConfiguration.ControlPlane.CertificateKey = certificateKey
}

func (k *KubeadmRuntime) getJoinCertificateKey() string {
	if k.JoinConfiguration.ControlPlane == nil {
		return ""
	}
	return k.JoinConfiguration.ControlPlane.CertificateKey
}

func (k *KubeadmRuntime) setAPIServerEndpoint(endpoint string) {
	k.JoinConfiguration.Discovery.BootstrapToken.APIServerEndpoint = endpoint
}

func (k *KubeadmRuntime) setInitAdvertiseAddress(advertiseAddress string) {
	k.InitConfiguration.LocalAPIEndpoint.AdvertiseAddress = advertiseAddress
}

func (k *KubeadmRuntime) setJoinAdvertiseAddress(advertiseAddress string) {
	if k.JoinConfiguration.ControlPlane == nil {
		k.JoinConfiguration.ControlPlane = &v1beta2.JoinControlPlane{}
	}
	k.JoinConfiguration.ControlPlane.LocalAPIEndpoint.AdvertiseAddress = advertiseAddress
}

func (k *KubeadmRuntime) cleanJoinLocalAPIEndPoint() {
	k.JoinConfiguration.ControlPlane = nil
}

func (k *KubeadmRuntime) setControlPlaneEndpoint(endpoint string) {
	k.ControlPlaneEndpoint = endpoint
}

func (k *KubeadmRuntime) setCgroupDriver(cGroup string) {
	k.KubeletConfiguration.CgroupDriver = cGroup
}

func (k *KubeadmRuntime) setCertSANS() {
	var certSans []string
	certSans = append(certSans, "127.0.0.1")
	certSans = append(certSans, k.getAPIServerDomain())
	certSans = append(certSans, k.getVip())
	certSans = append(certSans, k.getMasterIPList()...)
	certSans = append(certSans, k.getCertSANS()...)
	certSans = strings2.RemoveDuplicate(certSans)
	k.ClusterConfiguration.APIServer.CertSANs = certSans
}

func (k *KubeadmRuntime) getEtcdDataDir() string {
	const defaultEtcdDataDir = "/var/lib/etcd"
	if k.ClusterConfiguration.Etcd.Local == nil {
		return defaultEtcdDataDir
	}
	if k.ClusterConfiguration.Etcd.Local.DataDir == "" {
		return defaultEtcdDataDir
	}
	return k.ClusterConfiguration.Etcd.Local.DataDir
}

func getEtcdEndpointsWithHTTPSPrefix(masters []string) string {
	var tmpSlice []string
	for _, ip := range masters {
		tmpSlice = append(tmpSlice, fmt.Sprintf("https://%s:2379", ip))
	}
	return strings.Join(tmpSlice, ",")
}

//nolint
func (k *KubeadmRuntime) setCRISocket(criSocket string) {
	k.JoinConfiguration.NodeRegistration.CRISocket = criSocket
	k.InitConfiguration.NodeRegistration.CRISocket = criSocket
}

func (k *KubeadmRuntime) generateInitConfigs() ([]byte, error) {
	if err := k.MergeKubeadmConfig(); err != nil {
		return nil, err
	}
	cGroupDriver, err := k.getCGroupDriver(k.getMaster0IP())
	if err != nil {
		return nil, err
	}
	k.setCgroupDriver(cGroupDriver)
	k.setInitAdvertiseAddress(k.getMaster0IP())
	k.setControlPlaneEndpoint(fmt.Sprintf("%s:6443", k.getAPIServerDomain()))
	if k.APIServer.ExtraArgs == nil {
		k.APIServer.ExtraArgs = make(map[string]string)
	}
	k.APIServer.ExtraArgs["etcd-servers"] = getEtcdEndpointsWithHTTPSPrefix(k.getMasterIPList())
	k.ClusterConfiguration.Etcd.Local = &v1beta2.LocalEtcd{DataDir: "/var/lib/etcd"}

	k.IPVS.ExcludeCIDRs = append(k.KubeProxyConfiguration.IPVS.ExcludeCIDRs, fmt.Sprintf("%s/32", k.getVip()))
	k.IPVS.ExcludeCIDRs = strings2.RemoveDuplicate(k.IPVS.ExcludeCIDRs)

	return yaml.MarshalYamlConfigs(&k.InitConfiguration,
		&k.ClusterConfiguration,
		&k.KubeletConfiguration,
		&k.KubeProxyConfiguration)
}

func (k *KubeadmRuntime) generateJoinNodeConfigs(node string) ([]byte, error) {
	if err := k.MergeKubeadmConfig(); err != nil {
		return nil, err
	}
	cGroupDriver, err := k.getCGroupDriver(node)
	if err != nil {
		return nil, err
	}
	k.setCgroupDriver(cGroupDriver)
	err = k.setKubernetesToken()
	if err != nil {
		return nil, err
	}
	k.cleanJoinLocalAPIEndPoint()
	k.setAPIServerEndpoint(k.getVipAndPort())
	return yaml.MarshalYamlConfigs(
		&k.KubeletConfiguration,
		&k.JoinConfiguration)
}

func (k *KubeadmRuntime) generateJoinMasterConfigs(masterIP string) ([]byte, error) {
	if err := k.MergeKubeadmConfig(); err != nil {
		return nil, err
	}
	cGroupDriver, err := k.getCGroupDriver(masterIP)
	if err != nil {
		return nil, err
	}
	k.setCgroupDriver(cGroupDriver)
	k.setJoinAdvertiseAddress(masterIP)
	err = k.setKubernetesToken()
	if err != nil {
		return nil, err
	}
	k.setAPIServerEndpoint(fmt.Sprintf("%s:6443", k.getMaster0IP()))
	return yaml.MarshalYamlConfigs(k.JoinConfiguration, k.KubeletConfiguration)
}
