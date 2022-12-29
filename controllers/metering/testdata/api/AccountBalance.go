package api

import (
	"fmt"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
	"time"
)

const AccountBalanceYaml = `
apiVersion: user.sealos.io/v1
kind: AccountBalance
metadata:
  name: ${name}
  namespace: ${namespace}
`

func GetAccountBalance(namespace string, name string) (*userv1.AccountBalance, error) {
	gvr := userv1.GroupVersion.WithResource("accountbalances")
	var accountbalance userv1.AccountBalance
	if err := baseapi.GetObject(namespace, name, gvr, &accountbalance); err != nil {
		return nil, err
	}
	return &accountbalance, nil
}

func EnsureAccountBalanceCreate(namespace string, name string, times int) (*userv1.AccountBalance, error) {
	time.Sleep(time.Second)
	for i := 1; i <= times; i++ {
		accountBalance, err := GetAccountBalance(namespace, name)
		if err != nil {
			time.Sleep(time.Second)
			continue
		}
		if accountBalance.Spec.Amount > 0 {
			return accountBalance, nil
		}
		time.Sleep(time.Second)
	}
	return nil, fmt.Errorf("accountbalance get faile")
}
