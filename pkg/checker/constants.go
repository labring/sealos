/*
Copyright 2022 cuisongliu@qq.com.

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

package checker

const (
	Nil = "<nil>"

	// ControlPlaneNumCPU is the number of CPUs required on control-plane
	ControlPlaneNumCPU = 2

	// ControlPlaneMem is the number of megabytes of memory required on the control-plane
	// Below that amount of RAM running a stable control plane would be difficult.
	ControlPlaneMem = 1700

	// KubeletPort is the default port for the kubelet server on each host machine.
	// May be overridden by a flag at startup.
	KubeletPort = 10250

	// KubeSchedulerPort is the default port for the scheduler status server.
	// May be overridden by a flag at startup.
	KubeSchedulerPort = 10259

	// KubeControllerManagerPort is the default port for the controller manager status server.
	// May be overridden by a flag at startup.
	KubeControllerManagerPort = 10257

	// KubeAPIServerPort is the default port for the Api Server status server.
	// May be overridden by a flag at startup.
	KubeAPIServerPort = 6443

	// EtcdListenClientPort defines the port etcd listen on for client traffic
	EtcdListenClientPort = 2379

	// EtcdMetricsPort is the port at which to obtain etcd metrics and health status
	EtcdMetricsPort = 2381

	// StoragePath is the default path for the cri registry .
	StoragePath = "/var/lib/registry"

	// DockerSock is the default path for the docker sock .
	DockerSock = "/var/run/docker.sock"

	// CrioSock is the default path for the Crio sock .
	CrioSock = "/var/run/crio/crio.sock"

	// Etcd defines variable used internally when referring to etcd component.
	Etcd = "etcd"

	// KubeAPIServer defines variable used internally when referring to kube-apiserver component.
	KubeAPIServer = "kube-apiserver"

	// KubeControllerManager defines variable used internally when referring to kube-controller-manager component.
	KubeControllerManager = "kube-controller-manager"

	// KubeScheduler defines variable used internally when referring to kube-scheduler component.
	KubeScheduler = "kube-scheduler"

	// KubernetesDir is the directory Kubernetes owns for storing various configuration files.
	KubernetesDir = "/etc/kubernetes"

	// ManifestsSubDirName defines directory name to store manifests.
	ManifestsSubDirName = "manifests"

	// SystemctlServiceActive defines Systemctl return when service is active.
	SystemctlServiceActive = "active"

	// KubeletKubeConfigFileName defines the file name for the kubeconfig that the control-plane kubelet will use for talking
	// to the API server
	KubeletKubeConfigFileName = "kubelet.conf"

	// KubeletBootstrapKubeConfigFileName defines the file name for the kubeconfig that the kubelet will use to do
	// the TLS bootstrap to get itself an unique credential
	KubeletBootstrapKubeConfigFileName = "bootstrap-kubelet.conf"

	// SystemctlServiceInactive defines Systemctl return when service is not active.
	SystemctlServiceInactive = "inactive"

	// SystemctlServiceEnabled defines Systemctl return when service is enabled.
	SystemctlServiceEnabled = "enabled"

	//Bridgnf related bridgenf and forwarding checks for ipv4
	Bridgenf = "/proc/sys/net/bridge/bridge-nf-call-iptables"

	//Bridgenf related bridgenf and forwarding checks for ipv6
	Bridgenf6 = "/proc/sys/net/bridge/bridge-nf-call-ip6tables"

	//Ipv4Forward related bridgenf and forwarding checks for ipv4
	Ipv4Forward = "/proc/sys/net/ipv4/ip_forward"

	//Ipv6Forward related bridgenf and forwarding checks for ipv6
	Ipv6DefaultForwarding = "/proc/sys/net/ipv6/conf/default/forwarding"

	FirewalldSvcName = "firewalld.service"
)
