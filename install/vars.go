package install

var (
	MasterIPs     []string
	NodeIPs       []string
	VIP            string
	PkgUrl         string
	User           string
	Passwd         string
	PrivateKeyFile string
	KubeadmFile    string
	Version        string
	Kustomize      bool
	ApiServer      string
	Repo           string
	PodCIDR        string
	SvcCIDR        string
	// network type, calico or flannel etc..
	Network string
	// if true don't install cni plugin
	WithoutCNI bool
	//network interface name, like "eth.*|en.*"
	Interface string
)
