package controller

import (
	"context"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"

	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// pre-defined user info in kubernetes

const (
	DefaultAdminUserName = "admin"
)

func newKubernetesClient() (client.Client, error) {
	c, err := client.New(ctrl.GetConfigOrDie(), client.Options{})
	if err != nil {
		return nil, err
	}
	return c, nil
}

func PresetAdminUser(ctx context.Context) error {
	c, err := newKubernetesClient()
	if err != nil {
		return err
	}
	_, err = ctrl.CreateOrUpdate(ctx, c, &userv1.User{ObjectMeta: ctrl.ObjectMeta{Name: DefaultAdminUserName}}, func() error { return nil })
	if err != nil {
		return err
	}
	return nil
}
