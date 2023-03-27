package cache

import (
	"context"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	corev1 "k8s.io/api/core/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func SetupCache(mgr ctrl.Manager) error {
	account := &accountv1.Account{}
	accountNameFunc := func(obj client.Object) []string {
		return []string{obj.(*accountv1.Account).Name}
	}

	ns := &corev1.Namespace{}
	nsNameFunc := func(obj client.Object) []string {
		return []string{obj.(*corev1.Namespace).Name}
	}

	if err := mgr.GetFieldIndexer().IndexField(context.TODO(), ns, "name", nsNameFunc); err != nil {
		return err
	}
	return mgr.GetFieldIndexer().IndexField(context.TODO(), account, "name", accountNameFunc)
}
