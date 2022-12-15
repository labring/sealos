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

const (
	saPrefix                 = "system:serviceaccount"
	mastersGroup             = "system:masters"
	defaultUserNamespace     = "user-system"
	defaultImagehubNamespace = "imagehub-system"
	defaultUserSaGroup       = "system:serviceaccounts:user-system"
	defaultImagehubSaGroup   = "system:serviceaccounts:imagehub-system"
)

//+kubebuilder:object:generate=false

type Checker interface {
	checkSpecName() bool
	checkLabels() bool
	getName() string
	getSpecName() string
	getOrgName() string
}

//+kubebuilder:object:generate=false

type OrgCombinator interface {
	GetOrg() string
}

//+kubebuilder:object:generate=false

type RepoCombinator interface {
	GetRepo() string
}

//+kubebuilder:object:generate=false

type TagCombinator interface {
	GetTag() string
}
