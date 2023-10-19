package controller

import (
	"context"
	"fmt"
	"os"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// pre-defined user info in kubernetes

const (
	DefaultUser = "admin"
)

func NewKubernetesClient() (client.Client, error) {
	c, err := client.New(ctrl.GetConfigOrDie(), client.Options{})
	if err != nil {
		return nil, err
	}
	return c, nil
}

// TODO fix this
func NewUser(ctx context.Context) error {
	clt, err := NewKubernetesClient()
	if err != nil {
		fmt.Printf("Error creating Kubernetes client: %v\n", err)
		os.Exit(1)
	}
	if err := clt.Create(ctx, &userv1.User{
		ObjectMeta: ctrl.ObjectMeta{
			Name: DefaultUser,
		},
	}); err != nil {
		return err
	}
	return nil
}
