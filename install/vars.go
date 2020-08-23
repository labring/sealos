package install

import (
	"github.com/fanux/lvscare/care"
	"github.com/fanux/sealos/ipvs"
	"github.com/fanux/sealos/pkg/sshcmd/sshutil"
	"regexp"
	"strconv"
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
	CertPath     = "/root/.sealos/pki"
	CertEtcdPath = "/root/.sealos/pki/etcd"

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
	IPIP bool
	// mtu size
	MTU string

	YesRx = regexp.MustCompile("^(?i:y(?:es)?)$")

	CleanForce bool
	CleanAll   bool

	Vlog int

	// etcd backup
	InDocker         bool
	SnapshotName     string
	EtcdBackDir      string
	RestorePath      string
	EtcdSnapshotSave bool
	EtcdRestore      bool
	EtcdHealthCheck  bool

	// oss
	OssEndpoint         string
	AccessKeyId      string
	AccessKeySecrets string
	BucketName       string
	ObjectPath       string
)

func vlogToStr() string {
	str := strconv.Itoa(Vlog)
	return " -v " + str
}
