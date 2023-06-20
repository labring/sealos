package v1

const (
	Separator       = '.'
	StringLenLimit  = 1000
	SealosOrgLable  = "organization.imagehub.sealos.io"
	SealosRepoLabel = "repository.imagehub.sealos.io"
	SealosTagLabel  = "tag.imagehub.sealos.io"

	OrgFinalizerName      = "organization.imagehub.sealos.io/finalizer"
	RepoFinalizerName     = "repository.imagehub.sealos.io/finalizer"
	ImgFinalizerName      = "image.imagehub.sealos.io/finalizer"
	DataPackFinalizerName = "datapack.hub.sealos.io/finalizer"

	KeywordsLabelPrefix = "keyword.imagehub.sealos.io/"
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
	kubeSystemNamespace      = "kube-system"
	defaultUserNamespace     = "user-system"
	defaultImagehubNamespace = "imagehub-system"
)

func GetSupportedKeywords() []string {
	return []string{"Kubernetes", "Storage", "Network", "Database", "Monitoring", "Logging", "Dashboard", "MQ", "Platform", "GPU", "GitOps"}
}

var supportedKeywordsMap = func() map[string]struct{} {
	ks := GetSupportedKeywords()
	mp := make(map[string]struct{})
	for _, k := range ks {
		mp[k] = struct{}{}
	}
	return mp
}()

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
