package e2e

import (
	accountapi "github.com/labring/sealos/controllers/account/testdata/api"
	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	"github.com/labring/sealos/controllers/metering/testdata/api"
	baseapi "github.com/labring/sealos/test/testdata/api"
	"log"
	"testing"
	"time"
)

const (
	AccountNamespace        = "sealos-system"
	TestNamespace           = "ns-metering-test"
	DefaultOwner            = "metering-test"
	PodName                 = "nginx-test"
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

		// before you run this test ,you should set SMALL_BLOCK_WAIT_SECOND = 1 and MEDIUM_BLOCK_WAIT_SECOND = 1 and restart the account-manager pod
		t.Run("debt delete all resource should be ok", func(t *testing.T) {
			api.CreatePodController(MeteringSystemNamespace, meteringv1.PodResourcePricePrefix)
			baseapi.EnsureNamespace(TestNamespace)
			time.Sleep(3 * time.Second)
			baseapi.CreateCRD(TestNamespace, PodName, api.PodYaml)
			baseapi.CreateCRD(AccountNamespace, DefaultOwner, api.AccountYaml)

			// should create deployment、daemonset replicaset
			time.Sleep(3 * time.Second)
			err := accountapi.RechargeAccount(DefaultOwner, AccountNamespace, -1000)
			if err != nil {
				t.Fatalf(err.Error())
			}
			_, err = api.GetAccount(AccountNamespace, DefaultOwner)
			if err != nil {
				t.Fatalf(err.Error())
			}

			time.Sleep(time.Minute * 2)

			t.Log("pod should be deleted")
			pod, err := api.GetPod(TestNamespace, PodName)
			if err == nil {
				t.Fatalf("pod should be deleted, but now is %+v", pod)
			}
		})
	})

	t.Cleanup(clear)
}

func clear() {
	account, err := api.GetAccount(AccountNamespace, DefaultOwner)
	if err != nil {
		log.Println(err)
	}
	log.Printf("%+v", account)
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

}
