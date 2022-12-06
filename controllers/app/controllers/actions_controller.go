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
	"bytes"
	"context"
	"fmt"

	"html/template"

	"github.com/go-logr/logr"
	appv1 "github.com/labring/sealos/controllers/app/api/v1"
	imagehubv1 "github.com/labring/sealos/controllers/imagehub/api/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/serializer/yaml"
	"k8s.io/client-go/tools/record"
	"k8s.io/kubernetes/pkg/apis/core"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
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
	image := &imagehubv1.Image{}
	if err := r.Get(ctx, client.ObjectKey{Namespace: DefaultNameSpace, Name: action.Spec.AppName}, image); err != nil {
		r.recorder.Eventf(image, core.EventTypeNormal, "ImageGetFailed", "Infra %s status is pending", image.Name)
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	r.Logger.Info(fmt.Sprintf("image.Name: %v", image.Name))
	switch image.Spec.DetailInfo.AppActions.ActionType {
	case appv1.KubectlAction:
		r.actionEngine = NewKubectlEngine(ctx, r.Client, action, image)
	}
	if err := r.actionEngine.Parse(); err != nil {
		r.recorder.Eventf(action, core.EventTypeNormal, "ActionParseFailed", "Action %s status is Failed", action.Name)
		return ctrl.Result{}, err
	}
	if err := r.actionEngine.Apply(); err != nil {
		r.recorder.Eventf(action, core.EventTypeNormal, "ActionApplyFailed", "Action %s status is Failed", action.Name)
		return ctrl.Result{}, err
	}
	r.recorder.Eventf(action, core.EventTypeNormal, "ActionApplySuccess", "Action %s status is applying", action.Name)
	return ctrl.Result{}, nil
}

func (r *ActionsReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.recorder = mgr.GetEventRecorderFor("sealos-action-controller")
	return ctrl.NewControllerManagedBy(mgr).
		For(&appv1.Actions{}).
		Complete(r)
}

func (ctlEngine *KubectlEngine) Parse() error {
	actionName := ctlEngine.ActionReq.Spec.ActionName
	tpl := ctlEngine.imageInfo.Spec.DetailInfo.AppActions.Actions[imagehubv1.ActionName(actionName)]

	args := ctlEngine.ActionReq.Spec.Args
	t, err := template.New("action.yaml").Parse(string(tpl))
	if err != nil {
		return fmt.Errorf("action template parse failed")
	}
	var byt bytes.Buffer
	e := t.Execute(&byt, args)
	if e != nil {
		return fmt.Errorf("action template execute failed")
	}
	ctlEngine.parseResult = byt.Bytes()
	return nil
}

func (ctlEngine *KubectlEngine) Apply() error {
	obj := &unstructured.Unstructured{}
	_, _, err := yaml.NewDecodingSerializer(unstructured.UnstructuredJSONScheme).Decode(ctlEngine.parseResult, nil, obj)
	if err != nil {
		return fmt.Errorf("action template decode failed")
	}
	obj.SetNamespace(DefaultNameSpace)
	oobj, isclientobj := obj.DeepCopyObject().(client.Object)
	if !isclientobj {
		return fmt.Errorf("deepCopyObject errL:%v", err)
	}
	_, err = controllerutil.CreateOrUpdate(ctlEngine.ctx, ctlEngine.Client, oobj, func() error {
		return nil
	})
	if err != nil {
		return fmt.Errorf("createOrUpdate errL:%v", err)
	}

	return nil
}
