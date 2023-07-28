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

package runtime

import (
	"context"
	"fmt"
	"path"
	"path/filepath"
	"time"

	"github.com/Masterminds/semver/v3"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/json"
	kubeproxyconfigv1alpha1 "k8s.io/kube-proxy/config/v1alpha1"
	kubeletconfigv1beta1 "k8s.io/kubelet/config/v1beta1"
	"k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm"
	"k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta2"
	"k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta3"

	"github.com/labring/sealos/pkg/constants"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
	strings2 "github.com/labring/sealos/pkg/utils/strings"
	"github.com/labring/sealos/pkg/utils/yaml"
)

var (
	V1130 = semver.MustParse("v1.13.0")
	V1150 = semver.MustParse("v1.15.0")
	V1220 = semver.MustParse("v1.22.0")
	V1250 = semver.MustParse("v1.25.0")
	V1260 = semver.MustParse("v1.26.0")
	V1270 = semver.MustParse("v1.27.0")
	V1280 = semver.MustParse("v1.28.0")
)

const (
	KubeadmV1beta1 = "kubeadm.k8s.io/v1beta1"
	KubeadmV1beta2 = "kubeadm.k8s.io/v1beta2"
	KubeadmV1beta3 = "kubeadm.k8s.io/v1beta3"

	DefaultAPIServerDomain = "apiserver.cluster.local"
	DefaultDNSDomain       = "cluster.local"
	DefaultVIP             = "10.103.97.2"
	DefaultAPIServerPort   = 6443
)

// k.getKubeVersion can't be empty
func (k *KubeadmRuntime) setKubeadmAPIVersion() {
	kubeVersion := k.getKubeVersionFromImage()
	version := getterKubeadmAPIVersion(kubeVersion)
	k.setAPIVersion(version)
	k.setKubeVersion(kubeVersion)
}

func (k *KubeadmRuntime) getKubeadmAPIVersion() string {
	return k.InitConfiguration.APIVersion
}

func (k *KubeadmRuntime) setKubeVersion(version string) {
	k.ClusterConfiguration.KubernetesVersion = version
}

func (k *KubeadmRuntime) setAPIVersion(apiVersion string) {
	k.InitConfiguration.APIVersion = apiVersion
	k.ClusterConfiguration.APIVersion = apiVersion
	k.JoinConfiguration.APIVersion = apiVersion
}

// GetterKubeadmAPIVersion is covert version to kubeadmAPIServerVersion
// The support matrix will look something like this now and in the future:
// v1.10 and earlier: v1alpha1
// v1.11: v1alpha1 read-only, writes only v1alpha2 Config
// v1.12: v1alpha2 read-only, writes only v1alpha3 Config. Errors if the user tries to use v1alpha1
// v1.13: v1alpha3 read-only, writes only v1beta1 Config. Errors if the user tries to use v1alpha1 or v1alpha2
// v1.14: v1alpha3 convert only, writes only v1beta1 Config. Errors if the user tries to use v1alpha1 or v1alpha2
// v1.15: v1beta1 read-only, writes only v1beta2 Config. Errors if the user tries to use v1alpha1, v1alpha2 or v1alpha3
// v1.22: v1beta2 read-only, writes only v1beta3 Config. Errors if the user tries to use v1beta1 and older
func getterKubeadmAPIVersion(kubeVersion string) string {
	v := semver.MustParse(kubeVersion)
	var apiVersion string
	switch {
	// kubernetes gt 1.13, lt 1.15
	case gte(v, V1130) && v.LessThan(V1150):
		apiVersion = KubeadmV1beta1
	// kubernetes gt 1.15, lt 1.22
	case gte(v, V1150) && v.LessThan(V1220):
		apiVersion = KubeadmV1beta2
	// kubernetes gte 1.22
	case gte(v, V1220) && v.LessThan(V1280):
		apiVersion = KubeadmV1beta3
	default:
		apiVersion = KubeadmV1beta3
	}
	return apiVersion
}

func gte(v1, v2 *semver.Version) bool {
	return v1.Equal(v2) || v1.GreaterThan(v2)
}

