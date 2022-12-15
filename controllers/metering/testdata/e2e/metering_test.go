package e2e

import (
	"fmt"
	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	"github.com/labring/sealos/controllers/metering/controllers"
	"github.com/labring/sealos/controllers/metering/testdata/api"
	baseapi "github.com/labring/sealos/test/testdata/api"
	"log"
	"os"
	"testing"
	"time"
)

const (
	TestNamespace          = "metering-test"
	ResourceControllerName = "pod-controller"
	PodName                = "nginx-test"
)

var MeteringSystemNamespace string

func init() {
	MeteringSystemNamespace = os.Getenv(controllers.METERINGNAMESPACEENV)
	if MeteringSystemNamespace == "" {
		MeteringSystemNamespace = "metering-system"
	}
	baseapi.EnsureNamespace(MeteringSystemNamespace)
	// first export METERING_INTERVAL=1，then run test
	fmt.Println("METERING_INTERVAL:", os.Getenv("METERING_INTERVAL"))
}

func TestMetering(t *testing.T) {
	t.Run("metering should be ok", func(t *testing.T) {
		t.Run("metering should be created when create a user ns", func(t *testing.T) {
			t.Log("create metering  ")
			baseapi.EnsureNamespace(TestNamespace)
			time.Sleep(time.Second * 3)

			t.Log("ensure metering is created")
			_, err := api.GetMetering(MeteringSystemNamespace, controllers.MeteringPrefix+TestNamespace)
			if err != nil {
				t.Fatalf("failed to get metering: %v", err)
			}

			t.Log("ensure metering is delete after delete namespace")
			err = baseapi.DeleteNamespace(TestNamespace)
			if err != nil {
				t.Fatalf("failed to delete namespace: %v", err)
			}
			time.Sleep(time.Second)
			_, err = api.GetMetering(MeteringSystemNamespace, controllers.MeteringPrefix+TestNamespace)
			if err == nil {
				t.Fatalf("success get metering: %v", err)
			}
		})

		t.Run("extension should be ok", func(t *testing.T) {
			// test extension will register cpu price to metering
			t.Log("create metering  ")
			baseapi.CreateCRD(MeteringSystemNamespace, controllers.MeteringPrefix+TestNamespace, api.MeteringYaml)
			time.Sleep(time.Second)
			metering, err := api.GetMetering(MeteringSystemNamespace, controllers.MeteringPrefix+TestNamespace)
			if err != nil {
				t.Fatalf("success get metering: %v", err)
			}

			if _, ok := metering.Spec.Resources["cpu"]; ok {
				t.Fatalf("metering spec.Resources should not have cpu")
			}
			t.Log("create extensionResourcePrice  ")
			baseapi.CreateCRD(MeteringSystemNamespace, meteringv1.GetExtensionResourcePriceName(ResourceControllerName), api.ExtensionResourcePriceYaml)
			time.Sleep(time.Second)
			metering, err = api.GetMetering(MeteringSystemNamespace, controllers.MeteringPrefix+TestNamespace)
			if err != nil {
				t.Fatalf("success get metering: %v", err)
			}

			if _, ok := metering.Spec.Resources["cpu"]; !ok {
				t.Fatalf("metering spec.Resources should  have cpu")
			}
		})

		t.Run("pod controller should be ok", func(t *testing.T) {
			baseapi.EnsureNamespace(TestNamespace)
			time.Sleep(2 * time.Second)
			t.Log("creat pod controller")
			api.CreatePodController(MeteringSystemNamespace, controllers.PodResourcePricePrefix)

			//time.Sleep(20 * time.Second)
			t.Log("ensure extension resource is created")
			podExtensionResourcePrice, err := api.GetExtensionResourcePrice(MeteringSystemNamespace, controllers.PodResourcePricePrefix)
			if err != nil {
				t.Fatalf("failed to get extension resource: %v", err)
			}

			if _, ok := podExtensionResourcePrice.Spec.Resources["cpu"]; !ok {
				t.Fatalf("failed to get cpu price,resource info:%+v", podExtensionResourcePrice.Spec.Resources)
			}
			if _, ok := podExtensionResourcePrice.Spec.Resources["storage"]; !ok {
				t.Fatalf("failed to get storage price,resource info:%+v", podExtensionResourcePrice.Spec.Resources)
			}

			t.Log(" del metering")
			err = baseapi.DeleteCRD(MeteringSystemNamespace, controllers.MeteringPrefix+TestNamespace, api.MeteringYaml)
			if err != nil {
				t.Fatalf(err.Error())
			}
			t.Log("create a nginx pod")
			api.CreatPod(TestNamespace, PodName)

			t.Log("ensure resource CR is created")
			resource, err := api.EnsureResourceCreate(MeteringSystemNamespace, fmt.Sprintf("%s-%s-%v", controllers.PodResourcePricePrefix, "cpu", 0), 90)
			if err != nil {
				t.Fatalf(err.Error())
			}

			if _, ok := resource.Spec.Resources["cpu"]; !ok {
				t.Fatalf("not fount cpu resource used ")
			}
			t.Log(resource)

			t.Log("Make sure resources are counted twice")
			resource, err = api.EnsureResourceCreate(MeteringSystemNamespace, fmt.Sprintf("%s-%s-%v", controllers.PodResourcePricePrefix, "cpu", 1), 90)
			if err != nil {
				t.Fatalf(err.Error())
			}
			if resource.Spec.Resources["cpu"].Used.Value() == 0 {
				t.Fatalf("resource used count error ")
			}
			t.Log(resource)
		})

		t.Run("metering used update should be ok", func(t *testing.T) {
			baseapi.EnsureNamespace(TestNamespace)
			api.EnsurePod(TestNamespace, PodName)
			api.EnsurePodController(MeteringSystemNamespace, controllers.PodResourcePricePrefix)
			time.Sleep(time.Second * 2)

			metering, err := api.GetMetering(MeteringSystemNamespace, controllers.MeteringPrefix+TestNamespace)
			if err != nil {
				t.Fatalf("success get metering: %v", err)
			}

			t.Log(" metering resource used update should be ok")
			metering, err = api.EnsureMeteringUsed(TestNamespace, controllers.MeteringPrefix+TestNamespace, 90)
			if err != nil {
				t.Fatalf("failed to get metering-quota: %v", err)
			}

			if metering.Spec.Resources["cpu"].Used.Value() == 0 {
				t.Fatalf("pod controller fail to update metering-quota,value:%v", metering.Spec.Resources["cpu"].Used.Value())
			}
			t.Log("meteringQuota.Spec.Resources", metering.Spec.Resources)
		})

	})
	t.Cleanup(clear)
}

func clear() {
	//time.Sleep(100 * time.Second)
	err := baseapi.DeleteNamespace(TestNamespace)
	if err != nil {
		log.Println(err)
	}

	err = api.DeleteMetering(MeteringSystemNamespace, controllers.MeteringPrefix+TestNamespace)
	if err != nil {
		log.Println(err)
	}

	err = baseapi.DeleteCRD(MeteringSystemNamespace, meteringv1.GetExtensionResourcePriceName(ResourceControllerName), api.ExtensionResourcePriceYaml)
	if err != nil {
		log.Println(err)
	}

	err = api.DeletePodController(MeteringSystemNamespace, controllers.PodResourcePricePrefix)
	if err != nil {
		log.Println(err)
	}

	err = api.DeletePod(TestNamespace, PodName)
	if err != nil {
		log.Println(err)
	}

	err = api.DeleteExtensionResourcePrice(MeteringSystemNamespace, controllers.PodResourcePricePrefix)
	if err != nil {
		log.Println(err)
	}
}
