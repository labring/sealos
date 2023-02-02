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

	"github.com/go-logr/logr"
	appv1 "github.com/labring/sealos/controllers/app/api/v1"
	imagehubv1 "github.com/labring/sealos/controllers/imagehub/api/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

type ActionsReconciler struct {
	client.Client
	Scheme       *runtime.Scheme
	recorder     record.EventRecorder
	actionEngine ActionEngine
	logr.Logger
}

const (
	DefaultNameSpace string = "default"
)

// +kubebuilder:rbac:groups=app.sealos.io,resources=actions,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=app.sealos.io,resources=actions/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=app.sealos.io,resources=actions/finalizers,verbs=update
// +kubebuilder:rbac:groups=imagehub.sealos.io,resources=images,verbs=get;list
func (r *ActionsReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger = log.FromContext(ctx)
	action := &appv1.Actions{}
	if err := r.Get(ctx, req.NamespacedName, action); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	r.Logger.Info(fmt.Sprintf("action.Name: %v", action.Name))
	if action.Status.Status == "" {
		action.Status.Status = appv1.Processing
		r.recorder.Eventf(action, corev1.EventTypeNormal, "ActionProcessing", "Action %s start processing", action.Name)
		if err := r.Status().Update(ctx, action); err != nil {
			return ctrl.Result{}, err
		}
	}

	image := &imagehubv1.Image{}
	if err := r.Get(ctx, client.ObjectKey{Namespace: DefaultNameSpace, Name: action.Name}, image); err != nil {
		r.recorder.Eventf(image, corev1.EventTypeNormal, "ImageGetFailed", "Infra %s status is pending", image.Name)
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	r.Logger.Info(fmt.Sprintf("image.Name: %v", image.Name))
	r.actionEngine = NewActionEngine(ctx, r.Client, action, image)

	if err := r.actionEngine.Parse(); err != nil {
		r.recorder.Eventf(action, corev1.EventTypeNormal, "ActionParseFailed", "Action %s status is Failed", action.Name)
		action.Status.Status = appv1.Failed
		if suberr := r.Status().Update(ctx, action); suberr != nil {
			return ctrl.Result{}, fmt.Errorf("parse err happened err: %v ; %v", err, suberr)
		}
		return ctrl.Result{}, fmt.Errorf("parse err happened err: %v ", err)
	}

	if err := r.actionEngine.Apply(); err != nil {
		r.recorder.Eventf(action, corev1.EventTypeNormal, "ActionApplyFailed", "Action %s status is Failed", action.Name)
		action.Status.Status = appv1.Failed
		if suberr := r.Status().Update(ctx, action); suberr != nil {
			return ctrl.Result{}, fmt.Errorf("apply err happened err: %v ; %v", err, suberr)
		}
		return ctrl.Result{}, fmt.Errorf("apply err happened err: %v ", err)
	}

	r.recorder.Eventf(action, corev1.EventTypeNormal, "ActionApplySuccess", "Action %s status is applying", action.Name)
	action.Status.Status = appv1.Success
	if err := r.Status().Update(ctx, action); err != nil {
		return ctrl.Result{}, err
	}
	return ctrl.Result{}, nil
}

func (r *ActionsReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.recorder = mgr.GetEventRecorderFor("sealos-action-controller")
	return ctrl.NewControllerManagedBy(mgr).
		For(&appv1.Actions{}).
		Complete(r)
}
