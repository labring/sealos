package api

import (
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const AccountYaml = `
apiVersion: user.sealos.io/v1
kind: Account
metadata:
  name: ${name}
  namespace: ${namespace}


`

func GetAccount(namespace string, name string) (*userv1.Account, error) {
	gvr := userv1.GroupVersion.WithResource("accounts")
	var account userv1.Account
	if err := baseapi.GetObject(namespace, name, gvr, &account); err != nil {
		return nil, err
	}
	return &account, nil
}
