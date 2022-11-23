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
	"github.com/labring/endpoints-operator/library/convert"
	imagehubv1 "github.com/labring/sealos/controllers/imagehub/api/v1"
	"github.com/pkg/errors"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/tools/record"
	"k8s.io/client-go/util/retry"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

// ImageReconciler reconciles a Image object
type ImageReconciler struct {
	client.Client
	logr.Logger
	db       *DataHelper
	Scheme   *runtime.Scheme
	Recorder record.EventRecorder
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
	r.Logger.V(1).Info("start reconcile for image")

	// get image
	img := &imagehubv1.Image{}
	ctr := controller.Controller{
		Client:   r.Client,
		Logger:   r.Logger,
		Eventer:  r.Recorder,
		Operator: r,
		Gvk: schema.GroupVersionKind{
			Group:   imagehubv1.GroupVersion.Group,
			Version: imagehubv1.GroupVersion.Version,
			Kind:    "Image",
		},
		FinalizerName: imagehubv1.ImgFinalizerName,
	}
	img.APIVersion = ctr.Gvk.GroupVersion().String()
	img.Kind = ctr.Gvk.Kind

	return ctr.Run(ctx, req, img)
}

// Update .
func (r *ImageReconciler) Update(ctx context.Context, req ctrl.Request, gvk schema.GroupVersionKind, obj client.Object) (ctrl.Result, error) {
	r.Logger.V(1).Info("update reconcile controller image", "request", req)
	img := &imagehubv1.Image{}
	err := convert.JsonConvert(obj, img)
	if err != nil {
		r.Logger.V(2).Info("error in image json convert", "json", obj)
		return ctrl.Result{Requeue: true}, err
	}

	pipelines := []func(ctx context.Context, img *imagehubv1.Image){
		r.syncRepo,
	}
	for _, fn := range pipelines {
		fn(ctx, img)
	}

	return ctrl.Result{}, r.Client.Update(ctx, img)
}

// Delete .
func (r *ImageReconciler) Delete(ctx context.Context, req ctrl.Request, gvk schema.GroupVersionKind, obj client.Object) error {
	r.Logger.V(1).Info("delete reconcile controller image", "request", req)
	// get img from obj
	img := &imagehubv1.Image{}
	err := convert.JsonConvert(obj, img)
	if err != nil {
		r.Logger.V(2).Info("error in image json convert", "namespace/name", obj.GetNamespace()+"/"+obj.GetName())
		return err
	}

	// todo try to delete image in hub.sealos.io registry

	// get repo by img spec name
	repo, err := r.db.getRepoByRepoName(ctx, img.Spec.Name.ToRepoName())
	if err != nil {
		r.Logger.V(2).Info("error in image getRepoByRepoName, not found repo by lable", "err:", err.Error())
		return err
	}
	// update repo spec
	spec := imagehubv1.ReposiyorySpec{}
	for _, t := range repo.Spec.Tags {
		if t.Name != img.Spec.Name.GetTag() {
			spec.Tags = append(spec.Tags, t)
		}
	}
	repo.Spec = spec

	// if repo has no tags, delete it and return
	if len(repo.Spec.Tags) == 0 {
		return r.Client.Delete(ctx, &repo)
	}

	// resort tag list, update latestTag
	sort.Slice(repo.Spec.Tags, func(i, j int) bool {
		return repo.Spec.Tags[i].CTime.After(repo.Spec.Tags[j].CTime.Time)
	})
	repo.Spec.LatestTag = repo.Spec.Tags[len(repo.Spec.Tags)-1]

	return r.Client.Update(ctx, &repo)
}

// syncRepo add image info to repo
func (r *ImageReconciler) syncRepo(ctx context.Context, img *imagehubv1.Image) {
	repo := &imagehubv1.Repository{
		ObjectMeta: metav1.ObjectMeta{
			// todo obj Name cloud be conflict
			Name: img.Spec.Name.ToRepoName().ToMetaName(),
		},
	}
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		var change controllerutil.OperationResult
		var err error

		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, repo, func() error {
			td := imagehubv1.TagData{
				Name:  img.Spec.Name.GetTag(),
				CTime: img.CreationTimestamp,
			}
			// create repo
			if repo.CreationTimestamp.IsZero() {
				repo.Spec = imagehubv1.ReposiyorySpec{
					Name:      img.Spec.Name.ToRepoName(),
					Tags:      imagehubv1.TagList{td},
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
			return errors.Wrap(err, "unable to create repo when add image")
		}
		r.Logger.V(1).Info("create or update repo", "OperationResult", change)
		return nil
	}); err != nil {
		r.Recorder.Eventf(img, v1.EventTypeWarning, "syncRepo", "Sync Repo %s is error: %v", repo, err)
	}
}

func isTagExistInTagList(tag imagehubv1.TagData, tags []imagehubv1.TagData) bool {
	for _, p := range tags {
		if p.Name == tag.Name {
			return true
		}
	}
	return false
}

// SetupWithManager sets up the controller with the Manager.
func (r *ImageReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "ImageController"

	r.Logger = ctrl.Log.WithName(controllerName)
	r.Scheme = mgr.GetScheme()
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	if r.Recorder == nil {
		r.Recorder = mgr.GetEventRecorderFor(controllerName)
	}
	r.db = &DataHelper{r.Client, r.Logger}

	r.Logger.V(1).Info("init reconcile controller image")

	return ctrl.NewControllerManagedBy(mgr).
		For(&imagehubv1.Image{}).
		Complete(r)
}
