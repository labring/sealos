// Copyright © 2022 sealos.
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

package buildah

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/containers/storage"
	"github.com/openconfig/gnmi/errlist"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"k8s.io/client-go/util/homedir"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/runtime/serializer/yaml"

	imagev1 "github.com/labring/sealos/controllers/imagehub/api/v1"
	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

type ImageCRBuilder struct {
	image    string
	registry string

	username   string
	userconfig string
	imageCR    *imagev1.Image

	containerID string
	mountPoint  string
	store       storage.Store
}

func (icb *ImageCRBuilder) Run() error {
	var pipe []func() error
	pipe = append(
		pipe,
		icb.CreateContainer,
		icb.CreatImageCR,
		icb.MutateImageCR,
		icb.ApplyImageCR,
		icb.DeleteContainer,
	)
	for _, f := range pipe {
		err := f()
		if err != nil {
			logger.Error(err)
			return err
		}
	}
	return nil
}

// CreateContainer create a container, return mountpoint and containerID
func (icb *ImageCRBuilder) CreateContainer() error {
	logger.Debug("Executing CreateContainer in ImageCRBuilder")
	// generate a random container name
	containerID := fmt.Sprintf("%s-%s", icb.image, strconv.Itoa(rand.New(rand.NewSource(time.Now().UnixNano())).Int()))
	realImpl, err := New("")
	if err != nil {
		return err
	}
	builderInfo, err := realImpl.Create(containerID, icb.image)
	if err != nil {
		return err
	}
	if isExist := file.IsExist(builderInfo.MountPoint); !isExist {
		return fmt.Errorf("mountPoint not Exist")
	}
	icb.containerID = containerID
	icb.mountPoint = builderInfo.MountPoint
	return nil
}

func (icb *ImageCRBuilder) CreatImageCR() error {
	logger.Debug("Executing CreatImageCR in ImageCRBuilder")
	if file.IsExist(filepath.Join(icb.mountPoint, ImageStdPath, ImageCRFile)) {
		logger.Debug("image cr file exist, read it and parse it")
		c, err := file.ReadAll(filepath.Join(icb.mountPoint, ImageStdPath, ImageCRFile))
		if err != nil {
			logger.Debug("read image cr file failed")
			return err
		}
		err = icb.ParseImageCR(c)
		if err != nil {
			logger.Debug("parse image cr file failed")
			return err
		}
	}
	//if app base config not find
	//image name which contains "/" and ":" couldn't be used in meta name
	mateName := strings.Replace(icb.GetClearImagename(), ":", ".", -1)
	mateName = strings.Replace(mateName, "/", ".", -1)
	// replace image cr spec and matename by image
	icb.imageCR.TypeMeta = metav1.TypeMeta{Kind: ImagehubKind, APIVersion: filepath.Join(ImagehubGroup, ImagehubVersion)}
	icb.imageCR.ObjectMeta.Name = mateName
	icb.imageCR.Spec.Name = imagev1.ImageName(icb.GetClearImagename())
	logger.Debug("CreatImageCR in ImageCRBuilder done")
	logger.Debug("ImageCRBuilder CreatImageCR result: ", icb.imageCR)
	return nil
}

func (icb *ImageCRBuilder) MutateImageCR() error {
	logger.Debug("Executing MutateImageCR in ImageCRBuilder")
	var errl errlist.List
	// Using a pipe helps with future file reading needs
	fileReadPipeLine := []func() error{
		//app config is the based file ,it should read first
		icb.GetInspectInfo,
		icb.GetReadmeDoc,
	}
	for _, f := range fileReadPipeLine {
		if err := f(); err != nil {
			errl.Add(err)
		}
	}
	logger.Debug(errl.Err())
	// Do not return error.
	logger.Debug("MutateImageCR in ImageCRBuilder done")
	logger.Debug("ImageCRBuilder MutateImageCR result: ", icb.imageCR)
	return nil
}

