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

	"github.com/containers/image/v5/pkg/docker/config"

	"k8s.io/client-go/util/homedir"

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
	SealosPath       = ".sealos"
	ImagehubGroup    = "imagehub.sealos.io"
	ImagehubVersion  = "v1"
	ImagehubResource = "images"
	ImagehubKind     = "Image"
)

const (
	//Read Content Output
	ReadOrBuildAppConfigOutput = "Success get appConfig"
	ReadImageContentOutput     = "Success read image content"
	ReadReadmeOutput           = "Success read readme file"
)

type ImageCRDBuilder struct {
	imagename      string
	repositoryname string
	clustername    string
	username       string
	userconfig     string
	AppConfig      *imagev1.Image
}

func NewAndRunImageCRDBuilder(args []string) {
	var dest string
	switch len(args) {
	case 1:
		dest = args[0]
	case 2:
		dest = args[1]
	default:
		return
	}
	repositoryname, err := parseRawURL(dest)
	if err != nil {
		return
	}
	//run without error returns
	icb := &ImageCRDBuilder{dest, repositoryname, "", "", "", &imagev1.Image{}}
	if icb.CheckLoginStatus() {
		fmt.Println("start ImageCrd Push")
		icb.Run()
	}
}

func (icb *ImageCRDBuilder) CheckLoginStatus() bool {
	//Check Cri Login
	creds, err := config.GetAllCredentials(nil)
	if err != nil {
		return false
	}
	if _, ok := creds[icb.repositoryname]; ok {
		icb.username = creds[icb.repositoryname].Username
		icb.userconfig = creds[icb.repositoryname].Password
	} else {
		return false
	}
	return file.IsExist(filepath.Join(homedir.HomeDir(), SealosPath, icb.repositoryname)) &&
		file.IsExist(filepath.Join(homedir.HomeDir(), SealosPath, icb.repositoryname, icb.username))
}

func (icb *ImageCRDBuilder) Run() {
	MountPoint, err := icb.CreateContainer()
	if err != nil {
		// get err when create container ,abort all
		return
	}
	defer func() {
		err = icb.DeleteContainer()
		logger.Debug(err)
	}()
	err = icb.GetAppContent(MountPoint)
	if err != nil {
		logger.Debug(err)
	}
	err = icb.AppContentApply()
	if err != nil {
		logger.Debug(err)
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
	fmt.Println("Success create container")
	return builderInfo.MountPoint, nil
}

// GetAppContent do content read in filereadPipeline, if one content get failed ,it won't abort.
func (icb *ImageCRDBuilder) GetAppContent(MountPoint string) error {
	var errl errlist.List
	//Using a pipe helps with future file reading needs
	fileReadPipeLine := []func(MountPoint string) (string, error){
		//app config is the based file ,it should read first
		icb.ReadOrBuildAppConfig,
		icb.ReadImageContent,
		icb.ReadReadme,
	}
	for _, f := range fileReadPipeLine {
		if out, err := f(MountPoint); err != nil {
			errl.Add(err)
		} else {
			fmt.Println(out)
		}
	}
	return errl.Err()
}

func (icb *ImageCRDBuilder) AppContentApply() error {
	//TODO: use user private kubeconfig rather than global kubeconfig
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
	fmt.Println("Success image apply")
	return nil
}

func (icb *ImageCRDBuilder) DeleteContainer() error {
	realImpl, err := New("")
	if err != nil {
		return fmt.Errorf("deleteContainer err : %v", err)
	}
	return realImpl.Delete(icb.clustername)
}

func (icb *ImageCRDBuilder) ReadOrBuildAppConfig(MountPoint string) (string, error) {
	if file.IsExist(filepath.Join(MountPoint, AppPath, ConfigFileName)) {
		//if app base config find
		c, err := file.ReadAll(filepath.Join(MountPoint, AppPath, ConfigFileName))
		if err != nil {
			return "", fmt.Errorf("read config.yaml err: %v", err)
		}
		if err = icb.ConfigParse(c); err != nil {
			return "", fmt.Errorf("readAppConfig : %v", err)
		}
	} else {
		//if app base config not find
		//image name which contains "/" and ":" couldn't be used in meta name
		MetaName := strings.Replace(icb.imagename, ":", ".", -1)
		MetaName = strings.Replace(MetaName, "/", ".", -1)
		c := imagev1.Image{
			TypeMeta:   metav1.TypeMeta{Kind: ImagehubKind, APIVersion: filepath.Join(ImagehubGroup, ImagehubVersion)},
			ObjectMeta: metav1.ObjectMeta{Name: MetaName},
			Spec:       imagev1.ImageSpec{Name: imagev1.ImageName(icb.imagename)},
			Status:     imagev1.ImageStatus{},
		}
		icb.AppConfig = &c
	}
	return ReadOrBuildAppConfigOutput, nil
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

func (icb *ImageCRDBuilder) ReadReadme(MountPoint string) (string, error) {
	if file.IsExist(filepath.Join(MountPoint, READMEpath)) {
		c, err := file.ReadAll(filepath.Join(MountPoint, READMEpath))
		if err != nil {
			return "", fmt.Errorf("read README.md err: %v", err)
		}
		icb.AppConfig.Spec.DetailInfo.Description = string(c)
	}
	return ReadReadmeOutput, nil
}

func (icb *ImageCRDBuilder) ReadImageContent(MountPoint string) (string, error) {
	realImpl, err := New("")
	if err != nil {
		return "", fmt.Errorf("deleteContainer err : %v", err)
	}
	containerInfo, err := realImpl.InspectContainer(icb.clustername)
	if err != nil {
		return "", fmt.Errorf("readImageContent InspectImage err : %v", err)
	}
	var config v1.Image
	if err = json.Unmarshal([]byte(containerInfo.Config), &config); err != nil {
		return "", fmt.Errorf("get image config err : %v", err)
	}
	var manifest v1.Manifest
	if err = json.Unmarshal([]byte(containerInfo.Manifest), &manifest); err != nil {
		return "", fmt.Errorf("get image config err : %v", err)
	}
	icb.BindImageContent(containerInfo, config, manifest)
	return ReadImageContentOutput, nil
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
