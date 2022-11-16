package api

import (
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const accountYaml = `
apiVersion: user.sealos.io/v1
kind: Account
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
`

func GetAccount(namespace string, name string) (*userv1.Account, error) {
	gvr := userv1.GroupVersion.WithResource("accounts")
	var account userv1.Account
	if err := baseapi.GetObject(namespace, name, gvr, &account); err != nil {
		return nil, err
	}
	return &account, nil
}

func DeleteAccount(namespace string, name string) error {
	_, err := baseapi.KubeDeleteFromTemplate(accountYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}