func (icb *ImageCRBuilder) ApplyImageCR() error {
	logger.Debug("Executing ApplyImageCR in ImageCRBuilder")
	client, err := kubernetes.NewKubernetesClient(filepath.Join(homedir.HomeDir(), SealosRootPath, icb.registry, icb.username, KubeConfigPath), "")
	if err != nil {
		return err
	}
	resource := client.KubernetesDynamic().Resource(schema.GroupVersionResource{
		Group:    ImagehubGroup,
		Version:  ImagehubVersion,
		Resource: ImagehubResource,
	})
	utd := unstructured.Unstructured{}
	obj, err := runtime.DefaultUnstructuredConverter.ToUnstructured(icb.imageCR)
	if err != nil {
		return err
	}
	utd.Object = obj
	if _, err = resource.Create(context.TODO(), &utd, metav1.CreateOptions{}); err != nil {
		if !apierrors.IsAlreadyExists(err) {
			return err
		}
		if utd.GetResourceVersion() == "" {
			var objGet *unstructured.Unstructured
			objGet, err = resource.Get(context.TODO(), utd.GetName(), metav1.GetOptions{})
			if err != nil {
				return err
			}
			utd.SetResourceVersion(objGet.GetResourceVersion())
		}
		if _, err = resource.Update(context.TODO(), &utd, metav1.UpdateOptions{}); err != nil {
			return err
		}
	}
	return nil
}

func (icb *ImageCRBuilder) DeleteContainer() error {
	logger.Debug("Executing DeleteContainer in ImageCRBuilder")
	realImpl, err := New("")
	if err != nil {
		return err
	}
	return realImpl.Delete(icb.containerID)
}

// ParseImageCR parse image cr yaml file ot an image cr obj
func (icb *ImageCRBuilder) ParseImageCR(c []byte) error {
	logger.Debug("Executing ParseImageCR in ImageCRBuilder")
	cr := imagev1.Image{}
	_, _, err := yaml.NewDecodingSerializer(unstructured.UnstructuredJSONScheme).Decode(c, nil, &cr)
	if err != nil {
		return fmt.Errorf("configParse err : %v", err)
	}
	cr.Spec.DetailInfo.Actions = make(map[string]imagev1.Action)
	icb.imageCR = &cr
	return nil
}

// GetReadmeDoc gen image cr detail info: readme
func (icb *ImageCRBuilder) GetReadmeDoc() error {
	logger.Debug("Executing GetReadmeDoc in ImageCRBuilder")
	if file.IsExist(filepath.Join(icb.mountPoint, DocsPath)) {
		c, err := file.ReadAll(filepath.Join(icb.mountPoint, DocsPath))
		if err != nil {
			return err
		}
		icb.imageCR.Spec.DetailInfo.Docs = string(c)
	}
	return nil
}

// GetInspectInfo gen image cr detail info: Id, Arch and Size
func (icb *ImageCRBuilder) GetInspectInfo() error {
	realImpl, err := New("")
	if err != nil {
		return err
	}
	containerInfo, err := realImpl.InspectContainer(icb.containerID)
	if err != nil {
		return err
	}
	var image v1.Image
	if err = json.Unmarshal([]byte(containerInfo.Config), &image); err != nil {
		return err
	}
	var manifest v1.Manifest
	if err = json.Unmarshal([]byte(containerInfo.Manifest), &manifest); err != nil {
		return err
	}

	sz, err := icb.store.ImageSize(containerInfo.FromImageID)
	if err != nil {
		return err
	}
	icb.imageCR.Spec.DetailInfo.ID = containerInfo.FromImageID
	icb.imageCR.Spec.DetailInfo.Arch = image.Architecture
	icb.imageCR.Spec.DetailInfo.Size = sz
	icb.imageCR.Spec.DetailInfo.CreateTime = metav1.Time{Time: *image.Created}
	return nil
}

// GetClearImagename replace 'hub.sealos.cn/org/repo:tag' to 'org/repo:tag'
func (icb *ImageCRBuilder) GetClearImagename() string {
	return strings.Replace(icb.image, icb.registry+"/", "", 1)
}
