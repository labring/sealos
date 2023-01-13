/*
Copyright 2022.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package v1

import (
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

type TagData struct {
	Name     string      `json:"name"`
	MetaName string      `json:"metaName"`
	Size     int64       `json:"size"`
	CTime    metav1.Time `json:"creatTime"` // todo inspect image and get time
}

type ImageType string

const (
	CloudImageType   ImageType = "cloud-image"
	ClusterImageType ImageType = "cluster-image"
)

type ImageName string

// IsLegal check name is legal
// name.eg: labring/mysql:v8.0.31
func (n ImageName) IsLegal() bool {
	s := strings.Split(string(n), "/")
	if len(s) != 2 {
		return false
	}
	return len(strings.Split(s[1], ":")) == 2
}

func (n ImageName) GetOrg() string {
	str := strings.FieldsFunc(string(n), func(r rune) bool {
		return r == '/' || r == ':'
	})
	return str[0]
}

func (n ImageName) GetRepo() string {
	str := strings.FieldsFunc(string(n), func(r rune) bool {
		return r == '/' || r == ':'
	})
	return str[1]
}

func (n ImageName) GetTag() string {
	str := strings.FieldsFunc(string(n), func(r rune) bool {
		return r == '/' || r == ':'
	})
	return str[2]
}

func (n ImageName) ToOrgName() OrgName {
	str := strings.FieldsFunc(string(n), func(r rune) bool {
		return r == '/' || r == ':'
	})
	return OrgName(str[0])
}

func (n ImageName) ToRepoName() RepoName {
	str := strings.FieldsFunc(string(n), func(r rune) bool {
		return r == '/' || r == ':'
	})
	return RepoName(str[0] + "/" + str[1])
}

func (n ImageName) ToMetaName() string {
	return n.GetOrg() + "." + n.GetRepo() + "." + n.GetTag()
}

// GetMateName TODO: change name to matename in a right way
// libring/mysql:v8.0.3 -> libring.mysql.v8.0.3
func (n ImageName) GetMateName() string {
	return strings.ReplaceAll(strings.ReplaceAll(string(n), "/", "."), ":", ".")
}

type Action struct {
	// TODO: support more action types ,now just support yaml.
	Name       string `json:"name,omitempty"`
	ActionType string `json:"actionType,omitempty"`
	Template   string `json:"actions,omitempty"`
	CMD        string `json:"cmd,omitempty"`
}

// ImageDetailInfo TODO: add limits for ImageDetailInfo
type ImageDetailInfo struct {
	Keywords    []string `json:"keywords,omitempty"`
	Description string   `json:"description,omitempty"`
	Icon        string   `json:"icon,omitempty"`
	Docs        string   `json:"docs,omitempty"`
	// URL sealos cloud ui endpoint
	URL string `json:"url,omitempty"`
	// ID Arch Size should use buildah inspect to get infor.
	ID   string `json:"ID,omitempty"`
	Arch string `json:"arch,omitempty"`
	Size int64  `json:"size,omitempty"`
	// Actions todo
	Actions map[string]Action `json:"actions,omitempty"`
}

// ImageSpec defines the desired state of Image
type ImageSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	//+kubebuilder:validation:Required
	Name       ImageName       `json:"name,omitempty"`
	Type       ImageType       `json:"type,omitempty"`
	DetailInfo ImageDetailInfo `json:"detail,omitempty"`
}

type ImageInfo ImageSpec

// ImageStatus defines the observed state of Image
type ImageStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Cluster,shortName=img

// Image is the Schema for the images API
type Image struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ImageSpec   `json:"spec,omitempty"`
	Status ImageStatus `json:"status,omitempty"`
}

func (i *Image) checkSpecName() bool {
	return i.Spec.Name.IsLegal()
}
func (i *Image) checkLabels() bool {
	return i.Labels[SealosOrgLable] == i.Spec.Name.GetOrg() &&
		i.Labels[SealosRepoLabel] == i.Spec.Name.GetRepo() &&
		i.Labels[SealosTagLabel] == i.Spec.Name.GetTag()
}
func (i *Image) getSpecName() string {
	return string(i.Spec.Name)
}
func (i *Image) getOrgName() string {
	return i.Spec.Name.GetOrg()
}
func (i *Image) getName() string {
	return i.Name
}

func (i *Image) MulateFromOldobj(old *Image) {
	if i.Spec.DetailInfo.Docs == "" {
		i.Spec.DetailInfo.Docs = old.Spec.DetailInfo.Docs
	}
	if i.Spec.DetailInfo.Icon == "" {
		i.Spec.DetailInfo.Icon = old.Spec.DetailInfo.Icon
	}
	if i.Spec.DetailInfo.Description == "" {
		i.Spec.DetailInfo.Description = old.Spec.DetailInfo.Description
	}
	if len(i.Spec.DetailInfo.Keywords) == 0 {
		i.Spec.DetailInfo.Keywords = old.Spec.DetailInfo.Keywords
	}
}

//+kubebuilder:object:root=true

// ImageList contains a list of Image
type ImageList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Image `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Image{}, &ImageList{})
}
