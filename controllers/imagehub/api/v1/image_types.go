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
	Name string `json:"name"`
	// todo inspect image and get time
	CTime metav1.Time `json:"creatTime"`
}

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

// ImageDetailInfo TODO: add limits for ImageDetailInfo
type ImageDetailInfo struct {
	URL         string   `json:"url,omitempty"`
	Keywords    []string `json:"keywords,omitempty"`
	Description string   `json:"description,omitempty"`
	Icon        string   `json:"icon,omitempty"`
	AuthorIcon  string   `json:"authorIcon,omitempty"`
	Docs        string   `json:"docs,omitempty"`
	ID          string   `json:"ID,omitempty"`
	Arch        string   `json:"arch,omitempty"`
	Rating      int      `json:"rating,omitempty"`
	Size        int64    `json:"size,omitempty"`
}

// ImageSpec defines the desired state of Image
type ImageSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	//+kubebuilder:validation:Required
	Name       ImageName       `json:"name,omitempty"`
	DetailInfo ImageDetailInfo `json:"detail,omitempty"`
	//
	User string `json:"user,omitempty"`
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

func (i *Image) checkLables() bool {
	return i.Labels[SealosOrgLable] == i.Spec.Name.GetOrg() &&
		i.Labels[SealosRepoLabel] == i.Spec.Name.GetRepo() &&
		i.Labels[SealosTagLabel] == i.Spec.Name.GetTag()
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
