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

	"github.com/go-logr/logr"
	"github.com/labring/endpoints-operator/library/controller"
	"github.com/labring/endpoints-operator/library/convert"
	imagehubv1 "github.com/labring/sealos/controllers/imagehub/api/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

// OrgclusterrolebindingReconciler reconciles a Orgclusterrolebinding object
type OrgclusterrolebindingReconciler struct {
	client.Client
	logr.Logger
	db       *DataHelper
	Scheme   *runtime.Scheme
	Recorder record.EventRecorder
}

//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=images,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=repositories,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=organizations,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=serviceaccounts,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=clusterroles/status;roles/status,verbs=get;list;watch
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=clusterroles;roles,verbs=create;delete;get;list;patch;update;watch
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=rolebindings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=clusterrolebindings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=orgclusterrolebindings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=orgclusterrolebindings/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=orgclusterrolebindings/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Orgclusterrolebinding object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.13.0/pkg/reconcile
func (r *OrgclusterrolebindingReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger.V(1).Info("start reconcile for org")

	org := &imagehubv1.Organization{}
	ctr := controller.Controller{
		Client:   r.Client,
		Logger:   r.Logger,
		Eventer:  r.Recorder,
		Operator: r,
		Gvk: schema.GroupVersionKind{
			Group:   imagehubv1.GroupVersion.Group,
			Version: imagehubv1.GroupVersion.Version,
			Kind:    "Organization",
		},
		FinalizerName: imagehubv1.OrgCRBFinalizerName,
	}
	org.APIVersion = ctr.Gvk.GroupVersion().String()
	org.Kind = ctr.Gvk.Kind

	return ctr.Run(ctx, req, org)
}

func (r *OrgclusterrolebindingReconciler) Update(ctx context.Context, req ctrl.Request, gvk schema.GroupVersionKind, obj client.Object) (ctrl.Result, error) {
	r.Logger.V(1).Info("update reconcile controller OrgCRB", "request", req)
	org := &imagehubv1.Organization{}
	err := convert.JsonConvert(obj, org)
	if err != nil {
		r.Logger.V(1).Info("error in image json convert", "json", obj)
		return ctrl.Result{Requeue: true}, err
	}
	orgMgrRole := &rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{
			Name: "OrgManagerClusterRole-" + org.Name,
		},
	}

	// add orgMgrRule
	orgMgrRule := rbacv1.PolicyRule{
		Verbs:         imagehubv1.AllAction,
		APIGroups:     []string{"imagehub.sealos.io"},
		Resources:     []string{"organizations"},
		ResourceNames: []string{org.Name},
	}
	// add repoRule
	//repoRule := rbacv1.PolicyRule{
	//	Verbs:         imagehubv1.AllAction,
	//	APIGroups:     []string{"imagehub.sealos.io"},
	//	Resources:     []string{"repositories"},
	//	ResourceNames: []string{},
	//}
	//repoList, err := r.db.getRepoListByOrgName(ctx, org.Spec.Name)
	//if err != nil {
	//	r.Logger.Error(err, "error getRepoListByOrgName in orgcrb controller")
	//	return ctrl.Result{}, err
	//}
	//for _, repo := range repoList.Items {
	//	repoRule.ResourceNames = append(repoRule.ResourceNames, repo.Name)
	//}
	//// add imageRule
	//imageRule := rbacv1.PolicyRule{
	//	Verbs:         imagehubv1.AllAction,
	//	APIGroups:     []string{"imagehub.sealos.io"},
	//	Resources:     []string{"images"},
	//	ResourceNames: []string{},
	//}
	//imageList, err := r.db.getImageListByOrgName(ctx, org.Spec.Name)
	//if err != nil {
	//	r.Logger.Error(err, "error getImageListByOrgName in orgcrb controller")
	//	return ctrl.Result{}, err
	//}
	//for _, image := range imageList.Items {
	//	imageRule.ResourceNames = append(imageRule.ResourceNames, image.Name)
	//}
	//orgMgrRole.Rules = append(orgMgrRole.Rules, orgMgrRule, repoRule, imageRule)
	orgMgrRole.Rules = append(orgMgrRole.Rules, orgMgrRule)

	r.Logger.V(1).Info("CreateOrUpdate", "clusterrole", orgMgrRole.Name)
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, orgMgrRole, func() error {
		if err := controllerutil.SetControllerReference(org, orgMgrRole, r.Scheme); err != nil {
			return err
		}
		return nil
	}); err != nil {
		r.Logger.Error(err, "err in CreateOrUpdate clusterrole", "clusterrole", orgMgrRole.Name)
		return ctrl.Result{}, err
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
		return ctrl.Result{}, err
	}
	r.Logger.Info("create ClusterRole and ClusterRoleBinding for ", "org:", org.Name)

	return ctrl.Result{}, nil
}

// Delete .
func (r *OrgclusterrolebindingReconciler) Delete(ctx context.Context, req ctrl.Request, gvk schema.GroupVersionKind, obj client.Object) error {
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *OrgclusterrolebindingReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "Orgclusterrolebinding"

	r.Logger = ctrl.Log.WithName(controllerName)
	r.Scheme = mgr.GetScheme()
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	if r.Recorder == nil {
		r.Recorder = mgr.GetEventRecorderFor(controllerName)
	}
	r.db = &DataHelper{r.Client, r.Logger}

	r.Logger.V(1).Info("init reconcile controller OrgClusterRoleBinding")

	return ctrl.NewControllerManagedBy(mgr).
		For(&imagehubv1.Organization{}).
		Complete(r)
}
