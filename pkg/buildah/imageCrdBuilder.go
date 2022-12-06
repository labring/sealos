package buildah

import (
	"context"
	"flag"
	"fmt"
	imagev1 "github.com/labring/sealos/controllers/imagehub/api/v1"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/pkg/errors"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/runtime/serializer/yaml"
	"k8s.io/client-go/discovery"
	memory "k8s.io/client-go/discovery/cached"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/restmapper"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
	"math/rand"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

const (
	AppPath          = "app"
	READMEpath       = "README.md"
	ConfigFileName   = "config.yaml"
	TemplateFileName = "template.yaml"
	CMDFileName      = "CMD"
)

type ImageCRDBuilder struct {
	imagename   string
	clustername string
	Content     *Content
}

type Content struct {
	README         string
	ActionTemplate map[string]string
	ActionCMD      map[string]string
	AppConfig      *imagev1.Image
}

func NewImageCRDBuilder(imageName string) *ImageCRDBuilder {
	return &ImageCRDBuilder{imageName, "", &Content{
		README:         "",
		ActionTemplate: make(map[string]string),
		ActionCMD:      make(map[string]string),
		AppConfig:      nil,
	}}
}

//Action path example
//.
//├── config.yaml
//├── install
//│		├── cmd
//│	    └── template.yaml
//└── uninstall
//      ├── cmd
//      └── template.yaml

func (icb *ImageCRDBuilder) Run() error {
	MountPoint, err := icb.CreateContainer()
	if err != nil {
		return err
	}
	err = icb.GetAppContent(MountPoint)
	if err != nil {
		return err
	}
	err = icb.AppContentApply()
	if err != nil {
		return err
	}
	err = icb.DeleteContainer()
	if err != nil {
		return err
	}
	return nil
}

func (icb *ImageCRDBuilder) CreateContainer() (string, error) {
	rnd := rand.New(rand.NewSource(time.Now().UnixNano()))
	clusterName := icb.imagename + strconv.Itoa(rnd.Int())
	fmt.Println(clusterName)
	realImpl, err := New("")
	if err != nil {
		return "", err
	}

	builderInfo, err := realImpl.Create(clusterName, icb.imagename)
	fmt.Println(builderInfo.MountPoint)
	if err != nil {
		return "", err
	}
	logger.Info("Mount point: %s", builderInfo.MountPoint)
	if iseist := file.IsExist(builderInfo.MountPoint); !iseist {
		return "", fmt.Errorf("MountPoint not Exist")
	}
	icb.clustername = clusterName
	return builderInfo.MountPoint, nil
}

func (icb *ImageCRDBuilder) GetAppContent(MountPoint string) error {
	if !file.IsExist(filepath.Join(MountPoint, AppPath)) && !file.IsExist(filepath.Join(MountPoint, AppPath, ConfigFileName)) {
		return fmt.Errorf("App and config  can't find")
	}
	if file.IsExist(filepath.Join(MountPoint, READMEpath)) {
		c, err := FileReadUtil(filepath.Join(MountPoint, READMEpath))
		if err != nil {
			return err
		}
		icb.Content.README = string(c)
	}

	file, err := os.Open(filepath.Join(MountPoint, AppPath))
	if err != nil {
		return err
	}
	fileinfo, err := file.Readdir(-1)
	for _, f := range fileinfo {
		if f.Name() == ConfigFileName {
			var c []byte
			c, err = FileReadUtil(filepath.Join(MountPoint, AppPath, ConfigFileName))
			if err != nil {
				return err
			}
			if err = icb.ConfigParse(c); err != nil {
				return err
			}
			continue
		}
		if f.IsDir() {
			ff, err := os.Open(filepath.Join(MountPoint, AppPath, f.Name()))
			if err != nil {
				return err
			}
			actionfiles, err := ff.Readdir(-1)
			for _, actionfile := range actionfiles {
				if actionfile.Name() == TemplateFileName {
					var c []byte
					c, err = FileReadUtil(filepath.Join(MountPoint, AppPath, f.Name(), actionfile.Name()))
					if err != nil {
						return err
					}
					icb.Content.ActionTemplate[f.Name()] = string(c)
				}
				if actionfile.Name() == CMDFileName {
					var c []byte
					c, err = FileReadUtil(filepath.Join(MountPoint, AppPath, f.Name(), actionfile.Name()))
					if err != nil {
						return err
					}
					icb.Content.ActionCMD[f.Name()] = string(c)
				}
			}
		}
	}
	err = icb.TemplateCmdParse()
	if err != nil {
		return err
	}

	return nil
}

func (icb *ImageCRDBuilder) AppContentApply() error {
	utd := unstructured.Unstructured{}
	utd.Object, _ = runtime.DefaultUnstructuredConverter.ToUnstructured(icb.Content.AppConfig)
	gvk := icb.Content.AppConfig.GroupVersionKind()
	dyclient, _ := GetGVRdyClient(&gvk, "default")
	if _, err := dyclient.Create(context.TODO(), &utd, metav1.CreateOptions{}); err != nil {
		if utd.GetResourceVersion() == "" {
			objGET, err := dyclient.Get(context.TODO(), utd.GetName(), metav1.GetOptions{})
			if err != nil {
				return errors.Wrap(err, "unable to get obj")
			}
			fmt.Println(objGET.GetResourceVersion())
			utd.SetResourceVersion(objGET.GetResourceVersion())
		}
		fmt.Println("dyclient.Create err")
		if !apierrors.IsAlreadyExists(err) {
			return errors.Wrap(err, "unable to create secret")
		}
		if _, err := dyclient.Update(context.TODO(), &utd, metav1.UpdateOptions{}); err != nil {
			return errors.Wrap(err, "unable to update secret")
		}
	}
	return nil
}

func (icb *ImageCRDBuilder) DeleteContainer() error {
	realImpl, err := New("")
	if err != nil {
		return err
	}
	return realImpl.Delete(icb.imagename)
}

func FileReadUtil(filePath string) ([]byte, error) {
	file, err := os.Open(filePath)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}
	defer file.Close()
	fileinfo, err := file.Stat()
	if err != nil {
		fmt.Println(err)
		return nil, err
	}
	filesize := fileinfo.Size()
	buffer := make([]byte, filesize)
	_, err = file.Read(buffer)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}
	return buffer, err
}

