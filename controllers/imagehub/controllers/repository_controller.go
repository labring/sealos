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
	"sort"

	"github.com/go-logr/logr"
	"github.com/labring/endpoints-operator/library/controller"
	imagehubv1 "github.com/labring/sealos/controllers/imagehub/api/v1"
	"github.com/pkg/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

// RepositoryReconciler reconciles a Reposiotry object
type RepositoryReconciler struct {
	client.Client
	logr.Logger
	db        *DataHelper
	finalizer *controller.Finalizer
	Scheme    *runtime.Scheme
	Recorder  record.EventRecorder
}

//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=images,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=repositories,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=organizations,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=organizations/status,verbs=get;update;patch
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
	r.Logger.V(1).Info("start reconcile for repo")
	repo := &imagehubv1.Repository{}
	if err := r.Get(ctx, req.NamespacedName, repo); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if ok, err := r.finalizer.RemoveFinalizer(ctx, repo, r.doFinalizer); ok {
		return ctrl.Result{}, err
	}

	if ok, err := r.finalizer.AddFinalizer(ctx, repo); ok {
		if err != nil {
			return ctrl.Result{}, err
		}
		return r.doReconcile(ctx, repo)
	}
	return ctrl.Result{}, errors.New("reconcile error from Finalizer")
}

func (r *RepositoryReconciler) doReconcile(ctx context.Context, obj client.Object) (ctrl.Result, error) {
	r.Logger.V(1).Info("update reconcile controller repo", "request", client.ObjectKeyFromObject(obj))
	repo, ok := obj.(*imagehubv1.Repository)
	if !ok {
		return ctrl.Result{}, errors.New("obj convert Repository is error")
	}
	pipelines := []func(ctx context.Context, repo *imagehubv1.Repository){
		r.syncOrg,
		r.syncImg,
	}
	for _, fn := range pipelines {
		fn(ctx, repo)
	}
	return ctrl.Result{}, r.Client.Update(ctx, repo)
}

func (r *RepositoryReconciler) doFinalizer(ctx context.Context, obj client.Object) error {
	r.Logger.V(1).Info("delete reconcile controller Repository", "request", client.ObjectKeyFromObject(obj))
	repo, ok := obj.(*imagehubv1.Repository)
	if !ok {
		return errors.New("obj convert Repository is error")
	}
	pipelines := []func(ctx context.Context, repo *imagehubv1.Repository){
		r.deleteOrgRepoList,
	}
	for _, fn := range pipelines {
		fn(ctx, repo)
	}
	return nil
}

// todo sync repo to org
func (r *RepositoryReconciler) syncOrg(ctx context.Context, repo *imagehubv1.Repository) {
	org := &imagehubv1.Organization{
		ObjectMeta: metav1.ObjectMeta{
			Name: repo.Spec.Name.GetOrg(),
		},
	}
	if err := r.Get(ctx, client.ObjectKeyFromObject(org), org); client.IgnoreNotFound(err) != nil {
		r.Logger.V(1).Info("Get org error")
		return
	}
	if err := controllerutil.SetControllerReference(org, repo, r.Scheme); err != nil {
		r.Logger.V(1).Info("repo SetControllerReference")
		return
	}
	org.Status.Name = org.Spec.Name
	// update org status
	if !isRepoExistInOrgList(repo.Spec.Name, org.Status.Repos) {
		org.Status.Repos = append(org.Status.Repos, repo.Spec.Name)
	}
	if err := r.Status().Update(ctx, org); err != nil {
		r.Logger.V(1).Info("org status update error")
	}
}

// syncImg will get images that match repo, and will sync them to repo
func (r *RepositoryReconciler) syncImg(ctx context.Context, repo *imagehubv1.Repository) {
	imgList, _ := r.db.getImageListByRepoName(ctx, repo.Spec.Name)
	tagList := imagehubv1.TagList{}
	for _, img := range imgList.Items {
		tagList = append(tagList, imagehubv1.TagData{
			Name:  img.Spec.Name.GetTag(),
			CTime: img.CreationTimestamp,
		})
	}
	repo.Status.Tags = tagList
	sort.Slice(repo.Status.Tags, func(i, j int) bool {
		return repo.Status.Tags[i].CTime.After(repo.Status.Tags[j].CTime.Time)
	})
	repo.Status.LatestTag = repo.Status.Tags[len(repo.Status.Tags)-1]
	err := r.Status().Update(ctx, repo)
	if err != nil {
		r.Logger.V(1).Info("repo status update error")
	}
}

func (r *RepositoryReconciler) deleteOrgRepoList(ctx context.Context, repo *imagehubv1.Repository) {
	// todo try to delete image in hub.sealos.io registry
	org := &imagehubv1.Organization{
		ObjectMeta: metav1.ObjectMeta{
			Name: repo.Spec.Name.GetOrg(),
		},
	}
	if err := r.Get(ctx, client.ObjectKeyFromObject(org), org); client.IgnoreNotFound(err) != nil {
		r.Logger.V(1).Info("Get org error")
		return
	}
	// update org repo list
	var res []imagehubv1.RepoName
	for _, re := range org.Status.Repos {
		if re != repo.Spec.Name {
			res = append(res, re)
		}
	}
	org.Status.Repos = res
	if err := r.Status().Update(ctx, org); err != nil {
		r.Logger.V(1).Info("org status update error")
	}
}

func isRepoExistInOrgList(repo imagehubv1.RepoName, repos []imagehubv1.RepoName) bool {
	for _, name := range repos {
		if name == repo {
			return true
		}
	}
	return false
}

// SetupWithManager sets up the controller with the Manager.
func (r *RepositoryReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "RepoController"
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	r.Logger = ctrl.Log.WithName(controllerName)
	if r.Recorder == nil {
		r.Recorder = mgr.GetEventRecorderFor(controllerName)
	}
	if r.finalizer == nil {
		r.finalizer = controller.NewFinalizer(r.Client, imagehubv1.RepoFinalizerName)
	}
	r.Scheme = mgr.GetScheme()
	r.db = &DataHelper{r.Client, r.Logger}
	r.Logger.V(1).Info("init reconcile controller repo")
	return ctrl.NewControllerManagedBy(mgr).
		For(&imagehubv1.Repository{}).
		Complete(r)
}
