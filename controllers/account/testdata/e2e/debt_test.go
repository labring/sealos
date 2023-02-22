package e2e

import (
	accountapi "github.com/labring/sealos/controllers/account/testdata/account"
	"github.com/labring/sealos/controllers/metering/testdata/api"
	baseapi "github.com/labring/sealos/test/testdata/api"
	"testing"
)

const (
	AccountNamespace = "sealos-system"
	TestNamespace    = "ns-metering-test"
	DefaultOwner     = "metering-test"
)

func init() {

}

func TestDebt(t *testing.T) {
	t.Run("debt should be ok", func(t *testing.T) {
		baseapi.CreateCRD(AccountNamespace, DefaultOwner, api.AccountYaml)
		err := accountapi.RechargeAccount(DefaultOwner, AccountNamespace, -1000)
		if err != nil {
			t.Fatalf(err.Error())
		}
		account, err := api.GetAccount(AccountNamespace, DefaultOwner)
		if err != nil {
			t.Fatalf(err.Error())
		}

		if account.Status.Balance >= 0 {
			t.Fatalf("accout balance should not > %d", account.Status.Balance)
		}

	})
	t.Cleanup(clear)
}

func clear() {

}
