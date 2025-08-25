/*
Copyright 2023 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package checkers

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"

	v1 "k8s.io/api/core/v1"

	"github.com/labring/sealos/test/e2e/testhelper/utils"

	"github.com/labring/sealos/pkg/types/v1beta1"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/yaml"
	proxy "k8s.io/kube-proxy/config/v1alpha1"
	kubelet "k8s.io/kubelet/config/v1beta1"
	"k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/test/e2e/testhelper/cmd"
)

type FakeInterface interface {
	Verify() error
}

type fakeClient struct {
	Cluster                 v1beta1.Cluster
	InitConfiguration       kubeadm.InitConfiguration
	ClusterConfiguration    kubeadm.ClusterConfiguration
	KubeProxyConfiguration  proxy.KubeProxyConfiguration
	KubeletConfiguration    kubelet.KubeletConfiguration
	JoinMasterConfiguration *struct {
		JoinConfiguration    kubeadm.JoinConfiguration
		KubeletConfiguration kubelet.KubeletConfiguration
	}
	JoinNodeConfiguration *struct {
		JoinConfiguration    kubeadm.JoinConfiguration
		KubeletConfiguration kubelet.KubeletConfiguration
	}

	clusterName string
	cmd         cmd.Interface
}

type FakeClientGroup struct {
	clients []FakeInterface
}

type FakeOpts struct {
	Socket      string
	Cgroup      string
	PodCIDR     string
	ServiceCIDR string
	CertSan     string
	CertDomain  string
	Taints      map[string]string
	Images      []string
	Etcd        []string
}

func NewFakeGroupClient(name string, opt *FakeOpts) (*FakeClientGroup, error) {
	if name == "" {
		name = "default"
	}
	client := &fakeClient{clusterName: name, cmd: &cmd.LocalCmd{}}
	if err := client.loadInitConfig(); err != nil {
		return nil, err
	}
	if opt == nil {
		opt = &FakeOpts{}
	}

	if opt.Socket == "" {
		opt.Socket = "/run/containerd/containerd.sock"
	}
	if opt.Cgroup == "" {
		opt.Cgroup = "systemd"
	}
	if opt.PodCIDR == "" {
		opt.PodCIDR = "100.64.0.0/10"
	}
	if opt.ServiceCIDR == "" {
		opt.ServiceCIDR = "10.96.0.0/22"
	}
	if opt.Etcd == nil {
		opt.Etcd = make([]string, 0)
	}

	return &FakeClientGroup{clients: []FakeInterface{
		&fakeSocketClient{fakeClient: client, data: opt.Socket},
		&fakeCgroupClient{fakeClient: client, data: opt.Cgroup},
		&fakePodCIDRClient{fakeClient: client, data: opt.PodCIDR},
		&fakeServiceCIDRClient{fakeClient: client, data: opt.ServiceCIDR},
		&fakeCertSansClient{fakeClient: client, data: []string{opt.CertSan, opt.CertDomain}},
		&fakeSingleTaintsClient{fakeClient: client},
		&fakeTaintsClient{fakeClient: client, data: opt.Taints},
		&fakeImageClient{fakeClient: client, data: opt.Images},
		&fakeEtcdClient{fakeClient: client, etcd: opt.Etcd},
	}}, nil
}

func (f *FakeClientGroup) Verify() error {
	for _, client := range f.clients {
		err := client.Verify()
		if err != nil {
			return err
		}
	}
	return nil
}

func (f *fakeClient) getFilePath(filename string) (string, error) {
	for _, f := range []string{
		fmt.Sprintf("/var/lib/sealos/data/%s/etc/%s", f.clusterName, filename),
		fmt.Sprintf("/root/.sealos/%s/etc/%s", f.clusterName, filename),
	} {
		if utils.IsFileExist(f) {
			return f, nil
		}
	}
	return "", errors.New("both init file does't exists")
}

func (f *fakeClient) loadInitConfig() error {
	logger.Info("verify default cluster info")
	initFile, err := f.getFilePath("kubeadm-init.yaml")
	if err != nil {
		return err
	}
	data, err := os.ReadFile(filepath.Clean(initFile))
	if err != nil {
		return err
	}
	yamls := utils.ToYalms(string(data))
	clusterConfigFn := func() ([]byte, error) {
		cfg, err := f.cmd.Exec("kubectl", "get", "cm", "-n", "kube-system", "kubeadm-config", "-o", "yaml")
		if err != nil {
			return nil, err
		}
		cm := &v1.ConfigMap{}
		_ = yaml.Unmarshal(cfg, cm)
		return []byte(cm.Data["ClusterConfiguration"]), nil
	}
	kubeproxyConfigFn := func() ([]byte, error) {
		cfg, err := f.cmd.Exec("kubectl", "get", "cm", "-n", "kube-system", "kube-proxy", "-o", "yaml")
		if err != nil {
			return nil, err
		}
		cm := &v1.ConfigMap{}
		_ = yaml.Unmarshal(cfg, cm)
		return []byte(cm.Data["config.conf"]), nil
	}
	kubeletConfigFn := func() ([]byte, error) {
		cfg, err := f.cmd.Exec("kubectl", "get", "cm", "-n", "kube-system", "kubelet-config", "-o", "yaml")
		if err != nil {
			return nil, err
		}
		cm := &v1.ConfigMap{}
		_ = yaml.Unmarshal(cfg, cm)
		return []byte(cm.Data["kubelet"]), nil
	}

	for _, yamlString := range yamls {
		obj, _ := utils.UnmarshalData([]byte(yamlString))
		kind, _, _ := unstructured.NestedString(obj, "kind")
		switch kind {
		case "InitConfiguration":
			_ = yaml.Unmarshal([]byte(yamlString), &f.InitConfiguration)
		}
	}
	kubeadmCfg, err := clusterConfigFn()
	if err != nil {
		return err
	}
	_ = yaml.Unmarshal(kubeadmCfg, &f.ClusterConfiguration)
	kubeProxyCfg, err := kubeproxyConfigFn()
	if err != nil {
		return err
	}
	_ = yaml.Unmarshal(kubeProxyCfg, &f.KubeProxyConfiguration)
	kubeletCfg, err := kubeletConfigFn()
	if err != nil {
		return err
	}
	_ = yaml.Unmarshal(kubeletCfg, &f.KubeletConfiguration)

	clusterConfig := fmt.Sprintf("/root/.sealos/%s/Clusterfile", f.clusterName)
	if !utils.IsFileExist(clusterConfig) {
		return fmt.Errorf("file %s not exist", clusterConfig)
	}
	return utils.UnmarshalYamlFile(clusterConfig, &f.Cluster)
}
