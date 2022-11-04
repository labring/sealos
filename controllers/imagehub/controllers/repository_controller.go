/*
Copyright 2022.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controllers

import (
	"context"
	"fmt"
	"reflect"
	rt "runtime"

	"github.com/go-logr/logr"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"

	imagehubv1 "github.com/labring/sealos/controllers/imagehub/api/v1"
)

// RepositoryReconciler reconciles a Reposiotry object
type RepositoryReconciler struct {
	client.Client
	logr.Logger
	Scheme *runtime.Scheme

	DataBase
}

//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=images,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=repositories,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=organizations,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=repositories/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=repositories/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Repository object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.13.0/pkg/reconcile
func (r *RepositoryReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger = log.FromContext(ctx)
	r.Logger.Info("enter reconcile", "name: ", req.Name, "namespace: ", req.Namespace)

	// get repo
	var repo imagehubv1.Repository
	if err := r.Get(ctx, req.NamespacedName, &repo); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// start a pipeline
	r.Logger.Info("start repo pipeline", "repo name:", repo.Spec.Name)
	pipeline := []func(context.Context, *imagehubv1.Repository) error{
		r.init,
		//r.spec2Status,
		r.syncOrg,
	}
	for _, fn := range pipeline {
		err := fn(ctx, &repo)
		if err != nil {
			r.Logger.Info("error in pipeline", "error func:", rt.FuncForPC(reflect.ValueOf(fn).Pointer()).Name())
			return ctrl.Result{}, err
		}
	}
	return ctrl.Result{}, nil
}

// init check spec info input
func (r *RepositoryReconciler) init(ctx context.Context, repo *imagehubv1.Repository) error {
	if !repo.Spec.Name.IsLegal() {
		r.Logger.Info("error in init", "name: ", repo.Spec.Name)
		return fmt.Errorf("image name illegal")
	}

	r.DataBase = DataBase{
		Client: r.Client,
		Logger: r.Logger,
	}
	return nil
}

// spec2Status todo use spec gen status
//func (r *RepositoryReconciler) spec2Status(ctx context.Context, repo *imagehubv1.Repository) error {
//	return nil
//}

// todo sync repo to org
func (r *RepositoryReconciler) syncOrg(ctx context.Context, repo *imagehubv1.Repository) error {
	org := &imagehubv1.Organization{ObjectMeta: metav1.ObjectMeta{Name: repo.Spec.Name.GetOrg(), Namespace: repo.Namespace}}
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, org, func() error {
		// create org
		if org.CreationTimestamp.IsZero() {
			org.Spec = imagehubv1.OrganizationSpec{
				Name: repo.Spec.Name.GetOrg(),
			}
		}
		// update org
		checkExist := func(org []imagehubv1.RepoName, repo imagehubv1.RepoName) bool {
			for _, name := range org {
				if name == repo {
					return false
				}
			}
			return true
		}
		if checkExist(org.Spec.Repos, repo.Spec.Name) {
			org.Spec.Repos = append(org.Spec.Repos, repo.Spec.Name)
		}
		return nil
	}); err != nil {
		return fmt.Errorf("sync org failed: %v", err)
	}
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *RepositoryReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&imagehubv1.Repository{}).
		Complete(r)
}
