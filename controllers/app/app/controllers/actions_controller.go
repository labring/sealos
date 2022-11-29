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
	"github.com/go-logr/logr"
	appv1 "github.com/labring/sealos/controllers/app/api/v1"
	imagehubv1 "github.com/labring/sealos/controllers/imagehub/api/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/serializer/yaml"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"text/template"
)

const (
	IMAGE_NAMESPACE = "sealos-imagehub"
)

// ActionsReconciler reconciles a Actions object
type ActionsReconciler struct {
	client.Client
	Scheme       *runtime.Scheme
	recorder     record.EventRecorder
	actionEngine ActionEngine
	ctx          context.Context
	logr.Logger
}

//+kubebuilder:rbac:groups=app.sealos.io,resources=actions,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=app.sealos.io,resources=actions/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=app.sealos.io,resources=actions/finalizers,verbs=update

//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=images,verbs=get;list

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Actions object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.12.2/pkg/reconcile
func (r *ActionsReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger = log.FromContext(ctx)
	action := &appv1.Actions{}
	if err := r.Get(ctx, req.NamespacedName, action); err != nil {
		//r.recorder.Eventf(action, core.EventTypeNormal, "action.yaml get-test", "Action %s get", action.Name)
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	r.Logger.Info(fmt.Sprintf("action.Name: %v", action.Name))
	image := &imagehubv1.Image{}
	if err := r.Get(ctx, client.ObjectKey{Namespace: req.Namespace, Name: action.Spec.AppName}, image); err != nil {
		//r.recorder.Eventf(image, core.EventTypeNormal, "image get-test", "image %s get ", image.Name)
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	//fmt.Println(image.Spec.DetailInfo.AppActions.Actions["install"])
	r.Logger.Info(fmt.Sprintf("image.Name: %v", image.Name))

	switch image.Spec.DetailInfo.AppActions.ActionType {

	case appv1.KubectlAction:
		r.actionEngine = NewKubectlEngine(ctx, r.Client, action, image)
	}
	r.actionEngine.Parse()
	fmt.Println("parse success")
	r.actionEngine.Apply()

	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ActionsReconciler) SetupWithManager(mgr ctrl.Manager) error {
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
		return client.IgnoreNotFound(err)
	}
	var byt bytes.Buffer
	e := t.Execute(&byt, args) //执行模板，并通过w输出
	if e != nil {
		return client.IgnoreNotFound(err)
	}
	ctlEngine.parseResult = byt.Bytes()
	fmt.Println(byt.String())
	return nil
}

func (ctlEngine *KubectlEngine) Apply() error {
	fmt.Println("start apply")
	obj := &unstructured.Unstructured{}
	_, _, err := yaml.NewDecodingSerializer(unstructured.UnstructuredJSONScheme).Decode(ctlEngine.parseResult, nil, obj)
	if err != nil {
		fmt.Printf("Decode errL:%v\n", err)
		return client.IgnoreNotFound(err)
	}
	fmt.Println("Decode fin")
	oobj, isclientobj := obj.DeepCopyObject().(client.Object)
	if !isclientobj {
		fmt.Printf("DeepCopyObject errL:%v\n", err)
		return client.IgnoreNotFound(err)
	}
	fmt.Println("DeepCopyObject fin")
	_, err = controllerutil.CreateOrUpdate(ctlEngine.ctx, ctlEngine.Client, oobj, func() error {

		return nil
	})
	if err != nil {
		fmt.Printf("CreateOrUpdate errL:%v\n", err)
		return err
	}
	fmt.Println("CreateOrUpdate fin")

	return nil
}
