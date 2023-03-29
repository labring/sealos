package e2e

import (
	accountapi "github.com/labring/sealos/controllers/account/testdata/api"
	"github.com/labring/sealos/controllers/metering/testdata/api"
	baseapi "github.com/labring/sealos/test/testdata/api"
	"log"
	"testing"
	"time"
)

const (
	AccountNamespace = "sealos-system"
	TestNamespace    = "ns-metering-test"
	DefaultOwner     = "metering-test"
	PodName          = "nginx-test"
)

func init() {

}

func TestDebt(t *testing.T) {
	t.Run("debt should be ok", func(t *testing.T) {
		baseapi.EnsureNamespace(TestNamespace)
		baseapi.CreateCRD(AccountNamespace, DefaultOwner, api.AccountYaml)
		time.Sleep(3 * time.Second)

		err := accountapi.RechargeAccount(DefaultOwner, AccountNamespace, -1000)
		if err != nil {
			t.Fatalf(err.Error())
		}
		account, err := api.GetAccount(AccountNamespace, DefaultOwner)
		if err != nil {
			t.Fatalf(err.Error())
		}
		if account.Status.Balance >= 0 {
			t.Fatalf("accout balance should not >= 0，now is %d", account.Status.Balance)
		}
		t.Log(account)

		time.Sleep(3 * time.Second)
		out, err := api.CreatePod(TestNamespace, PodName)
		t.Log(out, err)
		if err == nil {
			t.Fatalf("create pod should be failed, because user in arrears")
		}

		err = accountapi.RechargeAccount(DefaultOwner, AccountNamespace, 2000)
		if err != nil {
			t.Fatalf(err.Error())
		}

		out, err = api.CreatePod(TestNamespace, PodName)
		t.Log(out, err)
		if err != nil {
			t.Fatalf("create pod should be ok, because user are not in arrears")
		}

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
