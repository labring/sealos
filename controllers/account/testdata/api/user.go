package api

import (
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const UserYaml = `
apiVersion: user.sealos.io/v1
kind: User
metadata:
  name: ${name}
	annotations:
		user.sealos.io/display-name: ${name}
spec:
	csrExpirationSeconds: 1000000000
`

func GetUser(name string) (*userv1.User, error) {
	gvr := userv1.GroupVersion.WithResource("users")
	var user userv1.User
	if err := baseapi.GetObject("", name, gvr, &user); err != nil {
		return nil, err
	}
	return &user, nil
}
