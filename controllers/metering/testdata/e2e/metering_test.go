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

}
