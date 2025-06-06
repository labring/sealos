/*
Copyright 2025.

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

	"github.com/go-logr/logr"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/workqueue"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

// NetworkReconciler reconciles Namespace, Ingress, and Service objects to manage network traffic
type NetworkReconciler struct {
	Client client.Client
	Log    logr.Logger
}

const (
	NetworkStatusAnnoKey   = "network.sealos.io/status"
	NetworkSuspend         = "Suspend"
	NetworkResume          = "Resume"
	NetworkResumeCompleted = "ResumeCompleted"
	NodePortLabelKey       = "network.sealos.io/original-nodeport"
	IngressClassKey        = "kubernetes.io/ingress.class"

	Disable = "disable"
	True    = "true"
)

//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch;update;patch
//+kubebuilder:rbac:groups=networking.k8s.io,resources=ingresses,verbs=get;list;watch;update;patch
//+kubebuilder:rbac:groups=core,resources=services,verbs=get;list;watch;update;patch

func (r *NetworkReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := r.Log.WithValues("Namespace", req.Namespace, "Name", req.NamespacedName)

	logger.Info("Reconciling Network")
	// Fetch the namespace
	ns := corev1.Namespace{}
	keyObj := client.ObjectKey{Name: req.Namespace}
	if req.Namespace == "" && req.Name != "" {
		keyObj = client.ObjectKey{Name: req.Name}
	}
	if err := r.Client.Get(ctx, keyObj, &ns); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// Skip if namespace is terminating
	if ns.Status.Phase == corev1.NamespaceTerminating {
		logger.Info("namespace is terminating")
		return ctrl.Result{}, nil
	}

	// Check network status annotation
	networkStatus, ok := ns.Annotations[NetworkStatusAnnoKey]
	if !ok {
		logger.Info("no network status annotation found")
		return ctrl.Result{}, nil
	}

	logger.Info("network status", "status", networkStatus)

	// Skip completed state
	if networkStatus == NetworkResumeCompleted {
		logger.Info("skipping completed network status")
		return ctrl.Result{}, nil
	}

	switch networkStatus {
	case NetworkSuspend:
		// If NamespacedName.Namespace is empty, then req is the namespace itself, and req.namespacedname.name is the Name of the namespace
		if req.NamespacedName.Namespace == "" {
			// Handle namespace suspension
			if err := r.suspendNetworkResources(ctx, req.Name); err != nil {
				logger.Error(err, "failed to suspend network resources")
				return ctrl.Result{}, err
			}
			break
		}
		if err := r.handleResource(ctx, req.NamespacedName, ns); err != nil {
			logger.Error(err, "failed to handle resource")
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	case NetworkResume:
		namespace := req.Namespace
		if req.Namespace == "" {
			namespace = req.Name
		}
		// Handle namespace resumption
		if err := r.resumeNetworkResources(ctx, namespace); err != nil {
			logger.Error(err, "failed to resume network resources")
			return ctrl.Result{}, err
		}
		// Update namespace status
		if ns.Annotations == nil {
			ns.Annotations = make(map[string]string)
		}
		ns.Annotations[NetworkStatusAnnoKey] = NetworkResumeCompleted
		if err := r.Client.Update(ctx, &ns); err != nil {
			logger.Error(err, "failed to update namespace network status to ResumeCompleted")
			return ctrl.Result{}, err
		}
	default:
		logger.Error(fmt.Errorf("unknown network status"), "", "status", networkStatus)
	}

	return ctrl.Result{}, nil
}

func (r *NetworkReconciler) handleResource(ctx context.Context, key client.ObjectKey, ns corev1.Namespace) error {
	// Only process resources in suspended namespaces
	networkStatus, ok := ns.Annotations[NetworkStatusAnnoKey]
	if !ok || networkStatus != NetworkSuspend {
		return nil
	}

	// Try fetching as Ingress
	ingress := networkingv1.Ingress{}
	if err := r.Client.Get(ctx, key, &ingress); err == nil {
		if ingress.Annotations == nil {
			ingress.Annotations = make(map[string]string)
		}
		if ingress.Annotations[IngressClassKey] != Disable {
			ingress.Annotations[IngressClassKey] = Disable
			if err := r.Client.Update(ctx, &ingress); err != nil {
				return fmt.Errorf("failed to suspend ingress %s: %w", key.Name, err)
			}
			r.Log.V(1).Info("Suspended ingress", "name", key.Name)
		}
		return nil
	} else if !errors.IsNotFound(err) {
		return fmt.Errorf("failed to get ingress %s: %w", key.Name, err)
	}

	// Try fetching as Service
	svc := corev1.Service{}
	if err := r.Client.Get(ctx, key, &svc); err == nil {
		if svc.Spec.Type == corev1.ServiceTypeNodePort && (svc.Labels == nil || svc.Labels[NodePortLabelKey] != True) {
			if svc.Labels == nil {
				svc.Labels = make(map[string]string)
			}
			svc.Labels[NodePortLabelKey] = True
			svc.Spec.Type = corev1.ServiceTypeClusterIP
			if err := r.Client.Update(ctx, &svc); err != nil {
				return fmt.Errorf("failed to suspend service %s: %w", key.Name, err)
			}
			r.Log.V(1).Info("Suspended service", "name", key.Name)
		}
		return nil
	} else if !errors.IsNotFound(err) {
		return fmt.Errorf("failed to get service %s: %w", key.Name, err)
	}

	return nil
}

func (r *NetworkReconciler) suspendNetworkResources(ctx context.Context, namespace string) error {
	// Suspend Ingresses
	ingressList := networkingv1.IngressList{}
	if err := r.Client.List(ctx, &ingressList, client.InNamespace(namespace)); err != nil {
		return fmt.Errorf("failed to list ingresses in namespace %s: %w", namespace, err)
	}
	for _, ingress := range ingressList.Items {
		if ingress.Annotations == nil {
			ingress.Annotations = make(map[string]string)
		}
		if ingress.Annotations[IngressClassKey] != Disable {
			ingress.Annotations[IngressClassKey] = Disable
			if err := r.Client.Update(ctx, &ingress); err != nil {
				return fmt.Errorf("failed to suspend ingress %s: %w", ingress.Name, err)
			}
			r.Log.V(1).Info("Suspended ingress", "name", ingress.Name)
		}
	}

	// Suspend NodePort Services
	serviceList := corev1.ServiceList{}
	if err := r.Client.List(ctx, &serviceList, client.InNamespace(namespace)); err != nil {
		return fmt.Errorf("failed to list services in namespace %s: %w", namespace, err)
	}
	for _, svc := range serviceList.Items {
		if svc.Spec.Type != corev1.ServiceTypeNodePort {
			continue
		}
		if svc.Labels == nil {
			svc.Labels = make(map[string]string)
		}
		svc.Labels[NodePortLabelKey] = True
		svc.Spec.Type = corev1.ServiceTypeClusterIP
		if err := r.Client.Update(ctx, &svc); err != nil {
			return fmt.Errorf("failed to suspend service %s: %w", svc.Name, err)
		}
		r.Log.V(1).Info("Suspended service", "name", svc.Name)
	}

	return nil
}

func (r *NetworkReconciler) resumeNetworkResources(ctx context.Context, namespace string) error {
	// Resume Ingresses
	ingressList := networkingv1.IngressList{}
	if err := r.Client.List(ctx, &ingressList, client.InNamespace(namespace)); err != nil {
		return fmt.Errorf("failed to list ingresses in namespace %s: %w", namespace, err)
	}
	for _, ingress := range ingressList.Items {
		if ingress.Annotations == nil || ingress.Annotations[IngressClassKey] != Disable {
			continue
		}
		ingress.Annotations[IngressClassKey] = "nginx"
		if err := r.Client.Update(ctx, &ingress); err != nil {
			return fmt.Errorf("failed to resume ingress %s: %w", ingress.Name, err)
		}
		r.Log.V(1).Info("Resumed ingress", "name", ingress.Name)
	}

	// Resume NodePort Services
	serviceList := corev1.ServiceList{}
	if err := r.Client.List(ctx, &serviceList, client.InNamespace(namespace)); err != nil {
		return fmt.Errorf("failed to list services in namespace %s: %w", namespace, err)
	}
	for _, svc := range serviceList.Items {
		if svc.Labels == nil || svc.Labels[NodePortLabelKey] != True {
			continue
		}
		svc.Spec.Type = corev1.ServiceTypeNodePort
		delete(svc.Labels, NodePortLabelKey)
		if err := r.Client.Update(ctx, &svc); err != nil {
			return fmt.Errorf("failed to resume service %s: %w", svc.Name, err)
		}
		r.Log.V(1).Info("Resumed service", "name", svc.Name)
	}

	return nil
}

// SuspendedNamespaceHandler enqueues requests for Ingress and Service objects only in suspended namespaces
type SuspendedNamespaceHandler struct {
	Client client.Client
	Logger logr.Logger
}

func (e *SuspendedNamespaceHandler) Create(ctx context.Context, evt event.TypedCreateEvent[client.Object], q workqueue.TypedRateLimitingInterface[reconcile.Request]) {
	if isNil(evt.Object) {
		e.Logger.Error(nil, "CreateEvent received with no metadata", "event", evt)
		return
	}

	ns := corev1.Namespace{}
	if err := e.Client.Get(ctx, types.NamespacedName{Name: evt.Object.GetNamespace()}, &ns); err != nil {
		e.Logger.Error(err, "failed to get namespace", "namespace", evt.Object.GetNamespace())
		return
	}

	networkStatus, ok := ns.Annotations[NetworkStatusAnnoKey]
	if !ok || networkStatus != NetworkSuspend {
		return
	}

	item := reconcile.Request{NamespacedName: types.NamespacedName{
		Name:      evt.Object.GetName(),
		Namespace: evt.Object.GetNamespace(),
	}}
	q.Add(item)
}

func (e *SuspendedNamespaceHandler) Update(ctx context.Context, evt event.TypedUpdateEvent[client.Object], q workqueue.TypedRateLimitingInterface[reconcile.Request]) {
	if !isNil(evt.ObjectNew) {
		ns := corev1.Namespace{}
		if err := e.Client.Get(ctx, types.NamespacedName{Name: evt.ObjectNew.GetNamespace()}, &ns); err != nil {
			e.Logger.Error(err, "failed to get namespace", "namespace", evt.ObjectNew.GetNamespace())
			return
		}

		networkStatus, ok := ns.Annotations[NetworkStatusAnnoKey]
		if !ok || networkStatus != NetworkSuspend {
			return
		}

		item := reconcile.Request{NamespacedName: types.NamespacedName{
			Name:      evt.ObjectNew.GetName(),
			Namespace: evt.ObjectNew.GetNamespace(),
		}}
		q.Add(item)
	} else if !isNil(evt.ObjectOld) {
		ns := corev1.Namespace{}
		if err := e.Client.Get(ctx, types.NamespacedName{Name: evt.ObjectOld.GetNamespace()}, &ns); err != nil {
			e.Logger.Error(err, "failed to get namespace", "namespace", evt.ObjectOld.GetNamespace())
			return
		}

		networkStatus, ok := ns.Annotations[NetworkStatusAnnoKey]
		if !ok || networkStatus != NetworkSuspend {
			return
		}

		item := reconcile.Request{NamespacedName: types.NamespacedName{
			Name:      evt.ObjectOld.GetName(),
			Namespace: evt.ObjectOld.GetNamespace(),
		}}
		q.Add(item)
	} else {
		e.Logger.Error(nil, "UpdateEvent received with no metadata", "event", evt)
	}
}

func (e *SuspendedNamespaceHandler) Delete(ctx context.Context, evt event.TypedDeleteEvent[client.Object], q workqueue.TypedRateLimitingInterface[reconcile.Request]) {
	// No action needed for delete events
}

func (e *SuspendedNamespaceHandler) Generic(ctx context.Context, evt event.TypedGenericEvent[client.Object], q workqueue.TypedRateLimitingInterface[reconcile.Request]) {
	// No action needed for generic events
}

func isNil(arg any) bool {
	if v := reflect.ValueOf(arg); !v.IsValid() || ((v.Kind() == reflect.Ptr ||
		v.Kind() == reflect.Interface ||
		v.Kind() == reflect.Slice ||
		v.Kind() == reflect.Map ||
		v.Kind() == reflect.Chan ||
		v.Kind() == reflect.Func) && v.IsNil()) {
		return true
	}
	return false
}

func (r *NetworkReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.Log = ctrl.Log.WithName("controllers").WithName("Network")
	r.Client = mgr.GetClient()
	suspendedHandler := &SuspendedNamespaceHandler{Client: r.Client, Logger: r.Log}

	return ctrl.NewControllerManagedBy(mgr).
		For(&corev1.Namespace{}, builder.WithPredicates(NetworkAnnotationPredicate{})).
		Watches(
			&networkingv1.Ingress{},
			suspendedHandler,
			builder.WithPredicates(predicate.Funcs{
				CreateFunc: func(e event.CreateEvent) bool {
					return true
				},
				UpdateFunc: func(e event.UpdateEvent) bool {
					newIngress, ok := e.ObjectNew.(*networkingv1.Ingress)
					if !ok {
						return false
					}
					return newIngress.Annotations != nil && newIngress.Annotations[IngressClassKey] != Disable
				},
				DeleteFunc: func(e event.DeleteEvent) bool {
					return false
				},
				GenericFunc: func(e event.GenericEvent) bool {
					return false
				},
			}),
		).
		Watches(
			&corev1.Service{},
			suspendedHandler,
			builder.WithPredicates(predicate.Funcs{
				CreateFunc: func(e event.CreateEvent) bool {
					svc, ok := e.Object.(*corev1.Service)
					if !ok {
						return false
					}
					return svc.Spec.Type == corev1.ServiceTypeNodePort
				},
				UpdateFunc: func(e event.UpdateEvent) bool {
					newSvc, ok := e.ObjectNew.(*corev1.Service)
					if !ok {
						return false
					}
					return newSvc.Spec.Type == corev1.ServiceTypeNodePort && (newSvc.Labels == nil || newSvc.Labels[NodePortLabelKey] != True)
				},
				DeleteFunc: func(e event.DeleteEvent) bool {
					return false
				},
				GenericFunc: func(e event.GenericEvent) bool {
					return false
				},
			}),
		).
		Complete(r)
}

// NetworkAnnotationPredicate filters namespace events based on network status annotation changes
type NetworkAnnotationPredicate struct {
	predicate.Funcs
}

func (NetworkAnnotationPredicate) Create(e event.CreateEvent) bool {
	networkStatus, ok := e.Object.GetAnnotations()[NetworkStatusAnnoKey]
	return ok && networkStatus != NetworkResumeCompleted
}

func (NetworkAnnotationPredicate) Update(e event.UpdateEvent) bool {
	oldObj, ok1 := e.ObjectOld.(*corev1.Namespace)
	newObj, ok2 := e.ObjectNew.(*corev1.Namespace)
	if !ok1 || !ok2 || newObj.Annotations == nil {
		return false
	}
	oldStatus := oldObj.Annotations[NetworkStatusAnnoKey]
	newStatus := newObj.Annotations[NetworkStatusAnnoKey]
	return oldStatus != newStatus && newStatus != NetworkResumeCompleted
}

func (NetworkAnnotationPredicate) Delete(e event.DeleteEvent) bool {
	return false
}

func (NetworkAnnotationPredicate) Generic(e event.GenericEvent) bool {
	return false
}