func (k *KubeadmRuntime) getCGroupDriver(node string) (string, error) {
	driver, err := k.getRemoteInterface().CGroup(node)
	if err != nil {
		return "", err
	}
	logger.Debug("get nodes [%s] cgroup driver is [%s]", node, driver)
	return driver, nil
}

// MergeKubeadmConfig Unsafe, dangerous use of goroutines.
func (k *KubeadmRuntime) MergeKubeadmConfig() error {
	k.ImageKubeVersion = k.getKubeVersionFromImage()
	for _, fn := range []string{
		"",                          // generate default kubeadm configs
		k.getDefaultKubeadmConfig(), // merging from predefined path of file if file exists
	} {
		if err := k.Merge(fn); err != nil {
			return err
		}
	}
	// merge from clusterfile
	if k.Config.ClusterFileKubeConfig != nil {
		if err := k.LoadFromClusterfile(k.Config.ClusterFileKubeConfig); err != nil {
			return fmt.Errorf("failed to load kubeadm config from clusterfile: %v", err)
		}
	}
	k.setKubeadmAPIVersion()
	k.setFeatureGatesConfiguration()
	return k.validateVIP(k.getVip())
}

func (k *KubeadmRuntime) validateVIP(ip string) error {
	for k, sub := range map[string]string{
		"podSubnet":     k.KubeadmConfig.Networking.PodSubnet,
		"serviceSubnet": k.KubeadmConfig.Networking.ServiceSubnet,
	} {
		if contains, err := iputils.Contains(sub, ip); err != nil {
			return err
		} else if contains {
			return fmt.Errorf("ensure IP %s is not in %s range", ip, k)
		}
	}
	return nil
}

func (k *KubeadmRuntime) getDefaultKubeadmConfig() string {
	return filepath.Join(k.getContentData().RootFSEtcPath(), constants.DefaultRootfsKubeadmFileName)
}

func (k *KubeadmRuntime) getClusterName() string {
	return k.Cluster.Name
}

func (k *KubeadmRuntime) getVip() string {
	return k.getVIPFromImage()
}

func (k *KubeadmRuntime) getAPIServerPort() int32 {
	if k.InitConfiguration.LocalAPIEndpoint.BindPort == 0 {
		return DefaultAPIServerPort
	}
	return k.InitConfiguration.LocalAPIEndpoint.BindPort
}

func (k *KubeadmRuntime) getVipAndPort() string {
	return fmt.Sprintf("%s:%d", k.getVip(), k.getAPIServerPort())
}
func (k *KubeadmRuntime) getAPIServerDomain() string {
	return k.Config.APIServerDomain
}
func (k *KubeadmRuntime) getClusterAPIServer() string {
	return fmt.Sprintf("https://%s:%d", k.getAPIServerDomain(), k.getAPIServerPort())
}

func (k *KubeadmRuntime) getCertSANS() []string {
	return k.ClusterConfiguration.APIServer.CertSANs
}

func (k *KubeadmRuntime) initCertSANS() {
	var certSans []string
	certSans = append(certSans, "127.0.0.1")
	certSans = append(certSans, k.getAPIServerDomain())
	certSans = append(certSans, k.getVip())
	certSans = append(certSans, k.getMasterIPList()...)
	certSans = append(certSans, k.getCertSANS()...)
	k.setCertSANS(certSans)
}

func (k *KubeadmRuntime) setCertSANS(certs []string) {
	var certSans []string
	certSans = append(certSans, certs...)
	certSans = strings2.RemoveDuplicate(certSans)
	k.ClusterConfiguration.APIServer.CertSANs = certSans
}

