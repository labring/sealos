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

package e2e

import (
	"fmt"

	"github.com/labring/sealos/test/e2e/testhelper/config"
	"github.com/labring/sealos/test/e2e/testhelper/etcd"

	"github.com/labring/sealos/test/e2e/suites/image"

	. "github.com/onsi/ginkgo/v2"

	"github.com/labring/sealos/test/e2e/suites/cluster"

	"github.com/labring/sealos/test/e2e/suites/run"
	"github.com/labring/sealos/test/e2e/testhelper"
)

var _ = Describe("E2E_sealos_apply_test", func() {
	var (
		fakeRunInterface     run.Interface
		err                  error
		fakeClusterInterface cluster.Interface
		fakeImageInterface   image.FakeImageInterface
	)
	fakeRunInterface = run.NewFakeSingleClient()
	fakeImageInterface = image.NewFakeImage()
	Context("sealos apply suit", func() {
		AfterEach(func() {
			err = fakeRunInterface.Reset()
			testhelper.CheckErr(err, fmt.Sprintf("failed to reset cluster for earch cluster: %v", err))
		})
		It("sealos apply single by containerd", func() {

			By("generate Clusterfile")
			clusterfileConfig := config.Clusterfile{
				BinData:  "testdata/containerd-svc-sans.yaml",
				Replaces: map[string]string{"127.0.0.1": testhelper.GetLocalIpv4()},
			}
			applyfile, err := clusterfileConfig.Write()
			testhelper.CheckErr(err, fmt.Sprintf("failed to write file %s: %v", applyfile, err))

			By("running kubernete image using apply")
			err = fakeRunInterface.Apply(applyfile)
			testhelper.CheckErr(err, fmt.Sprintf("failed to apply new cluster for single: %v", err))
			opts := &cluster.FakeOpts{
				Socket:      "",
				Cgroup:      "",
				PodCIDR:     "",
				ServiceCIDR: "100.55.0.0/16",
				CertSan:     "192.168.72.100",
				Images:      clusterfileConfig.Cluster.Spec.Image,
			}
			fakeClusterInterface, err = cluster.NewFakeGroupClient("default", opts)
			testhelper.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
			err = fakeClusterInterface.Verify()
			testhelper.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))
		})
		It("sealos apply single by docker", func() {

			By("generate Clusterfile")
			clusterfileConfig := config.Clusterfile{
				BinData:  "testdata/docker-svc-sans.yaml",
				Replaces: map[string]string{"127.0.0.1": testhelper.GetLocalIpv4()},
			}
			applyfile, err := clusterfileConfig.Write()
			testhelper.CheckErr(err, fmt.Sprintf("failed to write file %s: %v", applyfile, err))

			By("running kubernete image using apply")
			err = fakeRunInterface.Apply(applyfile)
			testhelper.CheckErr(err, fmt.Sprintf("failed to apply new cluster for single: %v", err))
			opts := &cluster.FakeOpts{
				Socket:      "/var/run/cri-dockerd.sock",
				Cgroup:      "",
				PodCIDR:     "",
				ServiceCIDR: "100.55.0.0/16",
				CertSan:     "192.168.72.100",
				Images:      clusterfileConfig.Cluster.Spec.Image,
			}
			fakeClusterInterface, err = cluster.NewFakeGroupClient("default", opts)
			testhelper.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
			err = fakeClusterInterface.Verify()
			testhelper.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))
		})
		It("sealos apply single by containerd-buildimage", func() {

			By("build image from dockerfile")
			kubeadm := `
apiVersion: kubeadm.k8s.io/v1beta2
kind: ClusterConfiguration
networking:
  serviceSubnet: "100.55.0.0/16"
  podSubnet: "10.160.0.0/12"
`
			dFile := config.Dockerfile{
				KubeadmYaml: kubeadm,
				BaseImage:   "labring/kubernetes:v1.25.0",
			}
			var tmpdir string
			tmpdir, err = dFile.Write()
			testhelper.CheckErr(err, fmt.Sprintf("failed to create dockerfile: %v", err))
			err = fakeImageInterface.BuildImage("apply-hack-containerd:kubeadm-network", tmpdir, image.BuildOptions{
				Compress:     false,
				MaxPullProcs: 5,
				SaveImage:    true,
			})
			testhelper.CheckErr(err, fmt.Sprintf("failed to build image: %v", err))

			By("generate Clusterfile")
			clusterfileConfig := config.Clusterfile{
				BinData:  "testdata/custome-containerd-svc.yaml",
				Replaces: map[string]string{"127.0.0.1": testhelper.GetLocalIpv4(), "labring/kubernetes:v1.25.0": "apply-hack-containerd:kubeadm-network"},
			}
			applyfile, err := clusterfileConfig.Write()
			testhelper.CheckErr(err, fmt.Sprintf("failed to write file %s: %v", applyfile, err))
			By("apply kubernete image using build image")
			err = fakeRunInterface.Apply(applyfile)
			testhelper.CheckErr(err, fmt.Sprintf("failed to apply new cluster for single: %v", err))
			opts := &cluster.FakeOpts{
				Socket:      "",
				Cgroup:      "",
				PodCIDR:     "10.160.0.0/12",
				ServiceCIDR: "100.56.0.0/16",
				Images:      clusterfileConfig.Cluster.Spec.Image,
			}
			fakeClusterInterface, err = cluster.NewFakeGroupClient("default", opts)
			testhelper.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
			err = fakeClusterInterface.Verify()
			testhelper.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))
		})
		It("sealos apply single by docker-buildimage", func() {

			By("build image from dockerfile")
			kubeadm := `
apiVersion: kubeadm.k8s.io/v1beta2
kind: ClusterConfiguration
networking:
  serviceSubnet: "100.55.0.0/16"
  podSubnet: "10.160.0.0/12"
`
			dFile := config.Dockerfile{
				KubeadmYaml: kubeadm,
				BaseImage:   "labring/kubernetes-docker:v1.25.0",
			}
			var tmpdir string
			tmpdir, err = dFile.Write()
			testhelper.CheckErr(err, fmt.Sprintf("failed to create dockerfile: %v", err))
			err = fakeImageInterface.BuildImage("apply-hack-docker:kubeadm-network", tmpdir, image.BuildOptions{
				Compress:     false,
				MaxPullProcs: 5,
				SaveImage:    true,
			})
			testhelper.CheckErr(err, fmt.Sprintf("failed to build image: %v", err))
			By("generate Clusterfile")
			clusterfileConfig := config.Clusterfile{
				BinData:  "testdata/custome-docker-svc.yaml",
				Replaces: map[string]string{"127.0.0.1": testhelper.GetLocalIpv4(), "labring/kubernetes-docker:v1.25.0": "apply-hack-docker:kubeadm-network"},
			}
			applyfile, err := clusterfileConfig.Write()
			testhelper.CheckErr(err, fmt.Sprintf("failed to write file %s: %v", applyfile, err))

			By("apply kubernete image using build image")
			err = fakeRunInterface.Apply(applyfile)
			testhelper.CheckErr(err, fmt.Sprintf("failed to apply new cluster for single: %v", err))
			opts := &cluster.FakeOpts{
				Socket:      "/var/run/cri-dockerd.sock",
				Cgroup:      "",
				PodCIDR:     "10.160.0.0/12",
				ServiceCIDR: "100.56.0.0/16",
				Images:      clusterfileConfig.Cluster.Spec.Image,
			}
			fakeClusterInterface, err = cluster.NewFakeGroupClient("default", opts)
			testhelper.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
			err = fakeClusterInterface.Verify()
			testhelper.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))
		})
		It("sealos apply single by containerd add Taints ", func() {
			By("generate Clusterfile")
			clusterfileConfig := config.Clusterfile{
				BinData:  "testdata/containerd-svc-taints.yaml",
				Replaces: map[string]string{"127.0.0.1": testhelper.GetLocalIpv4()},
			}
			applyfile, err := clusterfileConfig.Write()
			testhelper.CheckErr(err, fmt.Sprintf("failed to write file %s: %v", applyfile, err))

			By("using clusterfile to apply kubernetes image add taints")
			err = fakeRunInterface.Apply(applyfile)
			testhelper.CheckErr(err, fmt.Sprintf("failed to apply new cluster for single: %v", err))
			opts := &cluster.FakeOpts{
				Socket:      "",
				Cgroup:      "",
				PodCIDR:     "",
				ServiceCIDR: "100.56.0.0/16",
				Images:      clusterfileConfig.Cluster.Spec.Image,
				Taints:      map[string]string{"kubeadmNode": "theValue"},
			}
			fakeClusterInterface, err = cluster.NewFakeGroupClient("default", opts)
			testhelper.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
			err = fakeClusterInterface.Verify()
			testhelper.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))
		})
		It("sealos apply single by containerd add external-etcd ", func() {
			By("using clusterfile to apply kubernetes image install external-etcd")
			etcdInstaller := etcd.NewEtcd()
			err = etcdInstaller.Install()
			testhelper.CheckErr(err, fmt.Sprintf("failed to install etcd: %v", err))
			By("generate Clusterfile")
			clusterfileConfig := config.Clusterfile{
				BinData:  "testdata/containerd-svc-etcd.yaml",
				Replaces: map[string]string{"127.0.0.1": testhelper.GetLocalIpv4()},
			}
			applyfile, err := clusterfileConfig.Write()
			testhelper.CheckErr(err, fmt.Sprintf("failed to write file %s: %v", applyfile, err))

			By("using clusterfile to apply kubernetes image add external-etcd")
			err = fakeRunInterface.Apply(applyfile)
			testhelper.CheckErr(err, fmt.Sprintf("failed to apply new cluster for single: %v", err))
			opts := &cluster.FakeOpts{
				Socket:      "",
				Cgroup:      "",
				PodCIDR:     "",
				ServiceCIDR: "100.56.0.0/16",
				Images:      clusterfileConfig.Cluster.Spec.Image,
				Etcd:        []string{fmt.Sprintf("http://%s:2379", testhelper.GetLocalIpv4())},
			}
			fakeClusterInterface, err = cluster.NewFakeGroupClient("default", opts)
			testhelper.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
			err = fakeClusterInterface.Verify()
			testhelper.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))
		})
	})

})
