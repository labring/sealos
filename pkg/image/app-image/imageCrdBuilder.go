package app_image

import (
	"context"
	"flag"
	"fmt"
	imagev1 "github.com/labring/sealos/controllers/imagehub/api/v1"
	"github.com/labring/sealos/pkg/image"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/pkg/errors"
	"gopkg.in/yaml.v3"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
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
	var kubeconfig *string
	if home := homedir.HomeDir(); home != "" {
		kubeconfig = flag.String("kubeconfig", filepath.Join(home, ".kube", "config"), "(optional) absolute path to the kubeconfig file")
	} else {
		kubeconfig = flag.String("kubeconfig", "", "absolute path to the kubeconfig file")
	}
	flag.Parse()
	config, err := clientcmd.BuildConfigFromFlags("", *kubeconfig)
	if err != nil {
		return err
	}
	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return err
	}
	gvr := schema.GroupVersionResource{Version: "v1", Resource: "Images"}
	dyclient := dynamicClient.Resource(gvr).Namespace("default")
	utd := unstructured.Unstructured{}
	utd.Object, err = runtime.DefaultUnstructuredConverter.ToUnstructured(icb.content.AppConfig)
	if err != nil {
		return err
	}
	if _, err := dyclient.Create(context.TODO(), &utd, metav1.CreateOptions{}); err != nil {
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
	for k, v := range icb.content.ActionTemplate {
		config.Spec.DetailInfo.AppActions.Actions[imagev1.ActionName(k)] = imagev1.Template(string(v))
	}
	for k, v := range icb.content.ActionCMD {
		config.Spec.DetailInfo.AppActions.CMD[imagev1.ActionName(k)] = imagev1.CMD(string(v))
	}
	return nil
}
