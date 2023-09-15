// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
