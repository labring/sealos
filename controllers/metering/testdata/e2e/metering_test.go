package e2e

import (
	"fmt"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
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
	TestNamespace    = "ns-metering-test"
	PodName          = "nginx-test"
	DefaultOwner     = "metering-test"
	AccountNamespace = "sealos-system"
	InfraName        = "yyj-test-1"
	containerName    = "nginx"
)

var MeteringSystemNamespace string

func init() {
	MeteringSystemNamespace = os.Getenv(meteringv1.METERINGNAMESPACEENV)
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
			_, err := api.GetMetering(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace)
			if err != nil {
				t.Fatalf("failed to get metering: %v", err)
			}

			t.Log("ensure metering is delete after delete namespace")
			err = baseapi.DeleteNamespace(TestNamespace)
			if err != nil {
				t.Fatalf("failed to delete namespace: %v", err)
			}
			time.Sleep(time.Second)
			_, err = api.GetMetering(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace)
			if err == nil {
				t.Fatalf("success get metering: %v", err)
			}
		})

		t.Run("extension should be ok", func(t *testing.T) {
			// test extension will register cpu price to metering
			t.Log("create metering  ")
			time.Sleep(time.Second * 10)
			baseapi.EnsureNamespace(TestNamespace)
			time.Sleep(time.Second * 10)
			metering, err := api.GetMetering(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace)
			if err != nil {
				t.Fatalf("fail get metering: %v", err)
			}

			if _, ok := metering.Spec.Resources["cpu"]; ok {
				t.Fatalf("metering spec.Resources should not have cpu")
			}
			t.Log("create extensionResourcePrice  ")
			baseapi.CreateCRD(MeteringSystemNamespace, meteringv1.GetExtensionResourcePriceName(meteringv1.PodResourcePricePrefix), api.ExtensionResourcePriceYaml)
			time.Sleep(time.Second)
			metering, err = api.GetMetering(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace)
			if err != nil {
				t.Fatalf("success get metering: %v", err)
			}

			if _, ok := metering.Spec.Resources["cpu"]; !ok {
				t.Fatalf("metering spec.Resources should  have cpu")
			}
		})

		t.Run("pod controller should be ok", func(t *testing.T) {
			time.Sleep(5 * time.Second)
			baseapi.EnsureNamespace(TestNamespace)
			time.Sleep(5 * time.Second)
			t.Log("creat pod controller")
			api.CreatePodController(MeteringSystemNamespace, meteringv1.PodResourcePricePrefix)

			time.Sleep(5 * time.Second)
			t.Log("ensure extension resource is created")
			podExtensionResourcePrice, err := api.GetExtensionResourcePrice(MeteringSystemNamespace, meteringv1.GetExtensionResourcePriceName(meteringv1.PodResourcePricePrefix))
			if err != nil {
				t.Fatalf("failed to get extension resource: %v", err)
			}

			if _, ok := podExtensionResourcePrice.Spec.Resources["cpu"]; !ok {
				t.Fatalf("failed to get cpu price,resource info:%+v", podExtensionResourcePrice.Spec.Resources)
			}
			if _, ok := podExtensionResourcePrice.Spec.Resources["storage"]; !ok {
				t.Fatalf("failed to get storage price,resource info:%+v", podExtensionResourcePrice.Spec.Resources)
			}

			t.Log("create a nginx pod")
			api.CreatPod(TestNamespace, PodName)

			t.Log("ensure resource CR is created")
			resource, err := api.EnsureResourceCreate(MeteringSystemNamespace, controllers.GetResourceName(TestNamespace, PodName, containerName, "cpu", 1), 90)
			if err != nil {
				resource, err = api.EnsureResourceCreate(MeteringSystemNamespace, controllers.GetResourceName(TestNamespace, PodName, containerName, "cpu", 2), 90)
				if err != nil {
					t.Fatalf(err.Error())
				}
			}

			if _, ok := resource.Spec.Resources["cpu"]; !ok {
				t.Fatalf("not fount cpu resource used ")
			}
			if resource.Spec.Resources["cpu"].Used.Value() != 1 {
				t.Fatalf("not fount cpu resource used %v", resource.Spec.Resources["cpu"].Used.Value())
			}
			t.Log(resource)

		})

		t.Run("metering used update and calculate should be ok", func(t *testing.T) {
			api.EnsurePodController(MeteringSystemNamespace, meteringv1.PodResourcePricePrefix)
			time.Sleep(time.Second * 10)
			baseapi.EnsureNamespace(TestNamespace)
			api.EnsurePod(TestNamespace, PodName)
			time.Sleep(time.Second * 5)

			metering, err := api.GetMetering(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace)
			if err != nil {
				t.Fatalf("fail get metering: %v", err)
			}

			if _, ok := metering.Spec.Resources["cpu"]; !ok {
				t.Fatalf("not fount cpu resource info in metering ")
			}

			t.Log("metering calculate should be ok")
			metering, err = api.EnsureMeteringCalculate(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace, 90)
			if err != nil {
				t.Fatalf("metering calculate failer: %v,calculate: %v", err, metering)
			}
			t.Logf("metering:%+v", metering.Spec.Resources)
		})

		t.Run("metering create accountBalance should be ok", func(t *testing.T) {
			api.EnsurePodController(MeteringSystemNamespace, meteringv1.PodResourcePricePrefix)
			time.Sleep(time.Second * 2)
			baseapi.EnsureNamespace(TestNamespace)
			api.EnsurePod(TestNamespace, PodName)
			time.Sleep(time.Second * 2)

			t.Log("ensure accountBalance is created")
			metering, err := api.GetMetering(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace)
			if err != nil {
				t.Fatalf("fail get metering: %v", err)
			}

			accountBalance, err := api.EnsureAccountBalanceCreate(MeteringSystemNamespace, fmt.Sprintf("%s-%s-%v", accountv1.AccountBalancePrefix, metering.Spec.Owner, 1), 90)
			if err != nil {
				t.Log("ensure accountBalance is created again")
				metering, err = api.GetMetering(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace)
				accountBalance, err = api.EnsureAccountBalanceCreate(MeteringSystemNamespace, fmt.Sprintf("%s-%s-%v", accountv1.AccountBalancePrefix, metering.Spec.Owner, 1), 90)
				if err != nil {
					t.Fatalf("failed to create accountBalance: %v", err)
				}
			}

			t.Log(accountBalance.Spec)
			if accountBalance.Spec.Amount == 0 || accountBalance.Spec.Owner == "" {
				t.Fatalf("failed to create accountBalance: %v", accountBalance)
			}

			time.Sleep(2 * time.Second)
			account, err := api.GetAccount(AccountNamespace, metering.Spec.Owner)
			if err != nil {
				t.Fatalf("fail get account: %v", err)
			}

			if account.Status.DeductionBalance == 0 {
				t.Fatalf("account fail deduction: %v", err)
			}

			defer t.Log(fmt.Sprintf("account:%v", account))
		})

		t.Run("metering calculate infra should be ok", func(t *testing.T) {
			t.Log("ensure infra is created")
			baseapi.EnsureNamespace(TestNamespace)
			baseapi.CreateCRD(TestNamespace, InfraName, api.InfraYaml)
			err := api.EnsureInfra(TestNamespace, InfraName, 12)
			//if err != nil {
			//	t.Fatalf(err.Error())
			//}
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
	//time.Sleep(200 * time.Second)
	execout, err := baseapi.Exec("sudo -u root kubectl get pod -n metering-system|grep metering |awk '{print $1}' |xargs kubectl logs -n metering-system")
	log.Println(execout)
	if err != nil {
		log.Println(err)
	}
	execout, err = baseapi.Exec("sudo -u root kubectl get pod -n account-system|grep account |awk '{print $1}' |xargs kubectl logs -n account-system")
	log.Println(execout)
	if err != nil {
		log.Println(err)
	}
	execout, err = baseapi.Exec("sudo -u root kubectl get accountbalance -A")
	log.Println(execout)
	if err != nil {
		log.Println(err)
	}
	err = baseapi.DeleteNamespace(TestNamespace)
	if err != nil {
		log.Println(err)
	}

	err = api.DeleteMetering(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace)
	if err != nil {
		log.Println(err)
	}

	err = baseapi.DeleteCRD(MeteringSystemNamespace, meteringv1.GetExtensionResourcePriceName(meteringv1.PodResourcePricePrefix), api.ExtensionResourcePriceYaml)
	if err != nil {
		log.Println(err)
	}

	err = api.DeletePodController(MeteringSystemNamespace, meteringv1.PodResourcePricePrefix)
	if err != nil {
		log.Println(err)
	}

	err = api.DeletePod(TestNamespace, PodName)
	if err != nil {
		log.Println(err)
	}

	if err = api.DeleteExtensionResourcePrice(MeteringSystemNamespace, meteringv1.PodResourcePricePrefix); err != nil {
		log.Println(err)
	}

	if err = baseapi.DeleteCRD(AccountNamespace, DefaultOwner, api.AccountYaml); err != nil {
		log.Println(err)
	}

	if err = baseapi.DeleteCRD(TestNamespace, InfraName, api.InfraYaml); err != nil {
		log.Println(err)
	}

	for i := 0; i <= 5; i++ {
		if err = baseapi.DeleteCRD(MeteringSystemNamespace, controllers.GetResourceName(TestNamespace, PodName, containerName, "cpu", int64(i)), api.ResourceYaml); err != nil {
			log.Println(err)
		}

		if err = baseapi.DeleteCRD(MeteringSystemNamespace, controllers.GetResourceName(TestNamespace, PodName, "", "storage", int64(i)), api.ResourceYaml); err != nil {
			log.Println(err)
		}

		if err = baseapi.DeleteCRD(MeteringSystemNamespace, fmt.Sprintf("%s-%s-%v", accountv1.AccountBalancePrefix, DefaultOwner, i), api.AccountBalanceYaml); err != nil {
			log.Println(err)
		}
	}
}
