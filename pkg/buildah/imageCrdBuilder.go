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
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/openconfig/gnmi/errlist"

	"github.com/containers/buildah"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"

	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/runtime/serializer/yaml"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"

	imagev1 "github.com/labring/sealos/controllers/imagehub/api/v1"
	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

const (
	AppPath          = "app"
	READMEpath       = "README.md"
	ConfigFileName   = "config.yaml"
	TemplateFileName = "template.yaml"
	CMDFileName      = "CMD"
	ImagehubGroup    = "imagehub.sealos.io"
	ImagehubVersion  = "v1"
	ImagehubResource = "images"
)

type ImageCRDBuilder struct {
	imagename   string
	clustername string
	AppConfig   *imagev1.Image
}

func NewAndRunImageCRDBuilder(args []string, iopts *pushOptions) {
	//run without error returns
	icb := &ImageCRDBuilder{args[0], "", &imagev1.Image{}}
	if iopts.imagecrd {
		icb.Run()
	}
}

func (icb *ImageCRDBuilder) Run() {
	MountPoint, err := icb.CreateContainer()
	if err != nil {
		// get err when create container ,abort all
		return
	}
	defer func() {
		err = icb.DeleteContainer()
		if err != nil {
			logger.Warn(err)
		}
	}()
	err = icb.GetAppContent(MountPoint)
	if err != nil {
		logger.Warn(err)
	}
	err = icb.AppContentApply()
	if err != nil {
		logger.Warn(err)
	}
}

func (icb *ImageCRDBuilder) CreateContainer() (string, error) {
	rnd := rand.New(rand.NewSource(time.Now().UnixNano()))
	clusterName := icb.imagename + strconv.Itoa(rnd.Int())

	realImpl, err := New("")
	if err != nil {
		return "", err
	}

	builderInfo, err := realImpl.Create(clusterName, icb.imagename)
	if err != nil {
		return "", err
	}
	if iseist := file.IsExist(builderInfo.MountPoint); !iseist {
		return "", fmt.Errorf("mountPoint not Exist")
	}
	icb.clustername = clusterName
	return builderInfo.MountPoint, nil
}

/*
Action path example:
	app/
	├── config.yaml
	├── action1
	│   ├── cmd
	│   └── template.yaml
	├── action2
	│	├── cmd
	│	└── template.yaml
    x
The template and cmd of the action are stored in the folder named after the action，config is used to configure the basic information of the image CRD.
*/

// GetAppContent do content read in filereadPipeline, if one content get failed ,it won't abort.
func (icb *ImageCRDBuilder) GetAppContent(MountPoint string) error {
	//app config is the based file ,it should read first
	if err := icb.ReadAppConfig(MountPoint); err != nil {
		return fmt.Errorf("base config cant find")
	}
	var errl errlist.List
	//Using a pipe helps with future file reading needs
	fileReadPipeLine := []func(MountPoint string) error{
		icb.ReadImageContent,
		icb.ReadReadme,
		icb.ReadActions,
	}
	for _, f := range fileReadPipeLine {
		if err := f(MountPoint); err != nil {
			errl.Add(err)
		}
	}
	return errl.Err()
}

func (icb *ImageCRDBuilder) AppContentApply() error {
	client, err := kubernetes.NewKubernetesClient("", "")
	if err != nil {
		return fmt.Errorf("new KubernetesClient err: %v", err)
	}
	dyclient := client.KubernetesDynamic().Resource(schema.GroupVersionResource{
		Group:    ImagehubGroup,
		Version:  ImagehubVersion,
		Resource: ImagehubResource,
	})
	utd := unstructured.Unstructured{}
	obj, err := runtime.DefaultUnstructuredConverter.ToUnstructured(icb.AppConfig)
	if err != nil {
		return fmt.Errorf("appconfig ToUnstructured err : %v", err)
	}
	utd.Object = obj
	if _, err = dyclient.Create(context.TODO(), &utd, metav1.CreateOptions{}); err != nil {
		if !apierrors.IsAlreadyExists(err) {
			return fmt.Errorf("image create err : %v", err)
		}
		if utd.GetResourceVersion() == "" {
			var objGET *unstructured.Unstructured
			objGET, err = dyclient.Get(context.TODO(), utd.GetName(), metav1.GetOptions{})
			if err != nil {
				return fmt.Errorf("unable to get obj: %v", err)
			}
			utd.SetResourceVersion(objGET.GetResourceVersion())
		}
		if _, err = dyclient.Update(context.TODO(), &utd, metav1.UpdateOptions{}); err != nil {
			return fmt.Errorf("image update err : %v", err)
		}
	}
	return nil
}

func (icb *ImageCRDBuilder) DeleteContainer() error {
	realImpl, err := New("")
	if err != nil {
		return fmt.Errorf("deleteContainer err : %v", err)
	}
	return realImpl.Delete(icb.imagename)
}

