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
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

type DataPackType string

// datares types
const (
	ImageBaseDataType   DataPackType = "base"
	ImageGridDataType   DataPackType = "grid"
	ImageDetailDataType DataPackType = "detail"
)

// Data defines all data needs to return
type Data struct {
	// base
	Name ImageName `json:"name,omitempty"`
	// grid
	RepoName   RepoName `json:"repoName,omitempty"`
	Rating     int      `json:"rating,omitempty"`
	Icon       string   `json:"icon,omitempty"`
	AuthorIcon string   `json:"authorIcon,omitempty"`
	Keywords   []string `json:"keywords,omitempty"`
	// detail
	Tags        TagList `json:"tags,omitempty"`
	URL         string  `json:"URL,omitempty"`
	Description string  `json:"description,omitempty"`
	Docs        string  `json:"docs,omitempty"`
	ID          string  `json:"ID,omitempty"`
	Size        int64   `json:"size,omitempty"`
	Arch        string  `json:"arch,omitempty"`
}

// Datas in datapack status
type Datas map[ImageName]Data

// FullData will gen at reconcile beginning
type FullData struct {
	ImageInfo ImageInfo `json:"imageInfo,omitempty"`
	RepoInfo  RepoInfo  `json:"repoInfo,omitempty"`
	OrgInfo   OrgInfo   `json:"orgInfo,omitempty"`
	// todo add RatingInfo
}

type ImageBaseData struct {
	Name ImageName `json:"name,omitempty"`
}

func (i *ImageBaseData) New(fd *FullData) {
	i.Name = fd.ImageInfo.Name
}
func (i *ImageBaseData) ToData() Data {
	return Data{
		Name: i.Name,
	}
}

type ImageGridData struct {
	Name       ImageName `json:"name,omitempty"`
	RepoName   RepoName  `json:"repoName,omitempty"`
	Rating     int       `json:"rating,omitempty"`
	Icon       string    `json:"icon,omitempty"`
	AuthorIcon string    `json:"authorIcon,omitempty"`
	Keywords   []string  `json:"keywords,omitempty"`
}

func (i *ImageGridData) New(fd *FullData) {
	i.RepoName = fd.RepoInfo.Name
	i.Name = fd.ImageInfo.Name
	i.Icon = fd.ImageInfo.DetailInfo.Icon
	i.Keywords = fd.ImageInfo.DetailInfo.Keywords
	i.AuthorIcon = fd.ImageInfo.DetailInfo.AuthorIcon
	i.Rating = fd.ImageInfo.DetailInfo.Rating
}
func (i *ImageGridData) ToData() Data {
	return Data{
		RepoName:   i.RepoName,
		Name:       i.Name,
		Icon:       i.Icon,
		Keywords:   i.Keywords,
		AuthorIcon: i.AuthorIcon,
		Rating:     i.Rating,
	}
}

type ImageDetailData struct {
	Name        ImageName `json:"name,omitempty"`
	RepoName    RepoName  `json:"repoName,omitempty"`
	Rating      int       `json:"rating,omitempty"`
	Icon        string    `json:"icon,omitempty"`
	AuthorIcon  string    `json:"authorIcon,omitempty"`
	Keywords    []string  `json:"keywords,omitempty"`
	URL         string    `json:"URL,omitempty"`
	Description string    `json:"description,omitempty"`
	Docs        string    `json:"docs,omitempty"`
	ID          string    `json:"ID,omitempty"`
	Size        int64     `json:"size,omitempty"`
	Arch        string    `json:"arch,omitempty"`
	Tags        TagList   `json:"tags,omitempty"`
}

func (i *ImageDetailData) New(fd *FullData) {
	i.Name = fd.ImageInfo.Name

	i.RepoName = fd.RepoInfo.Name
	i.Icon = fd.ImageInfo.DetailInfo.Icon
	i.Keywords = fd.ImageInfo.DetailInfo.Keywords
	i.AuthorIcon = fd.ImageInfo.DetailInfo.AuthorIcon
	i.Rating = fd.ImageInfo.DetailInfo.Rating

	i.ID = fd.ImageInfo.DetailInfo.ID
	i.URL = fd.ImageInfo.DetailInfo.URL
	i.Docs = fd.ImageInfo.DetailInfo.Docs
	i.Size = fd.ImageInfo.DetailInfo.Size
	i.Arch = fd.ImageInfo.DetailInfo.Arch
	i.Description = fd.ImageInfo.DetailInfo.Description
	i.Tags = fd.RepoInfo.Tags
}
func (i *ImageDetailData) ToData() Data {
	return Data{
		RepoName:    i.RepoName,
		Name:        i.Name,
		Icon:        i.Icon,
		Keywords:    i.Keywords,
		AuthorIcon:  i.AuthorIcon,
		Rating:      i.Rating,
		ID:          i.ID,
		URL:         i.URL,
		Docs:        i.Docs,
		Size:        i.Size,
		Arch:        i.Arch,
		Description: i.Description,
		Tags:        i.Tags,
	}
}

// DataPackSpec defines the desired state of DataPack
type DataPackSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	//+kubebuilder:validation:Enum={ base, grid, detail, }
	//+kubebuilder:default=base
	Type  DataPackType `json:"type,omitempty"`
	Names []ImageName  `json:"names,omitempty"`
	//+kubebuilder:validation:Optional
	//+kubebuilder:default:="5m"
	ExpireTime string `json:"expireTime,omitempty"`
}

// DataPackStatus defines the observed state of DataPack
type DataPackStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
	Codes Codes `json:"codes"`
	Datas Datas `json:"datas,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Cluster,shortName=dp

// DataPack is the Schema for the datapacks API
type DataPack struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   DataPackSpec   `json:"spec,omitempty"`
	Status DataPackStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// DataPackList contains a list of DataPack
type DataPackList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []DataPack `json:"items"`
}

func init() {
	SchemeBuilder.Register(&DataPack{}, &DataPackList{})
}
