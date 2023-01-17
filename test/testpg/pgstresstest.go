package testpg

import (
	"context"
	"fmt"

	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/runtime/serializer/yaml"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/discovery/cached/memory"
	"k8s.io/client-go/dynamic"
	restclient "k8s.io/client-go/rest"

	"log"
	"math/rand"
	"strconv"
	"time"

	"k8s.io/client-go/restmapper"
	"k8s.io/client-go/tools/clientcmd"
)

// 自定义数据
const metaCRD = `
kind: "postgresql"
apiVersion: "acid.zalan.do/v1"

metadata:
  name: "acid-pg-test"
  labels:
    team: acid

spec:
  teamId: "acid"
  postgresql:
    version: "14"
  numberOfInstances: 3
  volume:
    size: 500Mi

  users:
    pg-test: [superuser,createdb]
    
  databases:
    pg-db: pg-test
    
  resources:
    requests:
      cpu: 300m
      memory: 300Mi
    limits:
      cpu: 300m
      memory: 300Mi
`

//you can also copy this file to your project and run it or run pod on sealos cloud.
//and also you can write a go test to run this Stress Test.
//what you need is to specify a kubeconfig path and your namespace
//example
//func main() {
//	PostgresStressTest("~/.kube/config", "ns-b47ef502")
//}

func PostgresStressTest(configpath, userNamespace string) {
	err := RunPostgresTest(configpath, userNamespace)
	if err != nil {
		log.Fatal(err)
	}
}

func RunPostgresTest(config, userNamespace string) error {
	var (
		gvk *schema.GroupVersionKind
		dr  dynamic.ResourceInterface
		err error
	)
	obj := &unstructured.Unstructured{}
	_, gvk, err = yaml.NewDecodingSerializer(unstructured.UnstructuredJSONScheme).Decode([]byte(metaCRD), nil, obj)
	if err != nil {
		return err
	}
	dr, err = GetGVRdyClient(gvk, config, userNamespace)
	if err != nil {
		return err
	}
	for {
		ctx := context.Background()
		createObj, err := PostgresClusterRandomCreate(ctx, dr, obj)
		if err != nil {
			return err
		}
		time.Sleep(time.Minute * 1)
		for _, obj := range createObj {
			err := PostgresGet(ctx, dr, obj)
			if err != nil {
				return err
			}
		}
		time.Sleep(time.Minute * 1)
		for _, obj := range createObj {
			PostgresDelete(ctx, dr, obj)
		}
		time.Sleep(time.Minute * 15)
	}
}

// PostgresClusterRandomCreate Create random PostgresCluster.
func PostgresClusterRandomCreate(ctx context.Context, dr dynamic.ResourceInterface, obj *unstructured.Unstructured) ([]*unstructured.Unstructured, error) {
	var err error
	rand.Seed(time.Now().UnixNano())
	n := rand.Intn(5)
	objSlice := []*unstructured.Unstructured{}
	//Create
	for i := 0; i < n; i++ {
		objTmp := obj.DeepCopy()
		objTmp.SetName(objTmp.GetName() + strconv.Itoa(i))
		_, err = dr.Create(ctx, objTmp, metav1.CreateOptions{})
		if err != nil {
			log.Printf("Create %v err : %v", objTmp.GetName(), err)
			continue
		}
		log.Printf("Create %v success", objTmp.GetName())
		objSlice = append(objSlice, objTmp)
	}
	return objSlice, err
}

// PostgresGet Get PostgresCluster.
func PostgresGet(ctx context.Context, dr dynamic.ResourceInterface, obj *unstructured.Unstructured) error {
	objGET, err := dr.Get(ctx, obj.GetName(), metav1.GetOptions{})
	if err != nil {
		log.Printf("select resource ERROR: %v\n", err)
		return err
	}
	fmt.Println(objGET.Object["status"])
	return nil
}

// PostgresDelete Delete PostgresCluster.
func PostgresDelete(ctx context.Context, dr dynamic.ResourceInterface, obj *unstructured.Unstructured) {
	//Delete
	err := dr.Delete(ctx, obj.GetName(), metav1.DeleteOptions{})
	if err != nil {
		log.Printf("delete resource ERROR : %v\n", err)
	} else {
		log.Printf("delete %v success", obj.GetName())
	}
}

func GetKubeconfig(configpath string) (*restclient.Config, error) {
	config, err := clientcmd.BuildConfigFromFlags("", configpath)
	if err != nil {
		return nil, err
	}
	return config, nil
}

func GetGVRdyClient(gvk *schema.GroupVersionKind, configpath string, namespace string) (dr dynamic.ResourceInterface, err error) {
	config, err := GetKubeconfig(configpath)
	if err != nil {
		log.Printf("failed to get kubeconfig: %v", err)
		return nil, err
	}
	discoveryClient, err := discovery.NewDiscoveryClientForConfig(config)
	if err != nil {
		log.Printf("failed create discovery client: %v", err)
		return nil, err
	}
	mapperGVRGVK := restmapper.NewDeferredDiscoveryRESTMapper(memory.NewMemCacheClient(discoveryClient))
	resourceMapper, err := mapperGVRGVK.RESTMapping(gvk.GroupKind(), gvk.Version)
	if err != nil {
		log.Printf("failed to get resourceMapper: %v", err)
		return nil, err
	}
	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		log.Printf("failed to create dynamic client: %v", err)
		return nil, err
	}
	if resourceMapper.Scope.Name() == meta.RESTScopeNameNamespace {
		dr = dynamicClient.Resource(resourceMapper.Resource).Namespace(namespace)
	} else {
		dr = dynamicClient.Resource(resourceMapper.Resource)
	}
	return dr, nil
}