func (icb *ImageCRDBuilder) ReadAppConfig(MountPoint string) error {
	if file.IsExist(filepath.Join(MountPoint, AppPath, ConfigFileName)) {
		c, err := file.ReadAll(filepath.Join(MountPoint, AppPath, ConfigFileName))
		if err != nil {
			return fmt.Errorf("read config.yaml err: %v", err)
		}
		if err = icb.ConfigParse(c); err != nil {
			return fmt.Errorf("readAppConfig : %v", err)
		}
	}
	return nil
}

func (icb *ImageCRDBuilder) ConfigParse(c []byte) error {
	config := imagev1.Image{}
	_, _, err := yaml.NewDecodingSerializer(unstructured.UnstructuredJSONScheme).Decode(c, nil, &config)
	if err != nil {
		return fmt.Errorf("configParse err : %v", err)
	}
	config.Spec.DetailInfo.Actions = make(map[string]imagev1.Action)
	icb.AppConfig = &config
	return nil
}

func (icb *ImageCRDBuilder) ReadReadme(MountPoint string) error {
	if file.IsExist(filepath.Join(MountPoint, READMEpath)) {
		c, err := file.ReadAll(filepath.Join(MountPoint, READMEpath))
		if err != nil {
			return fmt.Errorf("read README.md err: %v", err)
		}
		icb.AppConfig.Spec.DetailInfo.Description = string(c)
	}
	return nil
}

func (icb *ImageCRDBuilder) ReadImageContent(MountPoint string) error {
	realImpl, err := New("")
	if err != nil {
		return fmt.Errorf("deleteContainer err : %v", err)
	}
	containerInfo, err := realImpl.InspectContainer(icb.imagename)
	if err != nil {
		return fmt.Errorf("readImageContent InspectImage err : %v", err)
	}
	var config v1.Image
	if err = json.Unmarshal([]byte(containerInfo.Config), &config); err != nil {
		return fmt.Errorf("get image config err : %v", err)
	}
	var manifest v1.Manifest
	if err = json.Unmarshal([]byte(containerInfo.Manifest), &manifest); err != nil {
		return fmt.Errorf("get image config err : %v", err)
	}
	icb.BindImageContent(containerInfo, config, manifest)
	return nil
}

func (icb *ImageCRDBuilder) BindImageContent(containerInfo buildah.BuilderInfo, config v1.Image, manifest v1.Manifest) {
	icb.AppConfig.Spec.DetailInfo.ID = containerInfo.FromImageID
	icb.AppConfig.Spec.DetailInfo.Arch = config.Architecture
	var size int64
	size = manifest.Config.Size * 1000
	for _, layer := range manifest.Layers {
		size += layer.Size
	}
	icb.AppConfig.Spec.DetailInfo.Size = size
}

// ReadActions read all action in /app dir
func (icb *ImageCRDBuilder) ReadActions(MountPoint string) error {
	if file.IsExist(filepath.Join(MountPoint, AppPath)) {
		fileEntrys, err := os.ReadDir(filepath.Join(MountPoint, AppPath))
		if err != nil {
			return fmt.Errorf("read actions in app dir err: %v ", err)
		}
		for _, f := range fileEntrys {
			if !f.IsDir() {
				continue
			}
			if _, isExist := icb.AppConfig.Spec.DetailInfo.Actions[f.Name()]; isExist {
				logger.Warn("action name repeat")
			}
			icb.AppConfig.Spec.DetailInfo.Actions[f.Name()], err = icb.ReadTemplateAndCmd(MountPoint, f.Name())
			if err != nil {
				return fmt.Errorf("read action : %v err: %v ", filepath.Join(MountPoint, AppPath, f.Name()), err)
			}
		}
	}
	return nil
}

// ReadTemplateAndCmd read template and cmd yaml file in target action dir
func (icb *ImageCRDBuilder) ReadTemplateAndCmd(MountPoint string, actionName string) (imagev1.Action, error) {
	actioncontent := imagev1.Action{
		Name:     actionName,
		Template: "",
		CMD:      "",
	}
	fileEntrys, err := os.ReadDir(filepath.Join(MountPoint, AppPath, actionName))
	if err != nil {
		return imagev1.Action{}, fmt.Errorf("read path: %v err: %v", filepath.Join(MountPoint, AppPath), err)
	}
	var byt []byte
	for _, f := range fileEntrys {
		if f.Name() == TemplateFileName {
			byt, _ = file.ReadAll(filepath.Join(MountPoint, AppPath, actionName, f.Name()))
			actioncontent.Template = string(byt)
		}
		if f.Name() == CMDFileName {
			byt, _ = file.ReadAll(filepath.Join(MountPoint, AppPath, actionName, f.Name()))
			actioncontent.CMD = string(byt)
		}
	}
	return actioncontent, nil
}