func (icb *ImageCRDBuilder) ConfigParse(c []byte) error {
	config := &imagev1.Image{}
	_, _, err := yaml.NewDecodingSerializer(unstructured.UnstructuredJSONScheme).Decode(c, nil, config)
	if err != nil {
		panic(fmt.Errorf("failed to get GVK: %v", err))
	}
	icb.Content.AppConfig = config
	return nil
}

func (icb *ImageCRDBuilder) TemplateCmdParse() error {
	for k, v := range icb.Content.ActionTemplate {
		if icb.Content.AppConfig.Spec.DetailInfo.AppActions.Actions == nil {
			icb.Content.AppConfig.Spec.DetailInfo.AppActions.Actions = make(map[imagev1.ActionName]imagev1.Template)
		}
		icb.Content.AppConfig.Spec.DetailInfo.AppActions.Actions[imagev1.ActionName(k)] = imagev1.Template(v)
	}
	for k, v := range icb.Content.ActionCMD {
		if icb.Content.AppConfig.Spec.DetailInfo.AppActions.CMD == nil {
			icb.Content.AppConfig.Spec.DetailInfo.AppActions.CMD = make(map[imagev1.ActionName]imagev1.CMD)
		}
		icb.Content.AppConfig.Spec.DetailInfo.AppActions.CMD[imagev1.ActionName(k)] = imagev1.CMD(v)
	}
	return nil
}

func GetGVRdyClient(gvk *schema.GroupVersionKind, namespace string) (dr dynamic.ResourceInterface, err error) {
	var kubeconfig *string
	if home := homedir.HomeDir(); home != "" {
		kubeconfig = flag.String("kconfig", filepath.Join(home, ".kube", "config"), "(optional) absolute path to the kubeconfig file")
	} else {
		kubeconfig = flag.String("kconfig", "", "absolute path to the kubeconfig file")
	}
	flag.Parse()
	config, err := clientcmd.BuildConfigFromFlags("", *kubeconfig)
	if err != nil {
		return
	}
	discoveryClient, err := discovery.NewDiscoveryClientForConfig(config)
	if err != nil {
		return
	}
	mapperGVRGVK := restmapper.NewDeferredDiscoveryRESTMapper(memory.NewMemCacheClient(discoveryClient))
	resourceMapper, err := mapperGVRGVK.RESTMapping(gvk.GroupKind(), gvk.Version)
	if err != nil {
		return
	}
	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return
	}
	if resourceMapper.Scope.Name() == meta.RESTScopeNameNamespace {
		dr = dynamicClient.Resource(resourceMapper.Resource).Namespace(namespace)
	} else {
		dr = dynamicClient.Resource(resourceMapper.Resource)
	}
	return
}
