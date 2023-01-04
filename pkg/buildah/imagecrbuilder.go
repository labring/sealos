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

	"github.com/spf13/cobra"

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
	ImageStdPath     = "metadata"
	READMEpath       = "README.md"
	ConfigFileName   = "config.yaml"
	SealosRootPath   = ".sealos"
	ImagehubGroup    = "imagehub.sealos.io"
	ImagehubVersion  = "v1"
	ImagehubResource = "images"
	ImagehubKind     = "Image"
	KubeConfigPath   = "config"
)

const (
	//Read Content Success Output
	SuccessCreateContainer          = "Success create container"
	SuccessReadOrBuildImageCROutput = "Success get image cr"
	SuccessReadImageInfoOutput      = "Success read image Info"
	SuccessReadReadmeOutput         = "Success read readme file"
	SuccessImageapplyOutput         = "Success apply image cr"
	SuccessDeleteContainer          = "Success delete container"
)

const (
	//Read Content Failed Output
	FailCreateContainer          = "Fail to create container"
	FailReadOrBuildImageCROutput = "Fail to get image cr"
	FailReadImageInfoOutput      = "Fail to read image Info"
	FailReadReadmeOutput         = "Fail to read readme file"
	FailImageapplyOutput         = "Fail to apply image cr"
	FailDeleteContainer          = "Fail to delete container"
)

type ImageCRBuilder struct {
	imagename    string
	registryname string
	containeruid string
	username     string
	userconfig   string
	ImageCR      *imagev1.Image
	store        storage.Store
}

func NewAndRunImageCRBuilder(cmd *cobra.Command, args []string) {
	var dest string
	switch len(args) {
	case 1:
		dest = args[0]
	case 2:
		dest = args[1]
	default:
		return
	}
	store, err := getStore(cmd)
	if err != nil {
		return
	}
	registryname, err := parseRawURL(dest)
	if err != nil {
		return
	}
	//run without error returns
	icb := &ImageCRBuilder{dest, registryname, "", "", "", &imagev1.Image{}, store}
	if icb.CheckLoginStatus() {
		fmt.Println("Start image cr push")
		icb.Run()
	}
}

func (icb *ImageCRBuilder) CheckLoginStatus() bool {
	//Check Cri Login
	creds, err := config.GetAllCredentials(nil)
	if err != nil {
		logger.Debug("get credentials err ,please login first ." + fmt.Sprintf("%v", err))
		return false
	}
	if _, ok := creds[icb.registryname]; ok {
		icb.username = creds[icb.registryname].Username
		icb.userconfig = creds[icb.registryname].Password
	} else {
		logger.Debug("get registry login info err, please login " + icb.registryname + " first")
		return false
	}
	if !file.IsExist(filepath.Join(homedir.HomeDir(), SealosRootPath, icb.registryname)) ||
		!file.IsExist(filepath.Join(homedir.HomeDir(), SealosRootPath, icb.registryname, icb.username)) {
		logger.Debug("no kubeconfig file for this registry, skip image cr build")
		return false
	}
	return true
}

func (icb *ImageCRBuilder) Run() {
	MountPoint, err := icb.CreateContainer()
	if err != nil {
		// get err when create container ,abort all
		fmt.Println(FailCreateContainer)
		logger.Debug(err)
		return
	}
	fmt.Println(SuccessCreateContainer)
	defer func() {
		err = icb.DeleteContainer()
		if err != nil {
			fmt.Println(FailDeleteContainer)
			logger.Debug(err)
			return
		}
		fmt.Println(SuccessDeleteContainer)
	}()
	err = icb.GetMetadata(MountPoint)
	if err != nil {
		logger.Debug(err)
	}
	err = icb.ImageCRApply()
	if err != nil {
		fmt.Println(FailImageapplyOutput)
		logger.Debug(err)
	} else {
		fmt.Println(SuccessImageapplyOutput)
	}
}

func (icb *ImageCRBuilder) CreateContainer() (string, error) {
	rnd := rand.New(rand.NewSource(time.Now().UnixNano()))
	containeruid := icb.imagename + strconv.Itoa(rnd.Int())
	realImpl, err := New("")
	if err != nil {
		return "", err
	}
	builderInfo, err := realImpl.Create(containeruid, icb.imagename)
	if err != nil {
		return "", err
	}
	if iseist := file.IsExist(builderInfo.MountPoint); !iseist {
		return "", fmt.Errorf("mountPoint not Exist")
	}
	icb.containeruid = containeruid
	return builderInfo.MountPoint, nil
}

