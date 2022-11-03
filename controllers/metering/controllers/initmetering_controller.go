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
	"os"
	"strconv"
	"time"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/types"

	"github.com/go-logr/logr"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/source"

	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
)

// InitMeteringReconciler reconciles a InitMetering object
type InitMeteringReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	logr.Logger
}

func DefaultResourceQuota() corev1.ResourceList {
	return corev1.ResourceList{
		//corev1.ResourceRequestsCPU:    resource.MustParse("100"),
		corev1.ResourceLimitsCPU: resource.MustParse("100"),
		//corev1.ResourceRequestsMemory: resource.MustParse("100"),
		corev1.ResourceLimitsMemory: resource.MustParse("100Gi"),
		//For all PVCs, the total demand for storage resources cannot exceed this value
		//corev1.ResourceRequestsStorage:       resource.MustParse("100Gi"),
		//corev1.ResourceName("limit.storage"): resource.MustParse("100Gi"),
		//Local ephemeral storage
		corev1.ResourceLimitsEphemeralStorage: resource.MustParse("100Gi"),
		//corev1.ResourceRequestsEphemeralStorage: resource.MustParse("100Gi"),
	}
}

//+kubebuilder:rbac:groups=metering.sealos.io,resources=initmeterings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=initmeterings/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=metering.sealos.io,resources=initmeterings/finalizers,verbs=update
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meteringquotas,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meteringquotas/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meteringquotas/finalizers,verbs=update
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meterings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meterings/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meterings/finalizers,verbs=update
//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=resourcequotas,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=resource-quotas,verbs=get;list;watch;create;update;patch;delete

// Responsible for initializing metering and metering Quota when creating ns

func (r *InitMeteringReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger = log.FromContext(ctx)
	var ns corev1.Namespace

	err := r.Get(ctx, req.NamespacedName, &ns)
	if err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	r.Logger.Info(fmt.Sprintf("ns Name:%v", ns.Name))

	// check this ns is user namespace
	if _, ok := ns.Annotations[userv1.UserAnnotationOwnerKey]; !ok {
		r.Logger.Info(fmt.Sprintf("not found owner of namespace name: %v", ns.Name))
		return ctrl.Result{}, nil
	}

	extensionResourcesPriceList := meteringv1.ExtensionResourcesPriceList{}
	err = r.List(ctx, &extensionResourcesPriceList)
	if err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	totalResourcePrice := make(map[corev1.ResourceName]meteringv1.ResourcePrice, 0)
	for _, extensionResourcesPrice := range extensionResourcesPriceList.Items {
		r.Logger.Info(fmt.Sprintf("extensionResourcesPrice Name:%v,resourcePrice:%v", extensionResourcesPrice.Name, extensionResourcesPrice.Spec.Resources))
		for k, v := range extensionResourcesPrice.Spec.Resources {
			totalResourcePrice[k] = v
		}
	}
	var timeInterval string
	if timeInterval = os.Getenv("METERING_INTERVAL"); timeInterval == "" {
		timeInterval = "60"
	}

	// init meteringQuota
	r.Logger.Info("init meteringQuota")
	if err = r.syncMeteringQuota(ctx, ns, totalResourcePrice); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// init metering
	interval, _ := strconv.Atoi(timeInterval)
	if err = r.syncMetering(ctx, ns, totalResourcePrice, interval); err != nil {
		r.Logger.Error(err, "Failed to create Metering")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	return ctrl.Result{}, nil
}

func (r *InitMeteringReconciler) syncMetering(ctx context.Context, ns corev1.Namespace, resourcePrice map[corev1.ResourceName]meteringv1.ResourcePrice, timeInterval int) error {
	SealosSystemNamespace := os.Getenv(METERINGNAMESPACE)
	r.Logger.Info(fmt.Sprintf("SealosSystemNamespace:%v", SealosSystemNamespace))
	metering := meteringv1.Metering{
		ObjectMeta: metav1.ObjectMeta{
			Name:      MeteringPrefix + ns.Name,
			Namespace: SealosSystemNamespace,
		},
	}

	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &metering, func() error {
		metering.Spec.TimeInterval = timeInterval
		metering.Spec.Owner = ns.Annotations[userv1.UserAnnotationOwnerKey]
		metering.Spec.Namespace = ns.Name
		return nil
	}); err != nil {
		return fmt.Errorf("sync resource quota failed: %v", err)
	}
	metering.Status.LatestUpdateTime = time.Now().Unix()
	metering.Status.Resources = resourcePrice
	metering.Status.TotalAmount = 0
	err := r.Status().Update(ctx, &metering)
	if err != nil {
		return err
	}
	// get or create resourceQuota
	if err := r.syncResourceQuota(ctx, metering); err != nil {
		return err
	}
	return nil
}

func (r *InitMeteringReconciler) syncResourceQuota(ctx context.Context, metering meteringv1.Metering) error {
	quota := &corev1.ResourceQuota{
		ObjectMeta: metav1.ObjectMeta{
			Name:      ResourceQuotaPrefix + metering.Spec.Namespace,
			Namespace: metering.Spec.Namespace,
		},
	}

	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, quota, func() error {
		if quota.Spec.Hard == nil {
			quota.Spec.Hard = DefaultResourceQuota()
		}
		return nil
	}); err != nil {
		return fmt.Errorf("sync resource quota failed: %v", err)
	}
	return nil
}

func (r *InitMeteringReconciler) syncMeteringQuota(ctx context.Context, ns corev1.Namespace, totalResourcePrice map[corev1.ResourceName]meteringv1.ResourcePrice) error {
	meteringQuota := meteringv1.MeteringQuota{}

	if err := r.Get(ctx, types.NamespacedName{Name: MeteringQuotaPrefix + ns.Name, Namespace: ns.Name}, &meteringQuota); err != nil {
		if errors.IsNotFound(err) {
			meteringQuota = meteringv1.MeteringQuota{
				ObjectMeta: metav1.ObjectMeta{
					Name:      MeteringQuotaPrefix + ns.Name,
					Namespace: ns.Name,
				},
				Status: meteringv1.MeteringQuotaStatus{
					Resources: ResourcePrice2MeteringQuota(totalResourcePrice, ns.Annotations[userv1.UserAnnotationOwnerKey]),
				},
			}
			if err := r.Create(ctx, &meteringQuota); err != nil {
				return err
			}
		} else {
			return err
		}
	}

	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *InitMeteringReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "init-metering-controller"
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	r.Logger = ctrl.Log.WithName(controllerName)
	r.Logger.Info(fmt.Sprintf("env interval:%v", os.Getenv("METERING_INTERVAL")))
	return ctrl.NewControllerManagedBy(mgr).
		For(&meteringv1.InitMetering{}).
		Watches(&source.Kind{Type: &corev1.Namespace{}}, &handler.EnqueueRequestForObject{}).
		Complete(r)
}
