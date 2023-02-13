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

// data types
const (
	ImageBaseDataType   DataPackType = "base"
	ImageGridDataType   DataPackType = "grid"
	ImageDetailDataType DataPackType = "detail"
)

// Data defines all data needs to return
type Data struct {
	// base
	Name ImageName `json:"name,omitempty"`
	Type ImageType `json:"type,omitempty"`
	// grid
	RepoName      RepoName `json:"repoName,omitempty"`
	Rating        int      `json:"rating,omitempty"`
	DownloadCount int64    `json:"downloadCount,omitempty"`
	Icon          string   `json:"icon,omitempty"`
	Keywords      []string `json:"keywords,omitempty"`
	Size          int64    `json:"size,omitempty"`
	Description   string   `json:"description,omitempty"`
	// detail
	Tags TagList `json:"tags,omitempty"`
	Docs string  `json:"docs,omitempty"`
	ID   string  `json:"ID,omitempty"`
	Arch string  `json:"arch,omitempty"`
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
	Type ImageType `json:"type,omitempty"`
}

func (i *ImageBaseData) New(fd *FullData) {
	i.Name = fd.ImageInfo.Name
	i.Type = fd.ImageInfo.Type
}
func (i *ImageBaseData) ToData() Data {
	return Data{
		Name: i.Name,
		Type: i.Type,
	}
}

type ImageGridData struct {
	Name          ImageName `json:"name,omitempty"`
	Type          ImageType `json:"type,omitempty"`
	RepoName      RepoName  `json:"repoName,omitempty"`
	Rating        int       `json:"rating,omitempty"`
	DownloadCount int64     `json:"downloadCount,omitempty"`
	Icon          string    `json:"icon,omitempty"`
	Keywords      []string  `json:"keywords,omitempty"`
	Size          int64     `json:"size,omitempty"`
	Description   string    `json:"description,omitempty"`
}

func (i *ImageGridData) New(fd *FullData) {
	i.Name = fd.ImageInfo.Name
	i.Type = fd.ImageInfo.Type
	i.RepoName = fd.RepoInfo.Name
	i.DownloadCount = fd.RepoInfo.DownloadCount
	i.Icon = fd.ImageInfo.DetailInfo.Icon
	i.Keywords = fd.ImageInfo.DetailInfo.Keywords
	i.Size = fd.ImageInfo.DetailInfo.Size
	i.Description = fd.ImageInfo.DetailInfo.Description
}
func (i *ImageGridData) ToData() Data {
	return Data{
		Name:        i.Name,
		Type:        i.Type,
		RepoName:    i.RepoName,
		Icon:        i.Icon,
		Keywords:    i.Keywords,
		Rating:      i.Rating,
		Size:        i.Size,
		Description: i.Description,
	}
}

type ImageDetailData struct {
	Name          ImageName `json:"name,omitempty"`
	Type          ImageType `json:"type,omitempty"`
	RepoName      RepoName  `json:"repoName,omitempty"`
	Rating        int       `json:"rating,omitempty"`
	DownloadCount int64     `json:"downloadCount,omitempty"`
	Icon          string    `json:"icon,omitempty"`
	Keywords      []string  `json:"keywords,omitempty"`
	Description   string    `json:"description,omitempty"`
	Docs          string    `json:"docs,omitempty"`
	ID            string    `json:"ID,omitempty"`
	Size          int64     `json:"size,omitempty"`
	Arch          string    `json:"arch,omitempty"`
	Tags          TagList   `json:"tags,omitempty"`
}

func (i *ImageDetailData) New(fd *FullData) {
	i.Name = fd.ImageInfo.Name
	i.Type = fd.ImageInfo.Type

	i.RepoName = fd.RepoInfo.Name
	i.Icon = fd.ImageInfo.DetailInfo.Icon
	i.Keywords = fd.ImageInfo.DetailInfo.Keywords
	i.DownloadCount = fd.RepoInfo.DownloadCount

	i.ID = fd.ImageInfo.DetailInfo.ID
	i.Docs = fd.ImageInfo.DetailInfo.Docs
	i.Size = fd.ImageInfo.DetailInfo.Size
	i.Arch = fd.ImageInfo.DetailInfo.Arch
	i.Description = fd.ImageInfo.DetailInfo.Description
	i.Tags = fd.RepoInfo.Tags
}
func (i *ImageDetailData) ToData() Data {
	return Data{
		Name:          i.Name,
		Type:          i.Type,
		RepoName:      i.RepoName,
		DownloadCount: i.DownloadCount,
		Icon:          i.Icon,
		Keywords:      i.Keywords,
		Size:          i.Size,
		Rating:        i.Rating,
		ID:            i.ID,
		Docs:          i.Docs,
		Arch:          i.Arch,
		Description:   i.Description,
		Tags:          i.Tags,
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
	//+kubebuilder:default:="2h"
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
