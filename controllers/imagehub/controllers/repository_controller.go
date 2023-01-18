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
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=repositories/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=repositories/finalizers,verbs=update
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=organizations,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=organizations/status,verbs=get;update;patch

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
		return r.reconcile(ctx, repo)
	}
	return ctrl.Result{}, errors.New("reconcile error from Finalizer")
}

func (r *RepositoryReconciler) reconcile(ctx context.Context, obj client.Object) (ctrl.Result, error) {
	r.Logger.V(1).Info("update reconcile controller repo", "request", client.ObjectKeyFromObject(obj))
	repo, ok := obj.(*imagehubv1.Repository)
	if !ok {
		return ctrl.Result{}, errors.New("obj convert Repository is error")
	}

	// get org and SetControllerReference.
	org := &imagehubv1.Organization{}
	org.Name = repo.Spec.Name.GetOrg()
	if err := r.Get(ctx, client.ObjectKeyFromObject(org), org); err != nil {
		return ctrl.Result{}, err
	}

	update, err := controllerutil.CreateOrUpdate(ctx, r.Client, repo, func() error {
		if err := controllerutil.SetControllerReference(org, repo, r.Scheme); err != nil {
			r.Logger.Error(err, "error in repo SetControllerReference")
			return err
		}
		return nil
	})
	if err != nil {
		r.Logger.Error(err, "repo reconcile update repo error")
		return ctrl.Result{Requeue: true}, err
	}
	r.Logger.V(1).Info("repo reconcile update repo:", "changes", update)

	// update status
	imgList, _ := r.db.GetImageListByRepoName(ctx, repo.Spec.Name)
	r.Logger.Info("GetImageListByRepoName", "imgList Len:", len(imgList.Items))
	tagList := imagehubv1.TagList{}
	for _, img := range imgList.Items {
		tagList = append(tagList, imagehubv1.TagData{
			Name:     img.Spec.Name.GetTag(),
			MetaName: img.Name,
			Size:     img.Spec.DetailInfo.Size,
			CTime:    img.CreationTimestamp,
		})
	}
	repo.Status.Tags = tagList
	sort.Slice(repo.Status.Tags, func(i, j int) bool {
		return repo.Status.Tags[i].CTime.After(repo.Status.Tags[j].CTime.Time)
	})
	if len(repo.Status.Tags) != 0 {
		repo.Status.LatestTag = &repo.Status.Tags[0]
	} else {
		// set LatestTag nil if no tag in repo.
		repo.Status.LatestTag = nil
	}

	latestrepo := &imagehubv1.Repository{}
	if err := r.Get(ctx, client.ObjectKeyFromObject(repo), latestrepo); err != nil {
		r.Logger.Error(err, "error in get repo")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	latestrepo.Status = repo.Status
	r.Logger.Info("Repo status: ", "tagList:", repo.Status)
	if err := r.Status().Update(ctx, repo); err != nil {
		r.Logger.Error(err, "error in repo update status")
		return ctrl.Result{Requeue: true}, err
	}
	return ctrl.Result{}, nil
}

func (r *RepositoryReconciler) doFinalizer(ctx context.Context, obj client.Object) error {
	return nil
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
		Owns(&imagehubv1.Image{}).
		Complete(r)
}
