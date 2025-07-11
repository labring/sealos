package controllers

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/labring/sealos/controllers/pkg/utils/env"

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
	Logger              logr.Logger
	Scheme              *runtime.Scheme
	limitExpansionCycle time.Duration
	Recorder            record.EventRecorder
	namespaceLocks      map[string]*sync.Mutex
}

// +kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch
// +kubebuilder:rbac:groups=core,resources=events,verbs=get;list;watch;create;patch
// +kubebuilder:rbac:groups=core,resources=resourcequotas,verbs=get;list;watch;create;update;patch

// Reconcile handles namespace events
func (r *NamespaceQuotaReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	evt := &corev1.Event{}
	if err := r.Get(ctx, req.NamespacedName, evt); err == nil {
		if strings.Contains(evt.Message, "exceeded quota") && (evt.Reason == "FailedCreate" || evt.Reason == "Devbox is exceeded quota") {
			// lock
			if r.namespaceLocks[evt.Namespace] == nil {
				r.namespaceLocks[evt.Namespace] = &sync.Mutex{}
			}
			// Try to acquire the lock
			if r.namespaceLocks[evt.Namespace].TryLock() {
				defer r.namespaceLocks[evt.Namespace].Unlock()
			} else {
				r.Logger.Info("Namespace is already being processed", "namespace", evt.Namespace)
				return ctrl.Result{}, nil
			}
			if err := r.handleQuotaExceeded(ctx, evt); err != nil {
				r.Logger.Error(err, "failed to handle quota exceeded", "namespace", evt.Namespace, "event", evt.Message)
				return ctrl.Result{RequeueAfter: 5 * time.Minute}, err
			}
		}
	} else if client.IgnoreNotFound(err) != nil {
		return ctrl.Result{}, err
	}
	return ctrl.Result{}, nil
}

// handleQuotaExceeded increases quota by 50% if not already increased
func (r *NamespaceQuotaReconciler) handleQuotaExceeded(ctx context.Context, evt *corev1.Event) error {
	ns := evt.Namespace
	quotas := &corev1.ResourceQuotaList{}
	if err := r.List(ctx, quotas, client.InNamespace(ns)); err != nil {
		return fmt.Errorf("failed to list ResourceQuotas: %w", err)
	}
	if len(quotas.Items) == 0 || len(quotas.Items) > 1 {
		return nil
	}

	quota := quotas.Items[0]
	newQuota := quota.DeepCopy()

	// Check if quota was recently updated
	if quota.Labels != nil {
		if lastUpdate, exists := quota.Labels["last-quota-update"]; exists {
			lastUpdateTime, err := time.Parse("2006-01-02-15-04-05", lastUpdate)
			if err == nil && time.Since(lastUpdateTime) < r.limitExpansionCycle {
				r.Logger.Info("Quota was recently updated, skipping update", "namespace", ns)
				return nil
			}
		}
	}

	if updateRequired := AdjustQuota(newQuota); updateRequired {
		// Add/update label for last update time
		if newQuota.Labels == nil {
			newQuota.Labels = make(map[string]string)
		}
		newQuota.Labels["last-quota-update"] = time.Now().UTC().Format("2006-01-02-15-04-05")

		numStr, ok := newQuota.Labels["auto-adapt-quota-num"]
		if !ok {
			numStr = "0"
		}
		num, err := strconv.Atoi(numStr)
		if err != nil {
			r.Logger.Error(err, "failed to parse quota number", "namespace", ns)
			num = 0
		}
		newQuota.Labels["auto-adapt-quota-num"] = strconv.Itoa(num + 1)
		if err := r.Update(ctx, newQuota); err != nil {
			return fmt.Errorf("failed to update ResourceQuota %s: %w", newQuota.Name, err)
		}
		r.Logger.Info("Quota updated", "namespace", ns, "history count", num, "newQuota", newQuota.Spec.Hard)
		r.Recorder.Event(evt, corev1.EventTypeNormal, "QuotaAdjusted", fmt.Sprintf("Increased quota by 50%% due to event msg: '%s'", evt.Message))
	}

	return nil
}

// getResourceUsage retrieves the used quantity for a given resource from the ResourceQuota status.
func getResourceUsage(resourceName corev1.ResourceName, status corev1.ResourceQuotaStatus) (resource.Quantity, error) {
	usedQuantity, exists := status.Used[resourceName]
	if !exists {
		return resource.Quantity{}, fmt.Errorf("resource %s not found in status", resourceName)
	}
	return usedQuantity, nil
}

