package api

import (
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const DebtYaml = `
apiVersion: account.sealos.io/v1
kind: Debt
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
  userName: metering-test
`

func GetDebt(namespace string, name string) (*accountv1.Debt, error) {
	gvr := accountv1.GroupVersion.WithResource("debts")
	var debt accountv1.Debt
	if err := baseapi.GetObject(namespace, name, gvr, &debt); err != nil {
		return nil, err
	}
	return &debt, nil
}
