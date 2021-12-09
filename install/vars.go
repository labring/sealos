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

	// workdir for install package home
	Workdir string
	// values for  install package values.yaml
	Values string
	// packageConfig for install package config
	PackageConfig string

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
)

func vlogToStr() string {
	str := strconv.Itoa(Vlog)
	return " -v " + str
}
