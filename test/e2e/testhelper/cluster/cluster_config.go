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

package cluster

import (
	"fmt"
	"os"
	"path/filepath"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/yaml"

	proxy "k8s.io/kube-proxy/config/v1alpha1"
	kubelet "k8s.io/kubelet/config/v1beta1"
	"k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/test/e2e/testhelper"
)

var _ Interface = &fakeClient{}

type Interface interface {
	Verify() error
}

type fakeClient struct {
	InitConfiguration      kubeadm.InitConfiguration
	ClusterConfiguration   kubeadm.ClusterConfiguration
	JoinConfiguration      kubeadm.JoinConfiguration
	KubeProxyConfiguration proxy.KubeProxyConfiguration
	KubeletConfiguration   kubelet.KubeletConfiguration
}

func NewFakeClient() Interface {
	return &fakeClient{}
}

func (c *fakeClient) Verify() error {
	logger.Info("verify default cluster info")
	initFile := "/root/.sealos/default/etc/kubeadm-init.yaml"
	if !testhelper.IsFileExist(initFile) {
		return fmt.Errorf("file %s not exist", initFile)
	}
	data, err := os.ReadFile(filepath.Clean(initFile))
	if err != nil {
		return err
	}
	yamls := testhelper.ToYalms(string(data))
	for _, yamlString := range yamls {
		obj, _ := testhelper.UnmarshalData([]byte(yamlString))
		kind, _, _ := unstructured.NestedString(obj, "kind")
		switch kind {
		case "InitConfiguration":
			_ = yaml.Unmarshal([]byte(yamlString), &c.InitConfiguration)
		case "ClusterConfiguration":
			_ = yaml.Unmarshal([]byte(yamlString), &c.ClusterConfiguration)
		case "JoinConfiguration":
			_ = yaml.Unmarshal([]byte(yamlString), &c.JoinConfiguration)
		case "KubeProxyConfiguration":
			_ = yaml.Unmarshal([]byte(yamlString), &c.KubeProxyConfiguration)
		case "KubeletConfiguration":
			_ = yaml.Unmarshal([]byte(yamlString), &c.KubeletConfiguration)
		}
	}
	if c.InitConfiguration.NodeRegistration.CRISocket != "/run/containerd/containerd.sock" {
		return fmt.Errorf("init config cri socket not match /run/containerd/containerd.sock")
	}
	if c.KubeletConfiguration.CgroupDriver != "systemd" {
		return fmt.Errorf("kubelet config cgroup driver not match systemd")
	}
	if c.ClusterConfiguration.Networking.ServiceSubnet != "10.96.0.0/22" {
		return fmt.Errorf("cluster config service subnet not match 100.64.0.0/10")
	}
	if c.ClusterConfiguration.Networking.PodSubnet != "100.64.0.0/10" {
		return fmt.Errorf("cluster config pod subnet not match 100.64.0.0/10")
	}
	return nil
}
