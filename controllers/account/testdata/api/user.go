package api

import (
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
)

const userYaml = `
apiVersion: user.sealos.io/v1
kind: User
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
  csrExpirationSeconds: 1000000000
`

func GetUser(namespace string, name string) (*userv1.User, error) {
	gvr := userv1.GroupVersion.WithResource("users")
	var user userv1.User
	if err := baseapi.GetObject(namespace, name, gvr, &user); err != nil {
		return nil, err
	}
	return &user, nil
}

func EnsureUser(namespace, name string) {
	gvr := userv1.GroupVersion.WithResource("users")
	var user userv1.User
	if err := baseapi.GetObject(namespace, name, gvr, &user); err != nil {
		CreateUser(namespace, name)
		return
	}
}

func CreateUser(namespace string, name string) {
	baseapi.MustKubeApplyFromTemplate(userYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
}

func DeleteUser(namespace string, name string) error {
	_, err := baseapi.KubeDeleteFromTemplate(userYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}
