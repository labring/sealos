package runtime

type Interface interface {
	Init() error
	Reset() error
	ScaleUp(newMasterIPList []string, newNodeIPList []string) error
	ScaleDown(deleteMastersIPList []string, deleteNodesIPList []string) error
	SyncNodeIPVS(mastersIPList, nodeIPList []string) error
	Upgrade(version string) error
	GetConfig() ([]byte, error)
	UpdateCert(certs []string) error
}