func (k *KubeadmRuntime) fetchKubeadmConfig() error {
	logger.Info("fetch certSANs from kubeadm configmap")
	data, err := k.getKubeExpansion().FetchKubeadmConfig(context.Background())
	if err != nil {
		return err
	}
	//unmarshal data from configmap
	obj, err := yaml.UnmarshalData([]byte(data))
	if err != nil {
		return err
	}
	logger.Debug("current cluster config data: %+v", obj)

	var certs []string
	certsStruct, exist, err := unstructured.NestedSlice(obj, "apiServer", "certSANs")
	if !exist {
		if err != nil {
			return err
		}
		return fmt.Errorf("apiServer certSANs not exist")
	}
	for i := range certsStruct {
		certs = append(certs, certsStruct[i].(string))
	}
	logger.Debug("current cluster certSANs: %+v", certs)
	k.setCertSANS(certs)
	return k.setNetWorking(obj)
}

func (k *KubeadmRuntime) setNetWorking(obj map[string]interface{}) error {
	networkingMap, found, err := unstructured.NestedStringMap(obj, "networking")
	if !found || err != nil {
		return fmt.Errorf("networking section not found or cannot be parsed: %v", err)
	}

	requiredKeys := []string{"podSubnet", "serviceSubnet", "dnsDomain"}

	for _, key := range requiredKeys {
		if _, ok := networkingMap[key]; !ok {
			return fmt.Errorf("networking %s not exist", key)
		}
	}
	k.ClusterConfiguration.Networking.ServiceSubnet = networkingMap["serviceSubnet"]
	k.ClusterConfiguration.Networking.DNSDomain = networkingMap["dnsDomain"]
	k.ClusterConfiguration.Networking.PodSubnet = networkingMap["podSubnet"]
	return nil
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

func (k *KubeadmRuntime) writeTokenFile() error {
	if err := setCertificateKey(k); err != nil {
		return err
	}
	tokenFile := path.Join(k.getContentData().EtcPath(), constants.DefaultKubeadmTokenFileName)
	data, err := k.execToken(k.getMaster0IPAndPort(), k.getInitCertificateKey())
	if err != nil {
		return err
	}
	if err = fileutil.WriteFile(tokenFile, []byte(data)); err != nil {
		return err
	}
	var t Token
	err = json.Unmarshal([]byte(data), &t)
	if err != nil {
		return err
	}
	k.Token = &t
	return nil
}

func (k *KubeadmRuntime) setKubernetesToken() error {
	if k.Token == nil {
		logger.Info("start to get kubernetes token...")
		tokenFile := path.Join(k.getContentData().EtcPath(), constants.DefaultKubeadmTokenFileName)
		if !fileutil.IsExist(tokenFile) {
			err := k.writeTokenFile()
			if err != nil {
				return err
			}
		} else {
			data, err := fileutil.ReadAll(tokenFile)
			if err != nil {
				return err
			}
			var t Token
			err = json.Unmarshal(data, &t)
			if err != nil {
				return err
			}
			now := time.Now()
			sub := t.Expires.Time.Sub(now)
			//only get 3min token
			if sub <= 180 {
				err = k.writeTokenFile()
				if err != nil {
					return err
				}
			} else {
				k.Token = &t
			}
		}
	}
	k.setJoinToken(k.Token.JoinToken)
	k.setTokenCaCertHash(k.Token.DiscoveryTokenCaCertHash)
	k.setJoinCertificateKey(k.Token.CertificateKey)

	return nil
}

func (k *KubeadmRuntime) setJoinToken(token string) {
	if k.JoinConfiguration.Discovery.BootstrapToken == nil {
		k.JoinConfiguration.Discovery.BootstrapToken = &kubeadm.BootstrapTokenDiscovery{}
	}
	k.JoinConfiguration.Discovery.BootstrapToken.Token = token
}

func (k *KubeadmRuntime) getJoinToken() string {
	if k.JoinConfiguration.Discovery.BootstrapToken == nil {
		return ""
	}
	return k.JoinConfiguration.Discovery.BootstrapToken.Token
}

func (k *KubeadmRuntime) setTokenCaCertHash(tokenCaCertHash []string) {
	if k.JoinConfiguration.Discovery.BootstrapToken == nil {
		k.JoinConfiguration.Discovery.BootstrapToken = &kubeadm.BootstrapTokenDiscovery{}
	}
	k.JoinConfiguration.Discovery.BootstrapToken.CACertHashes = tokenCaCertHash
}

func (k *KubeadmRuntime) getTokenCaCertHash() []string {
	if k.JoinConfiguration.Discovery.BootstrapToken == nil || len(k.JoinConfiguration.Discovery.BootstrapToken.CACertHashes) == 0 {
		return nil
	}
	return k.JoinConfiguration.Discovery.BootstrapToken.CACertHashes
}

func (k *KubeadmRuntime) setJoinCertificateKey(certificateKey string) {
	if k.JoinConfiguration.ControlPlane == nil {
		k.JoinConfiguration.ControlPlane = &kubeadm.JoinControlPlane{}
	}
	k.JoinConfiguration.ControlPlane.CertificateKey = certificateKey
}

func (k *KubeadmRuntime) setInitCertificateKey(certificateKey string) {
	k.InitConfiguration.CertificateKey = certificateKey
}

func (k *KubeadmRuntime) getInitCertificateKey() string {
	return k.InitConfiguration.CertificateKey
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
		k.JoinConfiguration.ControlPlane = &kubeadm.JoinControlPlane{}
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

func (k *KubeadmRuntime) setInitTaints() {
	if len(k.Cluster.GetAllIPS()) == 1 &&
		k.InitConfiguration.NodeRegistration.Taints == nil {
		//set this field to an empty slice avoid to taint control-plane in single host
		k.InitConfiguration.NodeRegistration.Taints = make([]v1.Taint, 0)
	}
}

func (k *KubeadmRuntime) setExcludeCIDRs() {
	k.IPVS.ExcludeCIDRs = append(k.KubeProxyConfiguration.IPVS.ExcludeCIDRs, fmt.Sprintf("%s/32", k.getVip()))
	k.IPVS.ExcludeCIDRs = strings2.RemoveDuplicate(k.IPVS.ExcludeCIDRs)
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

func (k *KubeadmRuntime) getCRISocket(node string) (string, error) {
	criSocket, err := k.getRemoteInterface().Socket(node)
	if err != nil {
		return "", err
	}
	logger.Debug("get nodes [%s] cri socket is [%s]", node, criSocket)
	return criSocket, nil
}

//nolint:all
func (k *KubeadmRuntime) setCRISocket(criSocket string) {
	k.JoinConfiguration.NodeRegistration.CRISocket = criSocket
	k.InitConfiguration.NodeRegistration.CRISocket = criSocket
}

var setCGroupDriverAndSocket = func(krt *KubeadmRuntime) error {
	return krt.setCGroupDriverAndSocket(krt.getMaster0IPAndPort())
}

var setCertificateKey = func(krt *KubeadmRuntime) error {
	certificateKeyFile := path.Join(krt.getContentData().EtcPath(), constants.DefaultCertificateKeyFileName)
	var key string
	if !fileutil.IsExist(certificateKeyFile) {
		key, _ = CreateCertificateKey()
		err := fileutil.WriteFile(certificateKeyFile, []byte(key))
		if err != nil {
			return err
		}
	} else {
		data, err := fileutil.ReadAll(certificateKeyFile)
		if err != nil {
			return err
		}
		key = string(data)
	}
	krt.setInitCertificateKey(key)
	return nil
}

func (k *KubeadmRuntime) generateInitConfigs() ([]byte, error) {
	if err := k.ConvertInitConfigConversion(setCGroupDriverAndSocket, setCertificateKey); err != nil {
		return nil, err
	}
	return yaml.MarshalYamlConfigs(&k.conversion.InitConfiguration,
		&k.conversion.ClusterConfiguration,
		&k.conversion.KubeletConfiguration,
		&k.conversion.KubeProxyConfiguration)
}

func (k *KubeadmRuntime) ConvertInitConfigConversion(fns ...func(*KubeadmRuntime) error) error {
	if err := k.MergeKubeadmConfig(); err != nil {
		return err
	}
	for _, fn := range fns {
		if err := fn(k); err != nil {
			return err
		}
	}
	k.setInitAdvertiseAddress(k.getMaster0IP())
	k.setControlPlaneEndpoint(fmt.Sprintf("%s:%d", k.getAPIServerDomain(), k.getAPIServerPort()))
	if k.APIServer.ExtraArgs == nil {
		k.APIServer.ExtraArgs = make(map[string]string)
	}
	k.setExcludeCIDRs()
	k.initCertSANS()
	k.setInitTaints()
	// after all merging done, set default fields
	k.finalizeInitConfig()

	if err := k.convertKubeadmVersion(); err != nil {
		return fmt.Errorf("convert kubeadm version failed: %w", err)
	}
	return nil
}

func (k *KubeadmRuntime) finalizeInitConfig() {
	for _, obj := range []k8sruntime.Object{
		&k.ClusterConfiguration,
		&k.InitConfiguration,
		&k.JoinConfiguration,
		&k.KubeProxyConfiguration,
		&k.KubeletConfiguration,
	} {
		scheme.Default(obj)
	}
}

func (k *KubeadmRuntime) convertKubeadmVersion() error {
	var err error
	kubeadmVersion := k.getKubeadmAPIVersion()
	switch kubeadmVersion {
	case KubeadmV1beta2:
		var v1beta2InitConfiguration v1beta2.InitConfiguration
		var v1beta2ClusterConfiguration v1beta2.ClusterConfiguration
		var v1beta2JoinConfiguration v1beta2.JoinConfiguration
		if err = v1beta2.Convert_kubeadm_InitConfiguration_To_v1beta2_InitConfiguration(&k.InitConfiguration, &v1beta2InitConfiguration, nil); err != nil {
			return err
		}
		if err = v1beta2.Convert_kubeadm_ClusterConfiguration_To_v1beta2_ClusterConfiguration(&k.ClusterConfiguration, &v1beta2ClusterConfiguration, nil); err != nil {
			return err
		}
		if err = v1beta2.Convert_kubeadm_JoinConfiguration_To_v1beta2_JoinConfiguration(&k.JoinConfiguration, &v1beta2JoinConfiguration, nil); err != nil {
			return err
		}

		v1beta2InitConfiguration.APIVersion = v1beta2.SchemeGroupVersion.String()
		v1beta2ClusterConfiguration.APIVersion = v1beta2.SchemeGroupVersion.String()
		v1beta2JoinConfiguration.APIVersion = v1beta2.SchemeGroupVersion.String()
		v1beta2InitConfiguration.Kind = "InitConfiguration"
		v1beta2ClusterConfiguration.Kind = "ClusterConfiguration"
		v1beta2JoinConfiguration.Kind = "JoinConfiguration"
		k.conversion.InitConfiguration = v1beta2InitConfiguration
		k.conversion.ClusterConfiguration = v1beta2ClusterConfiguration
		k.conversion.JoinConfiguration = v1beta2JoinConfiguration

	case KubeadmV1beta3:
		var v1beta3InitConfiguration v1beta3.InitConfiguration
		var v1beta3ClusterConfiguration v1beta3.ClusterConfiguration
		var v1beta3JoinConfiguration v1beta3.JoinConfiguration
		if err = v1beta3.Convert_kubeadm_InitConfiguration_To_v1beta3_InitConfiguration(&k.InitConfiguration, &v1beta3InitConfiguration, nil); err != nil {
			return err
		}
		if err = v1beta3.Convert_kubeadm_ClusterConfiguration_To_v1beta3_ClusterConfiguration(&k.ClusterConfiguration, &v1beta3ClusterConfiguration, nil); err != nil {
			return err
		}
		if err = v1beta3.Convert_kubeadm_JoinConfiguration_To_v1beta3_JoinConfiguration(&k.JoinConfiguration, &v1beta3JoinConfiguration, nil); err != nil {
			return err
		}
		v1beta3InitConfiguration.APIVersion = v1beta3.SchemeGroupVersion.String()
		v1beta3ClusterConfiguration.APIVersion = v1beta3.SchemeGroupVersion.String()
		v1beta3JoinConfiguration.APIVersion = v1beta3.SchemeGroupVersion.String()
		v1beta3InitConfiguration.Kind = "InitConfiguration"
		v1beta3ClusterConfiguration.Kind = "ClusterConfiguration"
		v1beta3JoinConfiguration.Kind = "JoinConfiguration"
		k.conversion.InitConfiguration = v1beta3InitConfiguration
		k.conversion.ClusterConfiguration = v1beta3ClusterConfiguration
		k.conversion.JoinConfiguration = v1beta3JoinConfiguration
	default:
		k.conversion.JoinConfiguration = k.JoinConfiguration
		k.conversion.InitConfiguration = k.InitConfiguration
		k.conversion.ClusterConfiguration = k.ClusterConfiguration
	}

	{
		var v1beta1Kubelet kubeletconfigv1beta1.KubeletConfiguration
		var v1alpha1KubeProxy kubeproxyconfigv1alpha1.KubeProxyConfiguration
		//if err = v1alpha1.Convert_config_KubeProxyConfiguration_To_v1alpha1_KubeProxyConfiguration(&k.KubeProxyConfiguration, &v1alpha1KubeProxy, nil); err != nil {
		//	return err
		//}
		v1beta1Kubelet = k.KubeletConfiguration
		//if err = v1beta1.Convert_config_KubeletConfiguration_To_v1beta1_KubeletConfiguration(&k.KubeletConfiguration, &v1beta1Kubelet, nil); err != nil {
		//	return err
		//}
		v1alpha1KubeProxy = k.KubeProxyConfiguration
		v1beta1Kubelet.APIVersion = kubeletconfigv1beta1.SchemeGroupVersion.String()
		v1alpha1KubeProxy.APIVersion = kubeproxyconfigv1alpha1.SchemeGroupVersion.String()
		v1beta1Kubelet.Kind = "KubeletConfiguration"
		v1alpha1KubeProxy.Kind = "KubeProxyConfiguration"
		k.conversion.KubeProxyConfiguration = v1alpha1KubeProxy
		k.conversion.KubeletConfiguration = v1beta1Kubelet
	}

	return nil
}

func (k *KubeadmRuntime) generateJoinNodeConfigs(node string) ([]byte, error) {
	if err := k.MergeKubeadmConfig(); err != nil {
		return nil, err
	}
	if err := k.setCGroupDriverAndSocket(node); err != nil {
		return nil, err
	}
	k.cleanJoinLocalAPIEndPoint()
	k.setAPIServerEndpoint(k.getVipAndPort())
	if err := k.convertKubeadmVersion(); err != nil {
		return nil, fmt.Errorf("convert kubeadm version failed: %w", err)
	}
	return yaml.MarshalYamlConfigs(
		&k.conversion.KubeletConfiguration,
		&k.conversion.JoinConfiguration)
}

func (k *KubeadmRuntime) generateJoinMasterConfigs(masterIP string) ([]byte, error) {
	if err := k.MergeKubeadmConfig(); err != nil {
		return nil, err
	}
	if err := k.setCGroupDriverAndSocket(masterIP); err != nil {
		return nil, err
	}
	k.setJoinAdvertiseAddress(iputils.GetHostIP(masterIP))
	k.setAPIServerEndpoint(fmt.Sprintf("%s:%d", k.getMaster0IP(), k.getAPIServerPort()))
	if err := k.convertKubeadmVersion(); err != nil {
		return nil, fmt.Errorf("convert kubeadm version failed: %w", err)
	}
	return yaml.MarshalYamlConfigs(k.conversion.JoinConfiguration, k.conversion.KubeletConfiguration)
}

func (k *KubeadmRuntime) setCGroupDriverAndSocket(node string) error {
	criSocket, err := k.getCRISocket(node)
	if err != nil {
		return err
	}
	logger.Debug("node: %s , criSocket: %s", node, criSocket)
	k.setCRISocket(criSocket)
	cGroupDriver, err := k.getCGroupDriver(node)
	if err != nil {
		return err
	}
	logger.Debug("node: %s , cGroupDriver: %s", node, cGroupDriver)
	k.setCgroupDriver(cGroupDriver)
	return nil
}
