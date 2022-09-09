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
	"github.com/Masterminds/sprig"
	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	"html/template"
	corev1 "k8s.io/api/core/v1"
	_ "k8s.io/apimachinery/pkg/api/equality"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	_ "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"reflect"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	_ "sigs.k8s.io/structured-merge-diff/v4/fieldpath"
)

const (
	FinalizerName       = "metering.sealos.io/finalizer"
	KeepaliveAnnotation = "lastUpdateTime"
)

// MeteringReconciler reconciles a Metering object
type MeteringReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

//+kubebuilder:rbac:groups=metering.sealos.io,resources=meterings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meterings/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meterings/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Metering object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.11.2/pkg/reconcile

// TODO 使用Resource Quota进行资源配额
// TODO 计算每个namespace的资源使用量
// TODO 打印出来使用的资源量

func (r *MeteringReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	var quota meteringv1.Metering
	err := r.Get(ctx, req.NamespacedName, &quota)
	if err != nil {
		logger.Error(err, "Failed to get Metering ResourceQuota")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	logger.Info("Reconciling", "quota", quota)

	if quota.DeletionTimestamp.IsZero() {
		if controllerutil.AddFinalizer(&quota, FinalizerName) {
			if err := r.Update(ctx, &quota); err != nil {
				return ctrl.Result{}, err
			}
		}
	} else {
		if controllerutil.RemoveFinalizer(&quota, FinalizerName) {
			if err := r.Update(ctx, &quota); err != nil {
				return ctrl.Result{}, err
			}
		}
		return ctrl.Result{}, nil
	}
	//var namespaces corev1.NamespaceList
	//err = r.List(ctx, &namespaces, &client.ListOptions{})
	//logger.Info("Reconciling", "namespaces", namespaces)
	//if err != nil {
	//	return ctrl.Result{}, err
	//}
	//for _, ns := range namespaces.Items {
	//	err := r.reconcileResourceQuota(ctx, &quota, &ns)
	//	if err != nil {
	//		return ctrl.Result{}, err
	//	}
	//	logger.Info("Reconciled", "namespace", ns.GetName())
	//}

	// Check if the ResourceQuota already exists, if not create a new one
	nodeList := &corev1.NodeList{}
	err = r.List(ctx, nodeList)

	if err != nil {
		logger.Error(err, "Failed to list Nodes")
		return ctrl.Result{}, err
	}

	nodeCount := len(nodeList.Items)
	found := &corev1.ResourceQuota{}
	err = r.Get(ctx, types.NamespacedName{Name: quota.Name, Namespace: quota.Namespace}, found)

	if err != nil && errors.IsNotFound(err) {
		// Define a new ResourceQuota using nodeCount
		rq := r.resourcequotaforManagedResourceQuota(&quota, nodeCount)
		logger.Info("Creating a new ResourceQuota", "ResourceQuota.Namespace", rq.Namespace, "ResourceQuota.Name", rq.Name)
		err = r.Create(ctx, rq)
		if err != nil {
			logger.Error(err, "Failed to create new ResourceQuota", "ResourceQuota.Namespace", rq.Namespace, "ResourceQuota.Name", rq.Name)
			return ctrl.Result{}, err
		}
		// ResourceQuota created successfully - return and requeue
		return ctrl.Result{Requeue: true}, nil
	} else if err != nil {
		logger.Error(err, "Failed to get ResourceQuota")
		return ctrl.Result{}, err
	}

	// Ensure the deployment size is the same as the spec
	hard := renderHardLimits(quota.Spec.ResourceQuota, nodeCount)
	if !reflect.DeepEqual(found.Spec.Hard, hard) {
		logger.Info("Updating ResourceQuota")
		found.Spec.Hard = hard
		err = r.Update(ctx, found)
		if err != nil {
			logger.Error(err, "Failed to update ResourceQuota", "ResourceQuota.Namespace", found.Namespace, "ResourceQuota.Name", found.Name)
			return ctrl.Result{}, err
		}
		// Spec updated - return and requeue
		return ctrl.Result{Requeue: true}, nil
	}
	return ctrl.Result{}, nil
}

// resourcequotaforManagedResourceQuota returns a Resource Quota object
func (r *MeteringReconciler) resourcequotaforManagedResourceQuota(m *meteringv1.Metering, nodes int) *corev1.ResourceQuota {
	ls := labelsForResourceQuota(m.Name)
	hard := renderHardLimits(m.Spec.ResourceQuota, nodes)

	rq := &corev1.ResourceQuota{
		ObjectMeta: metav1.ObjectMeta{
			Name:      m.Name,
			Namespace: m.Namespace,
			Labels:    ls,
		},
		Spec: corev1.ResourceQuotaSpec{
			Hard: hard,
		},
	}
	// Set resourcequota instance as the owner and controller
	ctrl.SetControllerReference(m, rq, r.Scheme)
	return rq
}

// labelsForResourceQuota returns the labels for selecting the resources
// belonging to the given k8s-resourcequota-autoscaler CR name.
func labelsForResourceQuota(name string) map[string]string {
	return map[string]string{"app.kubernetes.io/managed-by": "k8s-resourcequota-autoscaler", "app.kubernetes.io/name": name}
}

func renderHardLimits(hard meteringv1.ResourceQuota, nodes int) map[corev1.ResourceName]resource.Quantity {
	m := map[corev1.ResourceName]resource.Quantity{}

	for key, element := range hard.Resources {
		var tpl bytes.Buffer
		t := template.Must(template.New("hard").Funcs(sprig.FuncMap()).Parse(element))
		data := struct {
			Nodes int
		}{
			Nodes: nodes,
		}
		if err := t.Execute(&tpl, data); err != nil {
			return nil
		}

		m[key], _ = resource.ParseQuantity(tpl.String())
	}
	return m
}

//func (r *MeteringReconciler) reconcileResourceQuota(ctx context.Context, tenantQuota *meteringv1.Metering, ns *corev1.Namespace) error {
//	logger := log.FromContext(ctx)
//	var currentQuota corev1.ResourceQuota
//
//	err := r.Get(ctx, client.ObjectKey{Namespace: ns.GetName(), Name: constants.ResourceQuotaNameDefault}, &currentQuota)
//	if client.IgnoreNotFound(err) != nil {
//		return err
//	}
//
//	tenantLabel := currentQuota.Labels[constants.LabelTenant]
//	if tenantLabel != "" && tenantLabel != tenantQuota.Name {
//		return nil
//	}
//
//	hard := make(corev1.ResourceList)
//	fieldset := &fieldpath.Set{}
//	for _, managedField := range currentQuota.GetManagedFields() {
//		if managedField.Manager == constants.ControllerName {
//			continue
//		}
//		fs := &fieldpath.Set{}
//		err = fs.FromJSON(bytes.NewReader(managedField.FieldsV1.Raw))
//		if err != nil {
//			return err
//		}
//		fieldset = fieldset.Union(fs)
//	}
//
//	for resourceName := range tenantQuota.Spec.Hard {
//		if !fieldset.Has(fieldpath.MakePathOrDie("spec", "hard", string(resourceName))) {
//			hard[resourceName] = resource.MustParse("0")
//		}
//	}
//
//	quota := applycorev1.ResourceQuota(constants.ResourceQuotaNameDefault, ns.GetName()).
//		WithLabels(map[string]string{
//			constants.LabelCreatedBy: constants.CreatedBy,
//			constants.LabelTenant:    tenantQuota.GetName(),
//		}).
//		WithSpec(applycorev1.ResourceQuotaSpec().WithHard(hard))
//
//	obj, err := runtime.DefaultUnstructuredConverter.ToUnstructured(quota)
//	if err != nil {
//		return err
//	}
//	patch := &unstructured.Unstructured{
//		Object: obj,
//	}
//
//	currentApplyConfig, err := applycorev1.ExtractResourceQuota(&currentQuota, constants.ControllerName)
//	if err != nil {
//		return err
//	}
//
//	if equality.Semantic.DeepEqual(quota, currentApplyConfig) {
//		return nil
//	}
//
//	logger.Info("Reconciling resource quota", "resource quota", quota)
//	err = r.Patch(ctx, patch, client.Apply, &client.PatchOptions{
//		FieldManager: constants.ControllerName,
//	})
//	if err != nil {
//		return err
//	}
//
//	return nil
//
//}

// SetupWithManager sets up the controller with the Manager.
func (r *MeteringReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&meteringv1.Metering{}).
		Complete(r)
}
