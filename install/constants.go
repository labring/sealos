package install

const (
	ErrorExitOSCase = -1 // 错误直接退出类型

	ErrorMasterEmpty    = "your master is empty."                 // master节点ip为空
	ErrorVersionEmpty   = "your kubernetes version is empty."     // kubernetes 版本号为空
	ErrorFileNotExist   = "your package file is not exist."       // 离线安装包为空
	ErrorPkgUrlNotExist = "Your package url is incorrect."        // 离线安装包为http路径不对
	ErrorPkgUrlSize     = "Download file size is less then 200M " // 离线安装包为http路径不对
	//ErrorMessageSSHConfigEmpty = "your ssh password or private-key is empty."		// ssh 密码/秘钥为空
	// ErrorMessageCommon											// 其他错误消息

	// MinDownloadFileSize int64 = 400 * 1024 * 1024

	// etcd backup
	ETCDSNAPSHOTDEFAULTNAME = "snapshot"
	ETCDDEFAULTBACKUPDIR    = "/opt/sealos/ectd-backup"
	ETCDDEFAULTRESTOREDIR   = "/opt/sealos/ectd-restore"
	ETCDDATADIR             = "/var/lib/etcd"
	EtcdCacart              = "/root/.sealos/pki/etcd/ca.crt"
	EtcdCert                = "/root/.sealos/pki/etcd/healthcheck-client.crt"
	EtcdKey                 = "/root/.sealos/pki/etcd/healthcheck-client.key"
	TMPDIR                  = "/tmp"

	// kube file
	KUBECONTROLLERCONFIGFILE = "/etc/kubernetes/controller-manager.conf"
	KUBESCHEDULERCONFIGFILE  = "/etc/kubernetes/scheduler.conf"

	// init.sh
	InitBashShellString = `#!/bin/bash
# Install docker
chmod a+x docker.sh
#./docker.sh  /var/docker/lib  127.0.0.1
sh docker.sh
# Open ipvs
modprobe -- ip_vs
modprobe -- ip_vs_rr
modprobe -- ip_vs_wrr
modprobe -- ip_vs_sh

## version_ge 4.19 4.19 true ;
## version_ge 5.4 4.19 true ;
## version_ge 3.10 4.19 false ;

version_ge(){
    test "$(echo "$@" | tr ' ' '\n' | sort -rV | head -n 1)" == "$1"
}

disable_selinux(){
    if [ -s /etc/selinux/config ] && grep 'SELINUX=enforcing' /etc/selinux/config; then
        sed -i 's/SELINUX=enforcing/SELINUX=disabled/g' /etc/selinux/config
        setenforce 0
    fi
}

get_distribution() {
	lsb_dist=""
	# Every system that we officially support has /etc/os-release
	if [ -r /etc/os-release ]; then
		lsb_dist="$(. /etc/os-release && echo "$ID")"
	fi
	# Returning an empty string here should be alright since the
	# case statements don't act unless you provide an actual value
	echo "$lsb_dist"
}

disable_firewalld() {
  lsb_dist=$( get_distribution )
	lsb_dist="$(echo "$lsb_dist" | tr '[:upper:]' '[:lower:]')"
	case "$lsb_dist" in
		ubuntu|deepin|debian)
			command -v ufw &> /dev/null && ufw disable
		;;
		centos|rhel)
			systemctl stop firewalld && systemctl disable firewalld
		;;
		*)
			echo "current system not support"
		;;
	esac
}

kernel_version=$(uname -r | cut -d- -f1)
if version_ge "${kernel_version}" 4.19; then
  modprobe -- nf_conntrack
else
  modprobe -- nf_conntrack_ipv4
fi

cat <<EOF >  /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
EOF
sysctl --system
sysctl -w net.ipv4.ip_forward=1
disable_firewalld
swapoff -a || true
disable_selinux


# Cgroup driver
cp ../conf/kubelet.service /etc/systemd/system/
[ -d /etc/systemd/system/kubelet.service.d ] || mkdir /etc/systemd/system/kubelet.service.d
cp ../conf/10-kubeadm.conf /etc/systemd/system/kubelet.service.d/

cgroupDriver=$(docker info|grep Cg)
driver=${cgroupDriver##*: }
echo "driver is ${driver}"

[ -d /var/lib/kubelet ] || mkdir -p /var/lib/kubelet/

cat <<EOF > /var/lib/kubelet/config.yaml
address: 0.0.0.0
apiVersion: kubelet.config.k8s.io/v1beta1
authentication:
  anonymous:
    enabled: false
  webhook:
    cacheTTL: 2m0s
    enabled: true
  x509:
    clientCAFile: /etc/kubernetes/pki/ca.crt
authorization:
  mode: Webhook
  webhook:
    cacheAuthorizedTTL: 5m0s
    cacheUnauthorizedTTL: 30s
cgroupDriver: ${driver}
cgroupsPerQOS: true
clusterDNS:
- 10.96.0.10
clusterDomain: cluster.local
configMapAndSecretChangeDetectionStrategy: Watch
containerLogMaxFiles: 5
containerLogMaxSize: 10Mi
contentType: application/vnd.kubernetes.protobuf
cpuCFSQuota: true
cpuCFSQuotaPeriod: 100ms
cpuManagerPolicy: none
cpuManagerReconcilePeriod: 10s
enableControllerAttachDetach: true
enableDebuggingHandlers: true
enforceNodeAllocatable:
- pods
eventBurst: 10
eventRecordQPS: 5
evictionHard:
  imagefs.available: 15%
  memory.available: 100Mi
  nodefs.available: 10%
  nodefs.inodesFree: 5%
evictionPressureTransitionPeriod: 5m0s
failSwapOn: true
fileCheckFrequency: 20s
hairpinMode: promiscuous-bridge
healthzBindAddress: 127.0.0.1
healthzPort: 10248
httpCheckFrequency: 20s
imageGCHighThresholdPercent: 85
imageGCLowThresholdPercent: 80
imageMinimumGCAge: 2m0s
iptablesDropBit: 15
iptablesMasqueradeBit: 14
kind: KubeletConfiguration
kubeAPIBurst: 10
kubeAPIQPS: 5
makeIPTablesUtilChains: true
maxOpenFiles: 1000000
maxPods: 110
nodeLeaseDurationSeconds: 40
nodeStatusUpdateFrequency: 10s
oomScoreAdj: -999
podPidsLimit: -1
port: 10250
registryBurst: 10
registryPullQPS: 5
resolvConf: /etc/resolv.conf
rotateCertificates: true
runtimeRequestTimeout: 2m0s
serializeImagePulls: true
staticPodPath: /etc/kubernetes/manifests
streamingConnectionIdleTimeout: 4h0m0s
syncFrequency: 1m0s
volumeStatsAggPeriod: 1m0s
EOF

systemctl enable kubelet
`
)
