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
	"sort"

	"github.com/go-logr/logr"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"

	imagehubv1 "github.com/labring/sealos/controllers/imagehub/api/v1"
)

// ImageReconciler reconciles a Image object
type ImageReconciler struct {
	client.Client
	logr.Logger
	Scheme *runtime.Scheme

	DataBase
}

//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=images,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=repositories,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=images/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=images/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Image object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.13.0/pkg/reconcile
func (r *ImageReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger = log.FromContext(ctx)
	r.Logger.Info("enter reconcile", "name: ", req.Name, "namespace: ", req.Namespace)

	// get image
	var img *imagehubv1.Image
	if err := r.Get(ctx, req.NamespacedName, img); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if img.DeletionTimestamp.IsZero() {
		if !controllerutil.ContainsFinalizer(img, imagehubv1.ImgFinalizerName) {
			controllerutil.AddFinalizer(img, imagehubv1.ImgFinalizerName)
			if err := r.Update(ctx, img); err != nil {
				return ctrl.Result{}, err
			}
		}
	} else {
		// start a pipeline
		r.Logger.Info("start image pipeline", "image name:", img.Spec.Name)
		pipeline := []func(context.Context, *imagehubv1.Image) error{
			// handle finalizer
			r.preDelete,
			// init map and etc
			r.init,
			// sync to repo crd
			r.syncRepo,
		}
		for _, fn := range pipeline {
			err := fn(ctx, img)
			if err != nil {
				r.Logger.Info("error in pipeline", "error func:", rt.FuncForPC(reflect.ValueOf(fn).Pointer()).Name())
				return ctrl.Result{}, err
			}
		}
	}

	return ctrl.Result{}, nil
}

func (r *ImageReconciler) preDelete(ctx context.Context, img *imagehubv1.Image) error {
	if controllerutil.ContainsFinalizer(img, imagehubv1.ImgFinalizerName) {
		// our finalizer is present, so lets handle any external dependency
		if err := r.deleteExternalResources(ctx, img); err != nil {
			// if fail to delete the external dependency here, return with error
			// so that it can be retried
			r.Logger.Error(err, "delete image, finalizer predelete error")
			return err
		}
		// remove our finalizer from the list and update it.
		controllerutil.RemoveFinalizer(img, imagehubv1.ImgFinalizerName)
		if err := r.Update(ctx, img); err != nil {
			return err
		}
	}
	return nil
}

// init check spec info input and init data etc...
func (r *ImageReconciler) init(ctx context.Context, img *imagehubv1.Image) error {
	if !img.Spec.Name.IsLegal() {
		r.Logger.Info("error in init", "name: ", img.Spec.Name)
		return fmt.Errorf("image name illegal")
	}

	r.DataBase = DataBase{
		Client: r.Client,
		Logger: r.Logger,
	}
	return nil
}

// todo sync image to repo
func (r *ImageReconciler) syncRepo(ctx context.Context, img *imagehubv1.Image) error {
	repo := &imagehubv1.Repository{ObjectMeta: metav1.ObjectMeta{Name: img.Spec.Name.ToMetaName(), Namespace: img.Namespace}}
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, repo, func() error {
		td := imagehubv1.TagData{
			Name:  img.Spec.Name.GetTag(),
			CTime: img.CreationTimestamp,
		}
		// create repo
		if repo.CreationTimestamp.IsZero() {
			repo.Spec = imagehubv1.ReposiyorySpec{
				Name:      img.Spec.Name.ToRepoName(),
				LatestTag: td,
			}
		}

		// update repo, check repo tag list, and update latest tag
		if !isTagExistInTagList(td, repo.Spec.Tags) {
			repo.Spec.Tags = append(repo.Spec.Tags, td)
		}

		sort.Slice(repo.Spec.Tags, func(i, j int) bool {
			return repo.Spec.Tags[i].CTime.After(repo.Spec.Tags[j].CTime.Time)
		})

		repo.Spec.LatestTag = repo.Spec.Tags[len(repo.Spec.Tags)-1]
		return nil
	}); err != nil {
		return fmt.Errorf("sync repo failed: %v", err)
	}
	return nil
}

func isTagExistInTagList(tag imagehubv1.TagData, tags []imagehubv1.TagData) bool {
	for _, p := range tags {
		if p.Name == tag.Name {
			return true
		}
	}
	return false
}

// deleteExternalResources image delete will updata and get repo tag list and delete repo if repo's tag list is null
func (r *ImageReconciler) deleteExternalResources(ctx context.Context, img *imagehubv1.Image) error {
	repo, err := r.getRepo(ctx, img.Spec.Name.ToRepoName())
	if err != nil {
		return err
	}

	spec := imagehubv1.ReposiyorySpec{
		Tags: imagehubv1.TagList{},
		LatestTag: imagehubv1.TagData{
			Name:  "",
			CTime: metav1.Time{},
		},
	}

	for _, t := range repo.Spec.Tags {
		if t.Name == img.Spec.Name.GetTag() {
			continue
		}
		spec.Tags = append(spec.Tags, t)
	}

	// change spec and update
	repo.Spec = spec

	// if repo has no tags, delete it
	if len(repo.Spec.Tags) == 0 {
		return r.Delete(ctx, &repo)
	}

	// resort tag list, update latestTag
	sort.Slice(repo.Spec.Tags, func(i, j int) bool {
		return repo.Spec.Tags[i].CTime.After(repo.Spec.Tags[j].CTime.Time)
	})
	repo.Spec.LatestTag = repo.Spec.Tags[len(repo.Spec.Tags)-1]

	return r.Update(ctx, &repo)
}

// SetupWithManager sets up the controller with the Manager.
func (r *ImageReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&imagehubv1.Image{}).
		Complete(r)
}
