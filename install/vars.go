package install

import (
	"regexp"
	"strconv"

	"github.com/fanux/lvscare/care"

	"github.com/fanux/sealos/cert"
	"github.com/fanux/sealos/ipvs"
	"github.com/fanux/sealos/pkg/sshcmd/sshutil"
)

var (
	MasterIPs []string
	NodeIPs   []string
	CertSANS  []string
	//config from kubeadm.cfg
	DnsDomain         string
	ApiServerCertSANs []string
	//
	SSHConfig sshutil.SSH
	ApiServer string
	//cert abs path
	CertPath     = cert.SealosConfigDir + "/pki"
	CertEtcdPath = cert.SealosConfigDir + "/pki/etcd"
	EtcdCacart   = cert.SealosConfigDir + "/pki/etcd/ca.crt"
	EtcdCert     = cert.SealosConfigDir + "/pki/etcd/healthcheck-client.crt"
	EtcdKey      = cert.SealosConfigDir + "/pki/etcd/healthcheck-client.key"

	//criSocket
	CriSocket    string
	CgroupDriver string
	KubeadmApi   string
	BootstrapApi string

	VIP     string
	PkgUrl  string
	Version string
	Repo    string
	PodCIDR string
	SvcCIDR string

	Envs          []string // read env from -e
	PackageConfig string   // install/delete package config
	Values        string   // values for  install package values.yaml
	WorkDir       string   // workdir for install/delete package home

	//
	Ipvs         care.LvsCare
	LvscareImage ipvs.LvscareImage
	KubeadmFile  string
	// network type, calico or flannel etc..
	Network string
	// if true don't install cni plugin
	WithoutCNI bool
	//network interface name, like "eth.*|en.*"
	Interface string
	// the ipip mode of the calico
	BGP bool
	// mtu size
	MTU string

	YesRx = regexp.MustCompile("^(?i:y(?:es)?)$")

	CleanForce bool
	CleanAll   bool

	Vlog int

	// etcd backup
	InDocker     bool
	SnapshotName string
	EtcdBackDir  string
	RestorePath  string

	// oss
	OssEndpoint      string
	AccessKeyId      string
	AccessKeySecrets string
	BucketName       string
	ObjectPath       string
)

func vlogToStr() string {
	str := strconv.Itoa(Vlog)
	return " -v " + str
}

type metadata struct {
	K8sVersion string `json:"k8sVersion"`
	CniVersion string `json:"cniVersion"`
	CniName    string `json:"cniName"`
}