func AdjustQuota(quota *corev1.ResourceQuota) bool {
	updateRequired := false

	// Define base and upper limits for each resource
	limits := map[corev1.ResourceName]struct {
		baseLimit  resource.Quantity
		upperLimit resource.Quantity
	}{
		corev1.ResourceLimitsCPU: {
			baseLimit:  resource.MustParse("64"),
			upperLimit: resource.MustParse("200"),
		},
		corev1.ResourceRequestsCPU: {
			baseLimit:  resource.MustParse("64"),
			upperLimit: resource.MustParse("200"),
		},
		corev1.ResourceLimitsMemory: {
			baseLimit:  resource.MustParse("256Gi"),
			upperLimit: resource.MustParse("1024Gi"),
		},
		corev1.ResourceRequestsMemory: {
			baseLimit:  resource.MustParse("256Gi"),
			upperLimit: resource.MustParse("1024Gi"),
		},
		corev1.ResourceRequestsStorage: {
			baseLimit:  resource.MustParse("300Gi"),
			upperLimit: resource.MustParse("800Gi"),
		},
		corev1.ResourceServicesNodePorts: {
			baseLimit:  resource.MustParse("50"),
			upperLimit: resource.MustParse("200"),
		},
	}

	for resourceName, quantity := range quota.Spec.Hard {
		if resourceName == corev1.ResourceLimitsCPU || resourceName == corev1.ResourceRequestsCPU ||
			resourceName == corev1.ResourceLimitsMemory || resourceName == corev1.ResourceRequestsMemory ||
			resourceName == corev1.ResourceRequestsStorage || resourceName == corev1.ResourceServicesNodePorts {
			limit, exists := limits[resourceName]
			if !exists {
				continue
			}

			// Case 1: Below base limit, double the quota
			if quantity.Cmp(limit.baseLimit) < 0 {
				newQuantity := resource.MustParse(
					fmt.Sprintf("%.0f", float64(quantity.Value())*2),
				)
				quota.Spec.Hard[resourceName] = resource.MustParse(formatQuantity(newQuantity, resourceName))
				updateRequired = true
				continue
			}

			// Case 3: Between base and upper limit, check usage ratio
			usedQuantity, err := getResourceUsage(resourceName, quota.Status)
			if err != nil {
				continue
			}

			// Calculate usage ratio
			usageRatio := float64(usedQuantity.Value()) / float64(quantity.Value())

			// Expand quota by 1.5x if usage is above 50%
			if usageRatio > 0.5 {
				newQuantity := resource.MustParse(
					fmt.Sprintf("%.0f", float64(quantity.Value())*1.5),
				)
				// Check if new quantity exceeds upper limit
				if quantity.Cmp(limit.upperLimit) >= 0 {
					newQuantity = resource.MustParse(
						fmt.Sprintf("%.0f", float64(quantity.Value())*1.3),
					)
				}
				// Ensure new quantity does not exceed upper limit
				if newQuantity.Cmp(limit.upperLimit) > 0 {
					newQuantity = limit.upperLimit
				}
				quota.Spec.Hard[resourceName] = resource.MustParse(formatQuantity(newQuantity, resourceName))
				updateRequired = true
			}
		}
	}

	return updateRequired
}

func formatQuantity(quantity resource.Quantity, resourceName corev1.ResourceName) string {
	switch resourceName {
	case corev1.ResourceLimitsCPU, corev1.ResourceRequestsCPU:
		// Use cores if >= 1000m, otherwise use milliCPU
		if quantity.MilliValue() >= 1000 {
			return fmt.Sprintf("%.2f", float64(quantity.MilliValue())/1000)
		}
		return quantity.String()
	case corev1.ResourceLimitsMemory, corev1.ResourceRequestsMemory:
		// Use GiB if >= 1Gi, otherwise use MiB or bytes
		if quantity.Value() >= 1<<30 { // 1 GiB
			return fmt.Sprintf("%.0fGi", float64(quantity.Value())/(1<<30))
		} else if quantity.Value() >= 1<<20 { // 1 MiB
			return fmt.Sprintf("%.0fMi", float64(quantity.Value())/(1<<20))
		}
		return quantity.String()
	case corev1.ResourceRequestsStorage, corev1.ResourceLimitsEphemeralStorage:
		// Use GiB if >= 1Gi, otherwise use MiB
		if quantity.Value() >= 1<<30 { // 1 GiB
			return fmt.Sprintf("%.0fGi", float64(quantity.Value())/(1<<30))
		} else if quantity.Value() >= 1<<20 { // 1 MiB
			return fmt.Sprintf("%.0fMi", float64(quantity.Value())/(1<<20))
		}
		return quantity.String()
	default:
		return quantity.String()
	}
}

// SetupWithManager sets up the controller with the Manager
func (r *NamespaceQuotaReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.Logger = ctrl.Log.WithName("namespace-quota-controller")
	r.namespaceLocks = make(map[string]*sync.Mutex)
	r.limitExpansionCycle = env.GetDurationEnvWithDefault("LIMIT_QUOTA_EXPANSION_CYCLE", 24*time.Hour)

	checkEventPredicate := func(obj client.Object) bool {
		eventObj, ok := obj.(*corev1.Event)
		if !ok || (eventObj.Reason != "FailedCreate" && eventObj.Reason != "Devbox is exceeded quota") || !strings.Contains(eventObj.Message, "exceeded quota") || strings.Contains(eventObj.Message, "debt-limit0") {
			return false
		}

		// Get the namespace of the Event
		nsName := obj.GetNamespace()
		if !strings.HasPrefix(nsName, "ns-") {
			return false
		}

		// Fetch the namespace object to check annotations
		var ns corev1.Namespace
		if err := mgr.GetClient().Get(context.Background(), client.ObjectKey{Name: nsName}, &ns); err != nil {
			r.Logger.Error(err, "Failed to fetch namespace", "namespace", nsName)
			return false
		}

		annos := ns.GetAnnotations()
		if annos != nil {
			if status, ok := annos["debt.sealos/status"]; ok && status != "Normal" {
				return false
			}
		}
		return true
	}
	// Predicate for filtering Events based on their namespace and reason
	eventPredicate := predicate.Funcs{
		CreateFunc: func(e event.CreateEvent) bool {
			return checkEventPredicate(e.Object)
		},
		UpdateFunc: func(e event.UpdateEvent) bool {
			return checkEventPredicate(e.ObjectNew)
		},
		DeleteFunc: func(e event.DeleteEvent) bool {
			return false // Don't reconcile on delete
		},
		GenericFunc: func(e event.GenericEvent) bool {
			return checkEventPredicate(e.Object)
		},
	}

	return ctrl.NewControllerManagedBy(mgr).
		For(&corev1.Event{}, builder.WithPredicates(eventPredicate)).
		Complete(r)
}