// GetAppContent do content read in filereadPipeline, if one content get failed ,it won't abort.
func (icb *ImageCRBuilder) GetMetadata(MountPoint string) error {
	var errl errlist.List
	//Using a pipe helps with future file reading needs
	fileReadPipeLine := []func(MountPoint string) (string, error){
		//app config is the based file ,it should read first
		icb.ReadOrBuildImageCRFile,
		icb.ReadInspectInfo,
		icb.ReadDocs,
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

func (icb *ImageCRBuilder) ImageCRApply() error {
	//TODO: use user private kubeconfig rather than global kubeconfig
	client, err := kubernetes.NewKubernetesClient(filepath.Join(homedir.HomeDir(), SealosRootPath, icb.registryname, icb.username, KubeConfigPath), "")
	if err != nil {
		return fmt.Errorf("new KubernetesClient err: %v", err)
	}
	dyclient := client.KubernetesDynamic().Resource(schema.GroupVersionResource{
		Group:    ImagehubGroup,
		Version:  ImagehubVersion,
		Resource: ImagehubResource,
	})
	utd := unstructured.Unstructured{}
	obj, err := runtime.DefaultUnstructuredConverter.ToUnstructured(icb.ImageCR)
	if err != nil {
		return fmt.Errorf("ImageCR ToUnstructured err : %v", err)
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

func (icb *ImageCRBuilder) DeleteContainer() error {
	realImpl, err := New("")
	if err != nil {
		return fmt.Errorf("deleteContainer err : %v", err)
	}
	return realImpl.Delete(icb.containeruid)
}

func (icb *ImageCRBuilder) ReadOrBuildImageCRFile(MountPoint string) (string, error) {
	if file.IsExist(filepath.Join(MountPoint, ImageStdPath, ConfigFileName)) {
		//if app base config find
		c, err := file.ReadAll(filepath.Join(MountPoint, ImageStdPath, ConfigFileName))
		if err != nil {
			return FailReadOrBuildImageCROutput, fmt.Errorf("read imagecr.yaml err: %v", err)
		}
		if err = icb.ImageCRParse(c); err != nil {
			return FailReadOrBuildImageCROutput, fmt.Errorf("read ImageCR err : %v", err)
		}
	}
	//if app base config not find
	//image name which contains "/" and ":" couldn't be used in meta name
	MetaName := strings.Replace(icb.GetClearImagename(), ":", ".", -1)
	MetaName = strings.Replace(MetaName, "/", ".", -1)
	// replace image cr spec and matename by imagename
	icb.ImageCR.TypeMeta = metav1.TypeMeta{Kind: ImagehubKind, APIVersion: filepath.Join(ImagehubGroup, ImagehubVersion)}
	icb.ImageCR.ObjectMeta.Name = MetaName
	icb.ImageCR.Spec.Name = imagev1.ImageName(icb.GetClearImagename())
	return SuccessReadOrBuildImageCROutput, nil
}

// ImageCRParse parse image cr yaml file ot an image cr obj
func (icb *ImageCRBuilder) ImageCRParse(c []byte) error {
	cr := imagev1.Image{}
	_, _, err := yaml.NewDecodingSerializer(unstructured.UnstructuredJSONScheme).Decode(c, nil, &cr)
	if err != nil {
		return fmt.Errorf("configParse err : %v", err)
	}
	cr.Spec.DetailInfo.Actions = make(map[string]imagev1.Action)
	icb.ImageCR = &cr
	return nil
}

// ReadReadme gen image cr detail info: Readme
func (icb *ImageCRBuilder) ReadDocs(MountPoint string) (string, error) {
	if file.IsExist(filepath.Join(MountPoint, READMEpath)) {
		c, err := file.ReadAll(filepath.Join(MountPoint, READMEpath))
		if err != nil {
			return FailReadReadmeOutput, fmt.Errorf("read README.md err: %v", err)
		}
		icb.ImageCR.Spec.DetailInfo.Docs = string(c)
	}
	return SuccessReadReadmeOutput, nil
}

// ReadInspectInfo gen image cr detail info: Id, Arch and Size
func (icb *ImageCRBuilder) ReadInspectInfo(MountPoint string) (string, error) {
	realImpl, err := New("")
	if err != nil {
		return FailReadImageInfoOutput, fmt.Errorf("deleteContainer err : %v", err)
	}
	containerInfo, err := realImpl.InspectContainer(icb.containeruid)
	if err != nil {
		return FailReadImageInfoOutput, fmt.Errorf("readImageContent InspectImage err : %v", err)
	}
	var config v1.Image
	if err = json.Unmarshal([]byte(containerInfo.Config), &config); err != nil {
		return FailReadImageInfoOutput, fmt.Errorf("get image config err : %v", err)
	}
	var manifest v1.Manifest
	if err = json.Unmarshal([]byte(containerInfo.Manifest), &manifest); err != nil {
		return FailReadImageInfoOutput, fmt.Errorf("get image config err : %v", err)
	}
	icb.BindImageContent(containerInfo, config, manifest)
	return SuccessReadImageInfoOutput, nil
}

func (icb *ImageCRBuilder) BindImageContent(containerInfo buildah.BuilderInfo, config v1.Image, manifest v1.Manifest) {
	var err error
	icb.ImageCR.Spec.DetailInfo.ID = containerInfo.FromImageID
	icb.ImageCR.Spec.DetailInfo.Arch = config.Architecture
	icb.ImageCR.Spec.DetailInfo.Size, _ = icb.store.ImageSize(containerInfo.FromImageID)
	if err != nil {
		logger.Debug("image size err : %v", err)
	}
}

// GetClearImagename replace 'hub.sealos.cn/org/repo:tag' to 'org/repo:tag'
func (icb *ImageCRBuilder) GetClearImagename() string {
	return strings.Replace(icb.imagename, icb.registryname+"/", "", 1)
}
