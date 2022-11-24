package e2e

import (
	"fmt"
	"github.com/labring/sealos/controllers/metering/testdata/api"
	"log"
	"os"
	"time"

	"github.com/labring/sealos/controllers/metering/controllers"
	baseapi "github.com/labring/sealos/test/testdata/api"

	"testing"
)

const (
	TestNamespace = "metering-test"
	PodName       = "nginx-test"
	InfraName     = "infra-test-yyj"
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
		t.Run("metering Quota and metering should be created when create a user ns", func(t *testing.T) {
			t.Log("create metering and meteringQuota ")
			baseapi.EnsureNamespace(TestNamespace)
			time.Sleep(time.Second * 3)

			t.Log("ensure metering is created")
			_, err := api.GetMetering(MeteringSystemNamespace, controllers.MeteringPrefix+TestNamespace)
			if err != nil {
				t.Fatalf("failed to get metering: %v", err)
			}

			t.Log("ensure metering-quota is created")
			_, err = api.GetMeteringQuota(TestNamespace, controllers.MeteringQuotaPrefix+TestNamespace)
			if err != nil {
				t.Fatalf("failed to get metering-quota: %v", err)
			}
		})

		t.Run("pod controller should be ok", func(t *testing.T) {
			t.Log("creat pod controller")
			api.CreatePodController(MeteringSystemNamespace, controllers.PodResourcePricePrefix)
			time.Sleep(time.Second * 2)

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

			baseapi.EnsureNamespace(TestNamespace)
			time.Sleep(2 * time.Second)
			t.Log(" del metering")
			err = baseapi.DeleteCRD(MeteringSystemNamespace, controllers.MeteringPrefix+TestNamespace, api.MeteringYaml)
			if err != nil {
				t.Fatalf(err.Error())
			}
			t.Log("create a nginx pod")
			api.CreatPod(TestNamespace, PodName)

			meteringQuota, err := api.GetMeteringQuota(TestNamespace, controllers.MeteringQuotaPrefix+TestNamespace)
			if err != nil {
				t.Fatalf(err.Error())
			}

			if _, ok := meteringQuota.Spec.Resources["cpu"]; !ok {
				t.Fatalf("cpu resource not register to meteringquota")
			}
			t.Log(" metering-quota resource used update should be ok")
			meteringQuota, err = api.EnsureMeteringQuotaUsed(TestNamespace, controllers.MeteringQuotaPrefix+TestNamespace, 90)
			if err != nil {
				t.Fatalf("failed to get metering-quota: %v", err)
			}

			if meteringQuota.Spec.Resources["cpu"].Used.Value() == 0 {
				t.Fatalf("pod controller fail to update metering-quota,value:%v", meteringQuota.Spec.Resources["cpu"].Used.Value())
			}

			t.Log("meteringQuota.Spec.Resources", meteringQuota.Spec.Resources)
		})

		t.Run("metering calculate should be ok", func(t *testing.T) {
			err := api.DeletePod(TestNamespace, PodName)
			err = baseapi.EnsureDeleteNamespace(TestNamespace, 30)
			if err != nil {
				t.Log(err.Error())
			}

			baseapi.EnsureNamespace(TestNamespace)
			time.Sleep(time.Second * 5)
			api.EnsurePodController(MeteringSystemNamespace, controllers.PodResourcePricePrefix)
			time.Sleep(time.Second * 10)
			api.EnsurePod(TestNamespace, PodName)

			t.Log("check metering calculate")
			time.Sleep(time.Second)
			metering, err := api.EnsureMeteringCalculate(MeteringSystemNamespace, controllers.MeteringPrefix+TestNamespace, 180)
			if err != nil {
				t.Fatalf("failed to ensure metering calculate: %v", err)
			}

			t.Log("delete pod should not calculate")
			preTotalAmount := metering.Status.TotalAmount
			err = api.DeletePod(TestNamespace, PodName)
			if err != nil {
				t.Fatalf(err.Error())
			}
			time.Sleep(time.Second * 60)
			metering, _ = api.GetMetering(MeteringSystemNamespace, controllers.MeteringPrefix+TestNamespace)
			t.Log("preTotalAmount, ", preTotalAmount, ", nowTotalAmount, ", metering.Status.TotalAmount)
			if metering.Status.TotalAmount != preTotalAmount {
				t.Log("re test delete pod should not calculate")
				preTotalAmount = metering.Status.TotalAmount
				time.Sleep(time.Second * 60)
				metering, _ = api.GetMetering(MeteringSystemNamespace, controllers.MeteringPrefix+TestNamespace)
				if metering.Status.TotalAmount != preTotalAmount {
					t.Fatalf("delete pod should not calcute preAmount: %v,newAmount: %v", preTotalAmount, metering.Status.TotalAmount)
				}
			}

			t.Log("not running pod should not calculate")
			// todo write test
		})

		t.Run("metering calculate infra should be ok", func(t *testing.T) {
			t.Log("ensure infra is created")
			baseapi.EnsureNamespace(TestNamespace)
			baseapi.CreateCRD(TestNamespace, InfraName, api.InfraYaml)
			err := api.EnsureInfra(TestNamespace, InfraName, 120)
			if err != nil {
				t.Fatalf(err.Error())
			}
			infra, err := api.GetInfra(TestNamespace, InfraName)
			if err != nil {
				t.Fatalf("failed to get infra: %v", err)
			}

			t.Log("check infra QueryPrice")
			price, err := infra.QueryPrice()
			t.Log("infra price is ", price)
			if err != nil {
				t.Fatalf("failed to query infra price: %v", err)
			}
		})
	})

	t.Cleanup(clear)
}

func clear() {
	//time.Sleep(100 * time.Second)
	err := api.DeleteMeteringQuota(TestNamespace, controllers.MeteringQuotaPrefix+TestNamespace)
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
	err = baseapi.DeleteNamespace(TestNamespace)
	if err != nil {
		log.Println(err)
	}
	err = baseapi.DeleteCRD(TestNamespace, InfraName, api.InfraYaml)
	if err != nil {
		log.Println(err)
	}

	err = api.DeleteMetering(MeteringSystemNamespace, controllers.MeteringPrefix+TestNamespace)
	if err != nil {
		log.Println(err)
	}
}
