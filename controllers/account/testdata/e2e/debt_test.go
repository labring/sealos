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

import (
	"log"
	"testing"
	"time"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/account/controllers"
	accountapi "github.com/labring/sealos/controllers/account/testdata/api"
	meteringcommonv1 "github.com/labring/sealos/controllers/common/metering/api/v1"
	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	"github.com/labring/sealos/controllers/metering/testdata/api"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const (
	AccountNamespace        = "sealos-system"
	AccountSystemNamespace  = "account-system"
	TestNamespace           = "ns-metering-test"
	DefaultOwner            = "metering-test"
	PodName                 = "nginx-test"
	DeploymentName          = "nginx-deployment-test"
	MeteringSystemNamespace = "metering-system"
)

func init() {

}

func TestDebt(t *testing.T) {
	t.Run("debt should be ok", func(t *testing.T) {
		// this test need user kubeconfig
		//t.Run("debt webhook should be ok", func(t *testing.T) {
		//	baseapi.EnsureNamespace(TestNamespace)
		//	baseapi.CreateCRD(AccountNamespace, DefaultOwner, api.AccountYaml)
		//	time.Sleep(3 * time.Second)
		//
		//	err := accountapi.RechargeAccount(DefaultOwner, AccountNamespace, -1000)
		//	if err != nil {
		//		t.Fatalf(err.Error())
		//	}
		//	account, err := api.GetAccount(AccountNamespace, DefaultOwner)
		//	if err != nil {
		//		t.Fatalf(err.Error())
		//	}
		//	if account.Status.Balance >= 0 {
		//		t.Fatalf("accout balance should not >= 0，now is %d", account.Status.Balance)
		//	}
		//	t.Log(account)
		//
		//	time.Sleep(3 * time.Second)
		//	out, err := api.CreatePod(TestNamespace, PodName)
		//	t.Log(out, err)
		//	if err == nil {
		//		t.Fatalf("create pod should be failed, because user in arrears")
		//	}
		//
		//	err = accountapi.RechargeAccount(DefaultOwner, AccountNamespace, 2000)
		//	if err != nil {
		//		t.Fatalf(err.Error())
		//	}
		//
		//	out, err = api.CreatePod(TestNamespace, PodName)
		//	t.Log(out, err)
		//	if err != nil {
		//		t.Fatalf("create pod should be ok, because user are not in arrears")
		//	}
		//
		//})

		// before you run this test ,you should set SMALL_BLOCK_WAIT_SECOND = 1 and restart the account-manager pod
		t.Run("debt change status should be ok", func(t *testing.T) {
			baseapi.EnsureNamespace(AccountNamespace)
			baseapi.CreateCRD(AccountNamespace, DefaultOwner, api.AccountYaml)

			time.Sleep(5 * time.Second)
			if _, err := accountapi.GetDebt(AccountSystemNamespace, controllers.GetDebtName(DefaultOwner)); err != nil {
				t.Fatalf("not get： " + err.Error())
			}

			t.Log("add account balance")
			if err := accountapi.RechargeAccount(DefaultOwner, AccountNamespace, 10000); err != nil {
				t.Fatalf(err.Error())
			}

			t.Log("debt status should be normal")
			time.Sleep(5 * time.Second)
			debt, err := accountapi.GetDebt(AccountSystemNamespace, controllers.GetDebtName(DefaultOwner))
			if err != nil {
				t.Fatalf("not get debt" + err.Error())
			}

			if debt.Status.AccountDebtStatus != accountv1.DebtStatusNormal {
				t.Fatalf("debt status should be normal, but now is " + string(debt.Status.AccountDebtStatus))
			}

			if err := accountapi.RechargeAccount(DefaultOwner, AccountNamespace, -200000); err != nil {
				t.Fatalf(err.Error())
			}

			time.Sleep(time.Minute)
			t.Log("debt status should be small or large")
			debt, err = accountapi.GetDebt(AccountSystemNamespace, controllers.GetDebtName(DefaultOwner))
			if err != nil {
				t.Fatalf("not get debt" + err.Error())
			}

			if debt.Status.AccountDebtStatus != accountv1.DebtStatusSmall && debt.Status.AccountDebtStatus != accountv1.DebtStatusLarge {
				t.Fatalf("debt status should be samll or large, but now is " + string(debt.Status.AccountDebtStatus))
			}

			err = baseapi.DeleteCRD(AccountSystemNamespace, controllers.GetDebtName(DefaultOwner), accountapi.DebtYaml)
			if err != nil {
				log.Println(err)
			}

			account, err := api.GetAccount(AccountNamespace, DefaultOwner)
			if err == nil {
				// make account balance become 0
				if err := accountapi.RechargeAccount(DefaultOwner, AccountNamespace, -account.Status.Balance); err != nil {
					t.Fatalf(err.Error())
				}
			}
		})

		t.Run("debt delete all resource should be ok", func(t *testing.T) {
			api.CreatePodController(MeteringSystemNamespace, meteringv1.PodResourcePricePrefix)
			baseapi.EnsureNamespace(TestNamespace)
			baseapi.EnsureNamespace(AccountNamespace)
			time.Sleep(10 * time.Second)

			podExtensionResourcePrice, err := api.GetExtensionResourcePrice(MeteringSystemNamespace, meteringcommonv1.GetExtensionResourcePriceName(meteringv1.PodResourcePricePrefix))
			if err != nil {
				t.Fatalf("failed to get extension resource: %v", err)
			}
			t.Log(podExtensionResourcePrice.Spec)
			// should create daemonset replicaset to test
			baseapi.CreateCRD(TestNamespace, PodName, api.PodYaml)
			baseapi.CreateCRD(AccountNamespace, DefaultOwner, api.AccountYaml)
			baseapi.CreateCRD(TestNamespace, DeploymentName, accountapi.DeploymentYaml)

			time.Sleep(20 * time.Second)
			err = accountapi.RechargeAccount(DefaultOwner, AccountNamespace, -100000)
			if err != nil {
				t.Fatalf(err.Error())
			}
			_, err = api.GetAccount(AccountNamespace, DefaultOwner)
			if err != nil {
				t.Fatalf(err.Error())
			}
			time.Sleep(10 * time.Second)
			debt, err := accountapi.GetDebt(AccountSystemNamespace, controllers.GetDebtName(DefaultOwner))
			if err != nil {
				t.Fatalf("get debt error %v", err.Error())
			}
			t.Log(debt)
			t.Log("wait some time and pod should be deleted")
			time.Sleep(time.Second * 60)
			pod, err := api.GetPod(TestNamespace, PodName)
			if err == nil {
				t.Fatalf("pod should be deleted, but now is %+v", pod.Name)
			}
			deployment, err := accountapi.GetDeployment(TestNamespace, DeploymentName)
			if err == nil {
				t.Fatalf("deployment should be deleted, but now is %+v", deployment.Name)
			}

		})
	})

	t.Cleanup(clear)
}

func clear() {
	_, err := api.GetAccount(AccountNamespace, DefaultOwner)
	if err != nil {
		log.Println(err)
	}
	if err := baseapi.DeleteCRD(AccountNamespace, DefaultOwner, api.AccountYaml); err != nil {
		log.Println(err)
	}

	if err := baseapi.DeleteCRD(TestNamespace, PodName, api.PodYaml); err != nil {
		log.Println(err)
	}
	err = baseapi.DeleteNamespace(TestNamespace)
	if err != nil {
		log.Println(err)
	}

	err = baseapi.DeleteCRD(AccountSystemNamespace, controllers.GetDebtName(DefaultOwner), accountapi.DebtYaml)
	if err != nil {
		log.Println(err)
	}

	err = baseapi.DeleteCRD(MeteringSystemNamespace, meteringv1.PodResourcePricePrefix, api.PodControllerYaml)
	if err != nil {
		log.Println(err)
	}

	err = baseapi.DeleteCRD(MeteringSystemNamespace, meteringcommonv1.GetExtensionResourcePriceName(meteringv1.PodResourcePricePrefix), api.ExtensionResourcePriceYaml)
	if err != nil {
		log.Println(err)
	}

	execout, err := baseapi.Exec("kubectl get resource -A| awk '{print $2}' | xargs kubectl delete resource -n metering-system")
	log.Println(execout)
	if err != nil {
		log.Println(err)
	}

	execout, err = baseapi.Exec("kubectl get accountbalance -A | awk '{print $2}' | xargs kubectl delete accountbalance -n metering-system")
	log.Println(execout)
	if err != nil {
		log.Println(err)
	}
}
