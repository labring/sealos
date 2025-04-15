package controllers

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"sigs.k8s.io/controller-runtime/pkg/builder"

	"github.com/go-logr/logr"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// NamespaceQuotaReconciler reconciles namespace events and adjusts quotas
type NamespaceQuotaReconciler struct {
	client.Client
	Logger   logr.Logger
	Scheme   *runtime.Scheme
	Recorder record.EventRecorder
}

// +kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch
// +kubebuilder:rbac:groups=core,resources=events,verbs=get;list;watch;create;patch
// +kubebuilder:rbac:groups=core,resources=resourcequotas,verbs=get;list;watch;create;update;patch

// Reconcile handles namespace events
func (r *NamespaceQuotaReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	// Skip non-ns- prefixed namespaces
	if !strings.HasPrefix(req.Name, "ns-") {
		return ctrl.Result{}, nil
	}

	// Get namespace
	ns := &corev1.Namespace{}
	if err := r.Get(ctx, req.NamespacedName, ns); err != nil {
		r.Logger.Error(err, "unable to fetch Namespace")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// Get events for this namespace
	events := &corev1.EventList{}
	if err := r.List(ctx, events, client.InNamespace(req.Name)); err != nil {
		r.Logger.Error(err, "unable to list Events", "namespace", req.Name)
		return ctrl.Result{}, err
	}

	// Check for quota exceeded errors
	for _, evt := range events.Items {
		if strings.Contains(evt.Message, "exceeded quota") && evt.Reason == "FailedCreate" {
			if err := r.handleQuotaExceeded(ctx, ns); err != nil {
				r.Logger.Error(err, "failed to handle quota exceeded", "namespace", ns.Name, "event", evt.Message)
				return ctrl.Result{RequeueAfter: 5 * time.Minute}, err
			}
			r.Recorder.Event(ns, corev1.EventTypeNormal, "QuotaAdjusted", fmt.Sprintf("Increased quota by 50%% due to %s", evt.Message))
		}
	}

	return ctrl.Result{}, nil
}

// handleQuotaExceeded increases quota by 50% if not already increased
func (r *NamespaceQuotaReconciler) handleQuotaExceeded(ctx context.Context, ns *corev1.Namespace) error {
	quotas := &corev1.ResourceQuotaList{}
	if err := r.List(ctx, quotas, client.InNamespace(ns.Name)); err != nil {
		return fmt.Errorf("failed to list ResourceQuotas: %w", err)
	}
	if len(quotas.Items) == 0 || len(quotas.Items) > 1 {
		r.Logger.Info("No ResourceQuota found or multiple found, skipping update", "namespace", ns.Name)
		return nil
	}

	quota := quotas.Items[0]
	newQuota := quota.DeepCopy()
	updateRequired := false

	// Check if quota was recently updated
	if lastUpdate, exists := quota.Annotations["last-quota-update"]; exists {
		lastUpdateTime, err := time.Parse(time.RFC3339, lastUpdate)
		if err == nil && time.Since(lastUpdateTime) < 1*time.Hour {
			r.Logger.Info("Quota was recently updated, skipping update", "namespace", ns.Name)
			return nil
		}
	}

	// Increase CPU and memory quotas by 50%
	for resourceName, quantity := range newQuota.Spec.Hard {
		if resourceName == corev1.ResourceLimitsCPU || resourceName == corev1.ResourceRequestsCPU ||
			resourceName == corev1.ResourceLimitsMemory || resourceName == corev1.ResourceRequestsMemory ||
			resourceName == corev1.ResourceRequestsStorage {
			newQuantity := resource.MustParse(
				fmt.Sprintf("%.0f", float64(quantity.Value())*1.5),
			)
			newQuota.Spec.Hard[resourceName] = newQuantity
			updateRequired = true
		}
	}

	if updateRequired {
		// Add/update annotation for last update time
		if newQuota.Annotations == nil {
			newQuota.Annotations = make(map[string]string)
		}
		newQuota.Annotations["last-quota-update"] = time.Now().UTC().Format(time.RFC3339)

		numStr, ok := newQuota.Annotations["auto-adapt-quota-num"]
		if !ok {
			numStr = "0"
		}
		num, err := strconv.Atoi(numStr)
		if err != nil {
			r.Logger.Error(err, "failed to parse quota number", "namespace", ns.Name)
			num = 0
		}
		newQuota.Annotations["auto-adapt-quota-num"] = strconv.Itoa(num + 1)
		if err := r.Update(ctx, newQuota); err != nil {
			return fmt.Errorf("failed to update ResourceQuota %s: %w", newQuota.Name, err)
		}
		r.Logger.Info("ResourceQuota updated", "namespace", ns.Name, "newQuota", newQuota.Spec.Hard)
	}

	return nil
}

// SetupWithManager sets up the controller with the Manager
func (r *NamespaceQuotaReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.Logger = ctrl.Log.WithName("namespace-quota-controller")
	return ctrl.NewControllerManagedBy(mgr).
		For(&corev1.Namespace{}, builder.WithPredicates(&NormalUserNamespacePredicate{})).
		WithEventFilter(predicate.Funcs{
			CreateFunc: func(e event.CreateEvent) bool {
				return strings.HasPrefix(e.Object.GetName(), "ns-")
			},
			UpdateFunc: func(e event.UpdateEvent) bool {
				return strings.HasPrefix(e.ObjectNew.GetName(), "ns-")
			},
			DeleteFunc: func(e event.DeleteEvent) bool {
				return false // Don't reconcile on delete
			},
		}).
		Owns(&corev1.Event{}).
		Complete(r)
}

type NormalUserNamespacePredicate struct {
	predicate.Funcs
}

func (n *NormalUserNamespacePredicate) Update(_ event.UpdateEvent) bool {
	return false
}

func (n *NormalUserNamespacePredicate) Create(c event.CreateEvent) bool {
	if !strings.HasPrefix(c.Object.GetName(), "ns-") {
		return false
	}
	annos := c.Object.GetAnnotations()
	if annos != nil {
		if status, ok := annos["debt.sealos/status"]; ok && status != "Normal" {
			return false
		}
	}
	return true
}

func (n *NormalUserNamespacePredicate) Delete(_ event.DeleteEvent) bool {
	return false
}

func (n *NormalUserNamespacePredicate) Generic(_ event.GenericEvent) bool {
	return false
}
