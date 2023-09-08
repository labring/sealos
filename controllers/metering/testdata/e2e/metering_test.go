// Copyright © 2023 sealos.
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

package e2e

//import (
//	"fmt"
//	"log"
//	"os"
//	"testing"
//	"time"
//
//	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
//	meteringcommonv1 "github.com/labring/sealos/controllers/common/metering/api/v1"
//	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
//	"github.com/labring/sealos/controllers/metering/controllers"
//	"github.com/labring/sealos/controllers/metering/testdata/api"
//	baseapi "github.com/labring/sealos/test/testdata/api"
//)
//
//const (
//	TestNamespace    = "ns-metering-test"
//	PodName          = "nginx-test"
//	DefaultOwner     = "metering-test"
//	AccountNamespace = "sealos-system"
//	InfraName        = "yyj-test-1"
//	containerName    = "nginx"
//)
//
//var MeteringSystemNamespace string
//
//func init() {
//	MeteringSystemNamespace = os.Getenv(meteringv1.METERINGNAMESPACEENV)
//	if MeteringSystemNamespace == "" {
//		MeteringSystemNamespace = "metering-system"
//	}
//	baseapi.EnsureNamespace(MeteringSystemNamespace)
//	// first export METERING_INTERVAL=1，then run test
//	fmt.Println("METERING_INTERVAL:", os.Getenv("METERING_INTERVAL"))
//}
//
//func TestPressure(t *testing.T) {
//	t.Run("running many pod should be calculate right and ok", func(t *testing.T) {
//		baseapi.EnsureNamespace(TestNamespace)
//		time.Sleep(2 * time.Second)
//		nums := 10
//		t.Log(fmt.Sprintf("create %v pod", nums))
//		for i := 0; i < nums; i++ {
//			api.EnsurePod(TestNamespace, fmt.Sprintf("%s-%v", PodName, i))
//		}
//		time.Sleep(time.Second * 30)
//		metering, err := api.GetMetering(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace)
//		if err != nil {
//			t.Fatalf("fail get metering: %v", err)
//		}
//		baseapi.CreateCRD(AccountNamespace, metering.Spec.Owner, api.AccountYaml)
//		time.Sleep(time.Second * 5)
//		api.EnsurePodController(MeteringSystemNamespace, meteringv1.PodResourcePricePrefix)
//		time.Sleep(time.Second * 10)
//		for i := 0; i < 30; i++ {
//			time.Sleep(time.Minute)
//			account, err := api.GetAccount(AccountNamespace, metering.Spec.Owner)
//			if err != nil {
//				t.Fatalf("fail get account: %v", err)
//			}
//			t.Log(account.Status)
//		}
//	})
//	t.Cleanup(clear)
//}
//
//func TestMetering(t *testing.T) {
//	t.Run("metering should be ok", func(t *testing.T) {
//		t.Run("metering should be created when create a user ns", func(t *testing.T) {
//			t.Log("create metering  ")
//			baseapi.EnsureNamespace(TestNamespace)
//			time.Sleep(time.Second * 3)
//
//			t.Log("ensure metering is created")
//			_, err := api.GetMetering(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace)
//			if err != nil {
//				t.Fatalf("failed to get metering: %v", err)
//			}
//
//			t.Log("ensure metering is delete after delete namespace")
//			err = baseapi.DeleteNamespace(TestNamespace)
//			if err != nil {
//				t.Fatalf("failed to delete namespace: %v", err)
//			}
//			time.Sleep(time.Second)
//			_, err = api.GetMetering(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace)
//			if err == nil {
//				t.Fatalf("success get metering: %v", err)
//			}
//		})
//
//		t.Run("pod controller should be ok", func(t *testing.T) {
//			time.Sleep(5 * time.Second)
//			baseapi.EnsureNamespace(TestNamespace)
//			time.Sleep(20 * time.Second)
//			t.Log("creat pod controller")
//			api.CreatePodController(MeteringSystemNamespace, meteringv1.PodResourcePricePrefix)
//
//			time.Sleep(5 * time.Second)
//			t.Log("ensure extension resource is created")
//			podExtensionResourcePrice, err := api.GetExtensionResourcePrice(MeteringSystemNamespace, meteringcommonv1.GetExtensionResourcePriceName(meteringv1.PodResourcePricePrefix))
//			if err != nil {
//				t.Fatalf("failed to get extension resource: %v", err)
//			}
//
//			if _, ok := podExtensionResourcePrice.Spec.Resources["cpu"]; !ok {
//				t.Fatalf("failed to get cpu price,resource info:%+v", podExtensionResourcePrice.Spec.Resources)
//			}
//			if _, ok := podExtensionResourcePrice.Spec.Resources["storage"]; !ok {
//				t.Fatalf("failed to get storage price,resource info:%+v", podExtensionResourcePrice.Spec.Resources)
//			}
//
//			t.Log("create a nginx pod")
//			api.MustCreatPod(TestNamespace, PodName)
//
//			t.Log("ensure resource CR is created")
//			resource, err := api.EnsureResourceCreate(MeteringSystemNamespace, controllers.GetResourceName(TestNamespace, PodName, 1), 90)
//			if err != nil {
//				resource, err = api.EnsureResourceCreate(MeteringSystemNamespace, controllers.GetResourceName(TestNamespace, PodName, 2), 90)
//				if err != nil {
//					t.Fatalf(err.Error())
//				}
//			}
//
//			if _, ok := resource.Spec.Resources["cpu"]; !ok {
//				t.Fatalf("not fount cpu resource used ")
//			}
//			if resource.Spec.Resources["cpu"].Used.Value() != 1 {
//				t.Fatalf("not fount cpu resource used %v", resource.Spec.Resources["cpu"].Used.Value())
//			}
//			t.Log(resource)
//		})
//
//		t.Run("metering used update and calculate should be ok", func(t *testing.T) {
//			api.EnsurePodController(MeteringSystemNamespace, meteringv1.PodResourcePricePrefix)
//			time.Sleep(time.Second * 10)
//			baseapi.EnsureNamespace(TestNamespace)
//			api.EnsurePod(TestNamespace, PodName)
//			time.Sleep(time.Second * 5)
//
//			metering, err := api.GetMetering(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace)
//			if err != nil {
//				t.Fatalf("fail get metering: %v", err)
//			}
//
//			t.Log("metering calculate should be ok")
//			metering, err = api.EnsureMeteringCalculate(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace, 90)
//			if err != nil {
//				t.Fatalf("metering calculate failer: %v,calculate: %v", err, metering)
//			}
//			t.Logf("metering:%+v", metering.Status)
//		})
//
//		t.Run("metering create accountBalance should be ok", func(t *testing.T) {
//			baseapi.EnsureNamespace(TestNamespace)
//			api.EnsurePod(TestNamespace, PodName)
//			time.Sleep(time.Second * 20)
//			api.EnsurePodController(MeteringSystemNamespace, meteringv1.PodResourcePricePrefix)
//			time.Sleep(time.Second * 2)
//			t.Log("ensure metering used is update")
//			metering, err := api.GetMetering(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace)
//			if err != nil {
//				t.Fatalf("fail get metering: %v", err)
//			}
//			t.Log(metering.Spec)
//			t.Log("ensure accountBalance is created")
//			accountBalance, err := api.EnsureAccountBalanceCreate(MeteringSystemNamespace, fmt.Sprintf("%s-%s-%v", accountv1.AccountBalancePrefix, metering.Spec.Owner, 1), 90)
//			if err != nil {
//				t.Log("ensure accountBalance is created again")
//				metering, err = api.GetMetering(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace)
//				accountBalance, err = api.EnsureAccountBalanceCreate(MeteringSystemNamespace, fmt.Sprintf("%s-%s-%v", accountv1.AccountBalancePrefix, metering.Spec.Owner, 2), 90)
//				if err != nil {
//					t.Fatalf("failed to create accountBalance: %v", err)
//				}
//			}
//
//			t.Log(accountBalance.Spec)
//			if accountBalance.Spec.Amount == 0 || accountBalance.Spec.Owner == "" {
//				t.Fatalf("failed to create accountBalance: %v", accountBalance)
//			}
//
//			if accountBalance.Spec.ResourceInfoList == nil {
//				t.Fatalf("failed to add resoureinfo list: accoutnbalance spec:%v", accountBalance.Spec)
//			}
//			time.Sleep(2 * time.Second)
//			account, err := api.GetAccount(AccountNamespace, metering.Spec.Owner)
//			if err != nil {
//				t.Fatalf("fail get account: %v", err)
//			}
//
//			if account.Status.DeductionBalance == 0 {
//				t.Fatalf("account fail deduction: %v", err)
//			}
//
//			defer t.Log(fmt.Sprintf("account:%v", account))
//		})
//	})
//	t.Cleanup(clear)
//}
//
//func clear() {
//	execout, err := baseapi.Exec("kubectl get accountbalance -A ")
//	log.Println(execout)
//	if err != nil {
//		log.Println(err)
//	}
//	execout, err = baseapi.Exec("kubectl get pod -n metering-system|grep metering |awk '{print $1}' |xargs kubectl logs -n metering-system")
//	log.Println(execout)
//	if err != nil {
//		log.Println(err)
//	}
//	execout, err = baseapi.Exec("kubectl get pod -n account-system|grep account |awk '{print $1}' |xargs kubectl logs -n account-system")
//	log.Println(execout)
//	if err != nil {
//		log.Println(err)
//	}
//	execout, err = baseapi.Exec("kubectl get resource -A -oyaml")
//	log.Println(execout)
//	if err != nil {
//		log.Println(err)
//	}
//	execout, err = baseapi.Exec("kubectl get accountbalance -A -oyaml")
//	log.Println(execout)
//	if err != nil {
//		log.Println(err)
//	}
//	err = api.DeletePod(TestNamespace, PodName)
//	if err != nil {
//		log.Println(err)
//	}
//
//	err = baseapi.DeleteNamespace(TestNamespace)
//	if err != nil {
//		log.Println(err)
//	}
//
//	err = api.DeleteMetering(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace)
//	if err != nil {
//		log.Println(err)
//	}
//
//	err = baseapi.DeleteCRD(MeteringSystemNamespace, meteringcommonv1.GetExtensionResourcePriceName(meteringv1.PodResourcePricePrefix), api.ExtensionResourcePriceYaml)
//	if err != nil {
//		log.Println(err)
//	}
//
//	err = api.DeletePodController(MeteringSystemNamespace, meteringv1.PodResourcePricePrefix)
//	if err != nil {
//		log.Println(err)
//	}
//
//	if err = api.DeleteExtensionResourcePrice(MeteringSystemNamespace, meteringv1.PodResourcePricePrefix); err != nil {
//		log.Println(err)
//	}
//
//	if err = baseapi.DeleteCRD(AccountNamespace, DefaultOwner, api.AccountYaml); err != nil {
//		log.Println(err)
//	}
//	execout, err = baseapi.Exec("kubectl get resource -A| awk '{print $2}' | xargs kubectl delete resource -n metering-system")
//	log.Println(execout)
//	if err != nil {
//		log.Println(err)
//	}
//
//	execout, err = baseapi.Exec("kubectl get accountbalance -A | awk '{print $2}' | xargs kubectl delete accountbalance -n metering-system")
//	log.Println(execout)
//	if err != nil {
//		log.Println(err)
//	}
//
//}
