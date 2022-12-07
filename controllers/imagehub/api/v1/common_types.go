package v1

const (
	Separator             = '.'
	StringLenLimit        = 1000
	SealosOrgLable        = "imagehub.sealos.io-org"
	SealosRepoLabel       = "imagehub.sealos.io-repo"
	SealosTagLabel        = "imagehub.sealos.io-tag"
	OrgFinalizerName      = "organization.hub.sealos.io/finalizer"
	RepoFinalizerName     = "repository.hub.sealos.io/finalizer"
	ImgFinalizerName      = "image.hub.sealos.io/finalizer"
	DataPackFinalizerName = "datapack.hub.sealos.io/finalizer"
)

type Codes int

const (
	NOTRUN  Codes = 0
	OK      Codes = 1
	PENDING Codes = 2
	ERROR   Codes = 3
)
