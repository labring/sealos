package controller

import (
	"context"
	"time"

	"github.com/labring/sealos/controllers/job/init/internal/util/common"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"

	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// pre-defined user info in kubernetes

const (
	DefaultAdminUserName = "admin"
)

var (
	scheme = runtime.NewScheme()
)

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))
	utilruntime.Must(userv1.AddToScheme(scheme))
}

func newKubernetesClient() (client.Client, error) {
	c, err := client.New(ctrl.GetConfigOrDie(), client.Options{Scheme: scheme})
	if err != nil {
		return nil, err
	}
	return c, nil
}

func newAdminUser(ctx context.Context, c client.Client) (*userv1.User, error) {
	var u = &userv1.User{}
	u.SetName(DefaultAdminUserName)
	err := c.Get(ctx, client.ObjectKeyFromObject(u), u)
	if err != nil {
		if client.IgnoreNotFound(err) == nil {
			// admin user exists
			return u, nil
		}
		return nil, err
	}
	// admin user not exists
	u.SetLabels(map[string]string{"uid": common.AdminUID(), "updateTime": time.Now().Format(time.RFC3339)})
	return u, nil
}

func PresetAdminUser(ctx context.Context) error {
	c, err := newKubernetesClient()
	if err != nil {
		return err
	}
	adminUser, err := newAdminUser(ctx, c)
	if err != nil {
		return err
	}
	_, err = ctrl.CreateOrUpdate(ctx, c, adminUser, func() error {
		return nil
	})
	return err
}
