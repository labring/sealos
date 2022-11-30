package app_image

import (
	"flag"
	"fmt"
	imagev1 "github.com/labring/sealos/controllers/imagehub/api/v1"
	"github.com/labring/sealos/pkg/image"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"gopkg.in/yaml.v3"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/discovery/cached/memory"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
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
	AppPath          = "/app"
	ActionPath       = "/app/actions"
	READMEpath       = "/README.md"
	ConfigFileName   = "appconfig.yaml"
	TemplateFileName = "template.yaml"
	CMDFileName      = "CMD"
	DefaultNamespace = "default"
)

type ImageCRDBuilder struct {
	imagename   string
	clustername string
	content     *Content
}
type Content struct {
	README         string
	ActionTemplate map[string]string
	ActionCMD      map[string]string
	AppConfig      *imagev1.Image
}

func NewImageCRDBuilder(imageName string) *ImageCRDBuilder {
	return &ImageCRDBuilder{imageName, "", nil}
}

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

	clusterSvc, err := image.NewClusterService()
	if err != nil {
		return "", err
	}

	manifest, err := clusterSvc.Create(clusterName, icb.imagename)
	if err != nil {
		return "", err
	}
	logger.Info("Mount point: %s", manifest.MountPoint)
	if iseist := file.IsExist(manifest.MountPoint); !iseist {
		return "", fmt.Errorf("MountPoint not Exist")
	}
	icb.clustername = clusterName
	return manifest.MountPoint, nil
}

func (icb *ImageCRDBuilder) GetAppContent(MountPoint string) error {
	icb.content = &Content{}
	if !file.IsExist(MountPoint + AppPath) {
		return fmt.Errorf("app dir can't find")
	}

	if file.IsExist(MountPoint + READMEpath) {
		c, err := FileReadUtil(MountPoint + READMEpath)
		if err != nil {
			return err
		}
		icb.content.README = string(c)
	}

	if !file.IsExist(MountPoint + ActionPath) {
		file, err := os.Open(MountPoint)
		if err != nil {
			return err
		}
		fileinfo, err := file.Readdir(-1)
		for _, f := range fileinfo {
			if f.Name() == ConfigFileName {
				var c []byte
				c, err = FileReadUtil(MountPoint + READMEpath)
				if err != nil {
					return err
				}
				if err = icb.ConfigParse(c); err != nil {
					return err
				}
				continue
			}
			if f.IsDir() {
				ff, err := os.Open(MountPoint + ActionPath + "/" + f.Name())
				if err != nil {
					return err
				}
				actionfiles, err := ff.Readdir(-1)
				for _, actionfile := range actionfiles {
					if actionfile.Name() == TemplateFileName {
						var c []byte
						c, err = FileReadUtil(MountPoint + ActionPath + "/" + actionfile.Name())
						if err != nil {
							return err
						}
						icb.content.ActionTemplate[f.Name()] = string(c)
					}
					if actionfile.Name() == CMDFileName {
						var c []byte
						c, err = FileReadUtil(MountPoint + ActionPath + "/" + actionfile.Name())
						if err != nil {
							return err
						}
						icb.content.ActionCMD[f.Name()] = string(c)
					}
				}
			}
		}
	} else {
		return fmt.Errorf("actions dir cant'find")
	}
	return nil
}

func (icb *ImageCRDBuilder) AppContentApply() error {

	gvk := icb.content.AppConfig.GroupVersionKind()
	_, err := GetGVRdyClient(&gvk, DefaultNamespace)
	if err != nil {
		panic(fmt.Errorf("failed to get dr: %v", err))
	}

	return nil
}

func (icb *ImageCRDBuilder) DeleteContainer() error {
	force := true
	registrySvc, err := image.NewImageService()
	if err != nil {
		return err
	}
	return registrySvc.Remove(force, icb.imagename)
	return nil
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
	if err := yaml.Unmarshal(c, config); err != nil {
		return err
	}
	icb.content.AppConfig = config
	return nil
}

type Config struct {
	Type string `yaml:"type"`
	Url  string `yaml:"url"`
}

func GetK8sConfig() (config *rest.Config, err error) {
	var kubeconfig *string
	if home := homedir.HomeDir(); home != "" {
		kubeconfig = flag.String("kubeconfig", filepath.Join(home, ".kube", "config"), "(optional) absolute path to the kubeconfig file")
	} else {
		kubeconfig = flag.String("kubeconfig", "", "absolute path to the kubeconfig file")
	}
	flag.Parse()
	config, err = clientcmd.BuildConfigFromFlags("", *kubeconfig)
	if err != nil {
		panic(err)
	}
	return
}

func GetGVRdyClient(gvk *schema.GroupVersionKind, namespace string) (dr dynamic.ResourceInterface, err error) {
	config, err := GetK8sConfig()
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
