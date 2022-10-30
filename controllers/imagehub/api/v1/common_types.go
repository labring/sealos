package v1

const (
	Separator             = '.'
	StringLenLimit        = 1024
	HubSealosOrgLabel     = "hub.sealos.io-org"
	HubSealosRepoLabel    = "hub.sealos.io-repo"
	HubSealosTagLabel     = "hub.sealos.io-tag"
	DataPackFinalizerName = "datapack.hub.sealos.io/finalizer"
)

type Codes int

const (
	NOTRUN  Codes = 0
	OK      Codes = 1
	PENDING Codes = 2
	ERROR   Codes = 3
)
