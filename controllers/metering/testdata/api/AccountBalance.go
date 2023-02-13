package api

import (
	"fmt"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
	"time"
)

const AccountBalanceYaml = `
apiVersion: account.sealos.io/v1
kind: AccountBalance
metadata:
  name: ${name}
  namespace: ${namespace}
`

func GetAccountBalance(namespace string, name string) (*accountv1.AccountBalance, error) {
	gvr := accountv1.GroupVersion.WithResource("accountbalances")
	var accountbalance accountv1.AccountBalance
	if err := baseapi.GetObject(namespace, name, gvr, &accountbalance); err != nil {
		return nil, err
	}
	return &accountbalance, nil
}

func EnsureAccountBalanceCreate(namespace string, name string, times int) (*accountv1.AccountBalance, error) {
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
	return nil, fmt.Errorf("accountbalance get fail")
}
