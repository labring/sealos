package e2e

import (
	"github.com/labring/sealos/controllers/account/controllers"
	api2 "github.com/labring/sealos/controllers/account/testdata/api"
	baseapi "github.com/labring/sealos/test/testdata/api"
	"os"
	"time"

	"testing"
)

var AccountSystemNamespace string

func init() {
	AccountSystemNamespace = os.Getenv("ACCOUNT_NAMESPACE")
	if AccountSystemNamespace == "" {
		AccountSystemNamespace = controllers.DEFAULTACCOUNTNAMESPACE
	}
	baseapi.EnsureNamespace(AccountSystemNamespace)
}

const (
	UserName = "test-user"
)

func TestAccount(t *testing.T) {
	t.Run("accout should be ok", func(t *testing.T) {
		t.Run("account create should be ok", func(t *testing.T) {
			t.Log("create user ")
			api2.CreateUser("", UserName)

			time.Sleep(2 * time.Second)
			t.Log("check account is exist")
			_, err := api2.GetAccount(AccountSystemNamespace, UserName)
			if err != nil {
				t.Fatalf(err.Error())
			}
		})

		t.Run("account delete should be ok", func(t *testing.T) {
			api2.EnsureUser("", UserName)
			time.Sleep(time.Second * 2)

			t.Log("delete user")
			err := api2.DeleteUser("", UserName)
			if err != nil {
				t.Fatalf(err.Error())
			}

			t.Log("check account is not exist")
			time.Sleep(time.Second * 2)
			_, err = api2.GetAccount(AccountSystemNamespace, UserName)
			if err == nil {
				t.Fatalf("account is exist")
			}
		})
	})

	t.Cleanup(func() {
		t.Log("delete account")
		err := api2.DeleteAccount(AccountSystemNamespace, UserName)
		if err != nil {
			t.Log(err)
		}

		t.Log("delete user")
		err = api2.DeleteUser("", UserName)
		if err != nil {
			t.Log(err)
		}
	})
}
