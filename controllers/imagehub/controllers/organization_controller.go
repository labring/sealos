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
	"errors"

	"github.com/go-logr/logr"
	"github.com/labring/endpoints-operator/library/controller"
	imagehubv1 "github.com/labring/sealos/controllers/imagehub/api/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

// OrganizationReconciler reconciles a Organization object
type OrganizationReconciler struct {
	client.Client
	logr.Logger
	Scheme    *runtime.Scheme
	Recorder  record.EventRecorder
	finalizer *controller.Finalizer
	db        *DataHelper
}

//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=images,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=repositories,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=organizations,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=organizations,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=clusterroles,verbs=create;delete;get;list;patch;update;watch
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=clusterrolebindings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=organizations/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=organizations/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Organization object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.13.0/pkg/reconcile
func (r *OrganizationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger.V(1).Info("start reconcile for Organization")
	org := &imagehubv1.Organization{}
	if err := r.Get(ctx, req.NamespacedName, org); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if ok, err := r.finalizer.RemoveFinalizer(ctx, org, r.doFinalizer); ok {
		return ctrl.Result{}, err
	}

	if ok, err := r.finalizer.AddFinalizer(ctx, org); ok {
		if err != nil {
			return ctrl.Result{}, err
		}
		return r.doReconcile(ctx, org)
	}
	return ctrl.Result{}, errors.New("reconcile error from Finalizer")
}

func (r *OrganizationReconciler) doReconcile(ctx context.Context, obj client.Object) (ctrl.Result, error) {
	r.Logger.V(1).Info("update reconcile controller org", "request", client.ObjectKeyFromObject(obj))
	org, ok := obj.(*imagehubv1.Organization)
	if !ok {
		return ctrl.Result{}, errors.New("obj convert Organization is error")
	}
	pipelines := []func(ctx context.Context, org *imagehubv1.Organization){
		r.syncClusterroleBinding,
	}
	for _, fn := range pipelines {
		fn(ctx, org)
	}

	// update status
	repoList, _ := r.db.getRepoListByOrgName(ctx, imagehubv1.OrgName(org.Spec.Name))
	var repoNames []imagehubv1.RepoName
	for _, i := range repoList.Items {
		repoNames = append(repoNames, i.Spec.Name)
	}
	org.Status.Repos = repoNames

	latestorg := &imagehubv1.Organization{}
	if err := r.Get(ctx, client.ObjectKeyFromObject(org), latestorg); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	latestorg.Status = org.Status
	if err := r.Status().Update(ctx, latestorg); err != nil {
		r.Logger.Error(err, "error in org update status", "org: ", org)
		return ctrl.Result{Requeue: true}, err
	}
	return ctrl.Result{}, nil
}

func (r *OrganizationReconciler) syncClusterroleBinding(ctx context.Context, org *imagehubv1.Organization) {
	orgMgrRole := &rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{
			Name: "OrgManagerClusterRole-" + org.Name,
		},
	}
	// add orgMgrRule
	orgMgrRule := rbacv1.PolicyRule{
		Verbs:         []string{rbacv1.VerbAll},
		APIGroups:     []string{"imagehub.sealos.io"},
		Resources:     []string{"organizations"},
		ResourceNames: []string{org.Name},
	}
	orgMgrRole.Rules = append(orgMgrRole.Rules, orgMgrRule)
	r.Logger.V(1).Info("CreateOrUpdate", "clusterrole", orgMgrRole.Name)
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, orgMgrRole, func() error {
		if err := controllerutil.SetControllerReference(org, orgMgrRole, r.Scheme); err != nil {
			return err
		}
		return nil
	}); err != nil {
		r.Logger.Error(err, "err in CreateOrUpdate clusterrole", "clusterrole", orgMgrRole.Name)
		return
	}
	// create cluster role binding
	var sub []rbacv1.Subject
	for _, user := range org.Spec.Manager {
		sub = append(sub, rbacv1.Subject{
			Kind:      "ServiceAccount",
			Name:      user,
			Namespace: "default",
		})
	}
	sub = append(sub, rbacv1.Subject{
		Kind:      "ServiceAccount",
		Name:      org.Spec.Creator,
		Namespace: "default",
	})
	if len(sub) == 0 {
		return
	}
	crb := &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name: "OrgManagerClusterRoleBinding-" + org.Name,
		},
		RoleRef: rbacv1.RoleRef{
			APIGroup: rbacv1.SchemeGroupVersion.Group,
			Kind:     "ClusterRole",
			Name:     orgMgrRole.Name,
		},
		Subjects: sub,
	}
	r.Logger.V(1).Info("CreateOrUpdate", "clusterrolebinding", crb.Name)
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, crb, func() error {
		if err := controllerutil.SetControllerReference(org, crb, r.Scheme); err != nil {
			return err
		}
		return nil
	}); err != nil {
		r.Logger.Error(err, "err in CreateOrUpdate clusterrolebinding", "clusterrolebinding", crb.Name)
		return
	}
	r.Logger.Info("create ClusterRole and ClusterRoleBinding for ", "org:", org.Name)
}

func (r *OrganizationReconciler) doFinalizer(ctx context.Context, obj client.Object) error {
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *OrganizationReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "OrgController"
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	r.Logger = ctrl.Log.WithName(controllerName)
	if r.Recorder == nil {
		r.Recorder = mgr.GetEventRecorderFor(controllerName)
	}
	if r.finalizer == nil {
		r.finalizer = controller.NewFinalizer(r.Client, imagehubv1.OrgFinalizerName)
	}
	r.Scheme = mgr.GetScheme()
	r.db = &DataHelper{r.Client, r.Logger}
	r.Logger.V(1).Info("init reconcile controller Organization")

	return ctrl.NewControllerManagedBy(mgr).
		For(&imagehubv1.Organization{}).
		Owns(&imagehubv1.Repository{}).
		Complete(r)
}
