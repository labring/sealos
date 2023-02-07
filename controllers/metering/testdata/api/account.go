package api

import (
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const AccountYaml = `
apiVersion: account.sealos.io/v1
kind: Account
metadata:
  name: ${name}
  namespace: ${namespace}


`

func GetAccount(namespace string, name string) (*accountv1.Account, error) {
	gvr := accountv1.GroupVersion.WithResource("accounts")
	var account accountv1.Account
	if err := baseapi.GetObject(namespace, name, gvr, &account); err != nil {
		return nil, err
	}
	return &account, nil
}
