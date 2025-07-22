/*
Copyright 2024.

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

package controller

import (
	"context"
	"fmt"
	"time"

	devboxv1alpha1 "github.com/labring/sealos/controllers/devbox/api/v1alpha1"
	"github.com/labring/sealos/controllers/devbox/internal/controller/helper"
	"github.com/labring/sealos/controllers/devbox/internal/controller/utils/matcher"
	"github.com/labring/sealos/controllers/devbox/internal/controller/utils/resource"
	"github.com/labring/sealos/controllers/devbox/label"

	"github.com/google/uuid"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/apimachinery/pkg/util/rand"
	"k8s.io/client-go/tools/record"
	"k8s.io/client-go/util/retry"
	"k8s.io/utils/ptr"

	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// DevboxReconciler reconciles a Devbox object
type DevboxReconciler struct {
	CommitImageRegistry string
	DevboxNodeLabel     string
	NodeName            string

	RequestRate      resource.RequestRate
	EphemeralStorage resource.EphemeralStorage

	PodMatchers []matcher.PodMatcher

	DebugMode bool

	client.Client
	Scheme                   *runtime.Scheme
	Recorder                 record.EventRecorder
	RestartPredicateDuration time.Duration
}

// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxes,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxes/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxes/finalizers,verbs=update
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=runtimes,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=runtimeclasses,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=pods,verbs=*
// +kubebuilder:rbac:groups="",resources=pods/status,verbs=get;update;patch
// +kubebuilder:rbac:groups="",resources=services,verbs=*
// +kubebuilder:rbac:groups="",resources=secrets,verbs=*
// +kubebuilder:rbac:groups="",resources=events,verbs=*

func (r *DevboxReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)

	devbox := &devboxv1alpha1.Devbox{}
	if err := r.Get(ctx, req.NamespacedName, devbox); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	recLabels := label.RecommendedLabels(&label.Recommended{
		Name:      devbox.Name,
		ManagedBy: label.DefaultManagedBy,
		PartOf:    devboxv1alpha1.LabelDevBoxPartOf,
	})

	if devbox.ObjectMeta.DeletionTimestamp.IsZero() {
		// retry add finalizer
		err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
			latestDevbox := &devboxv1alpha1.Devbox{}
			if err := r.Get(ctx, req.NamespacedName, latestDevbox); err != nil {
				return client.IgnoreNotFound(err)
			}
			if controllerutil.AddFinalizer(latestDevbox, devboxv1alpha1.FinalizerName) {
				return r.Update(ctx, latestDevbox)
			}
			return nil
		})
		if err != nil {
			return ctrl.Result{}, err
		}
	} else {
		logger.Info("devbox deleted, remove all resources")
		if err := r.removeAll(ctx, devbox, recLabels); err != nil {
			return ctrl.Result{}, err
		}

		logger.Info("devbox deleted, remove finalizer")
		if controllerutil.RemoveFinalizer(devbox, devboxv1alpha1.FinalizerName) {
			if err := r.Update(ctx, devbox); err != nil {
				return ctrl.Result{}, err
			}
		}
		return ctrl.Result{}, nil
	}
	// init devbox status network type
	devbox.Status.Network.Type = devbox.Spec.NetworkSpec.Type
	// init devbox status content id
	if devbox.Status.ContentID == "" {
		devbox.Status.ContentID = uuid.New().String()
	}
	// init devbox status commit record
	if devbox.Status.CommitRecords[devbox.Status.ContentID] == nil {
		devbox.Status.CommitRecords = make(map[string]*devboxv1alpha1.CommitRecord)
		devbox.Status.CommitRecords[devbox.Status.ContentID] = &devboxv1alpha1.CommitRecord{
			Node:         "",
			Image:        devbox.Spec.Image,
			CommitStatus: devboxv1alpha1.CommitStatusPending,
			GenerateTime: metav1.Now(),
		}

	}
	// schedule devbox to node, update devbox status and create a new commit record
	// and filter out the devbox that are not in the current node
	if devbox.Status.CommitRecords[devbox.Status.ContentID].Node == "" {
		// set up devbox node and content id, new a record for the devbox
		devbox.Status.CommitRecords[devbox.Status.ContentID].Node = r.NodeName
		if err := r.Status().Update(ctx, devbox); err != nil {
			logger.Info("try to schedule devbox to node failed", "error", err)
			return ctrl.Result{}, nil
		}
		logger.Info("devbox scheduled to node", "node", r.NodeName)
		r.Recorder.Eventf(devbox, corev1.EventTypeNormal, "Devbox scheduled to node", "Devbox scheduled to node")
	} else if devbox.Status.CommitRecords[devbox.Status.ContentID].Node != r.NodeName {
		logger.Info("devbox already scheduled to node", "node", devbox.Status.CommitRecords[devbox.Status.ContentID].Node)
		return ctrl.Result{}, nil
	}

	// create or update secret
	logger.Info("syncing secret")
	if err := r.syncSecret(ctx, devbox, recLabels); err != nil {
		logger.Error(err, "sync secret failed")
		r.Recorder.Eventf(devbox, corev1.EventTypeWarning, "Sync secret failed", "%v", err)
		return ctrl.Result{}, err
	}
	logger.Info("sync secret success")
	r.Recorder.Eventf(devbox, corev1.EventTypeNormal, "Sync secret success", "Sync secret success")

	// create service if network type is NodePort
	if devbox.Spec.NetworkSpec.Type == devboxv1alpha1.NetworkTypeNodePort {
		logger.Info("syncing service")
		if err := r.Get(ctx, req.NamespacedName, devbox); err != nil {
			return ctrl.Result{}, err
		}
		if err := r.syncService(ctx, devbox, recLabels); err != nil {
			logger.Error(err, "sync service failed")
			r.Recorder.Eventf(devbox, corev1.EventTypeWarning, "Sync service failed", "%v", err)
			return ctrl.Result{}, err
		}
		logger.Info("sync service success")
		r.Recorder.Eventf(devbox, corev1.EventTypeNormal, "Sync service success", "Sync service success")
	}

	// create or update pod
	logger.Info("syncing pod")
	if err := r.syncPod(ctx, devbox, recLabels); err != nil {
		logger.Error(err, "sync pod failed")
		r.Recorder.Eventf(devbox, corev1.EventTypeWarning, "Sync pod failed", "%v", err)
		return ctrl.Result{}, err
	}
	logger.Info("sync pod success")
	r.Recorder.Eventf(devbox, corev1.EventTypeNormal, "Sync pod success", "Sync pod success")

	logger.Info("devbox reconcile success")
	return ctrl.Result{}, nil
}

func (r *DevboxReconciler) syncSecret(ctx context.Context, devbox *devboxv1alpha1.Devbox, recLabels map[string]string) error {
	objectMeta := metav1.ObjectMeta{
		Name:      devbox.Name,
		Namespace: devbox.Namespace,
		Labels:    recLabels,
	}
	devboxSecret := &corev1.Secret{
		ObjectMeta: objectMeta,
	}

	err := r.Get(ctx, client.ObjectKey{Namespace: devbox.Namespace, Name: devbox.Name}, devboxSecret)
	if err == nil {
		// Secret already exists, no need to create

		// TODO: delete this code after we have a way to sync secret to devbox
		// check if SEALOS_DEVBOX_JWT_SECRET is exist, if not exist, create it
		if _, ok := devboxSecret.Data["SEALOS_DEVBOX_JWT_SECRET"]; !ok {
			devboxSecret.Data["SEALOS_DEVBOX_JWT_SECRET"] = []byte(rand.String(32))
			if err := r.Update(ctx, devboxSecret); err != nil {
				return fmt.Errorf("failed to update secret: %w", err)
			}
		}

		if _, ok := devboxSecret.Data["SEALOS_DEVBOX_AUTHORIZED_KEYS"]; !ok {
			devboxSecret.Data["SEALOS_DEVBOX_AUTHORIZED_KEYS"] = devboxSecret.Data["SEALOS_DEVBOX_PUBLIC_KEY"]
			if err := r.Update(ctx, devboxSecret); err != nil {
				return fmt.Errorf("failed to update secret: %w", err)
			}
		}

		return nil
	}
	if client.IgnoreNotFound(err) != nil {
		return fmt.Errorf("failed to get secret: %w", err)
	}

	// Secret not found, create a new one
	publicKey, privateKey, err := helper.GenerateSSHKeyPair()
	if err != nil {
		return fmt.Errorf("failed to generate SSH key pair: %w", err)
	}

	secret := &corev1.Secret{
		ObjectMeta: objectMeta,
		Data: map[string][]byte{
			"SEALOS_DEVBOX_JWT_SECRET":      []byte(rand.String(32)),
			"SEALOS_DEVBOX_PUBLIC_KEY":      publicKey,
			"SEALOS_DEVBOX_PRIVATE_KEY":     privateKey,
			"SEALOS_DEVBOX_AUTHORIZED_KEYS": publicKey,
		},
	}

	if err := controllerutil.SetControllerReference(devbox, secret, r.Scheme); err != nil {
		return fmt.Errorf("failed to set controller reference: %w", err)
	}

	if err := r.Create(ctx, secret); err != nil {
		return fmt.Errorf("failed to create secret: %w", err)
	}
	return nil
}

func (r *DevboxReconciler) syncPod(ctx context.Context, devbox *devboxv1alpha1.Devbox, recLabels map[string]string) error {
	logger := log.FromContext(ctx)
	// update devbox status after pod is created or updated
	var deferUpdateDevboxStatus bool = true
	defer func() {
		if deferUpdateDevboxStatus {
			if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
				logger.Info("update devbox status after pod synced")
				latestDevbox := &devboxv1alpha1.Devbox{}
				if err := r.Client.Get(ctx, client.ObjectKey{Namespace: devbox.Namespace, Name: devbox.Name}, latestDevbox); err != nil {
					logger.Error(err, "get latest devbox failed")
					return err
				}
				// update devbox status with latestDevbox status
				logger.Info("updating devbox status")
				return r.Status().Update(ctx, latestDevbox)
			}); err != nil {
				logger.Error(err, "sync pod failed")
				r.Recorder.Eventf(devbox, corev1.EventTypeWarning, "Sync pod failed", "%v", err)
				return
			}
			logger.Info("update devbox status success")
			r.Recorder.Eventf(devbox, corev1.EventTypeNormal, "Sync pod success", "Sync pod success")
		}
	}()

	podList := &corev1.PodList{}
	if err := r.List(ctx, podList, client.InNamespace(devbox.Namespace), client.MatchingLabels(recLabels)); err != nil {
		return err
	}
	switch devbox.Spec.State {
	case devboxv1alpha1.DevboxStateRunning:
		// get pod
		switch len(podList.Items) {
		case 0:
			// check last devbox status
			currentRecord := devbox.Status.CommitRecords[devbox.Status.ContentID]
			if currentRecord == nil {
				return fmt.Errorf("current record is nil")
			}
			// create a new pod with default image, with new content id
			pod := r.generateDevboxPod(devbox,
				helper.WithPodImage(currentRecord.Image),
				helper.WithPodContentID(devbox.Status.ContentID),
			)
			if err := r.Create(ctx, pod); err != nil {
				return err
			}
		case 1:
			// skip if pod is already created
			return nil
		default:
			// more than one pod found, remove finalizer and delete them
			for _, pod := range podList.Items {
				r.deletePod(ctx, devbox, &pod)
			}
			deferUpdateDevboxStatus = false
			logger.Error(fmt.Errorf("more than one pod found"), "more than one pod found")
			r.Recorder.Eventf(devbox, corev1.EventTypeWarning, "More than one pod found", "More than one pod found")
			return fmt.Errorf("more than one pod found")
		}
	case devboxv1alpha1.DevboxStateStopped, devboxv1alpha1.DevboxStateShutdown:
		if len(podList.Items) > 0 {
			for _, pod := range podList.Items {
				r.deletePod(ctx, devbox, &pod)
			}
		}
		return nil
	}
	return nil
}

func (r *DevboxReconciler) syncService(ctx context.Context, devbox *devboxv1alpha1.Devbox, recLabels map[string]string) error {
	var servicePorts []corev1.ServicePort
	// for _, port := range devbox.Spec.Config.Ports {
	// 	servicePorts = append(servicePorts, corev1.ServicePort{
	// 		Name:       port.Name,
	// 		Port:       port.ContainerPort,
	// 		TargetPort: intstr.FromInt32(port.ContainerPort),
	// 		Protocol:   port.Protocol,
	// 	})
	// }
	if len(servicePorts) == 0 {
		//use the default value
		servicePorts = []corev1.ServicePort{
			{
				Name:       "devbox-ssh-port",
				Port:       22,
				TargetPort: intstr.FromInt32(22),
				Protocol:   corev1.ProtocolTCP,
			},
		}
	}
	expectServiceSpec := corev1.ServiceSpec{
		Selector: recLabels,
		Type:     corev1.ServiceTypeNodePort,
		Ports:    servicePorts,
	}
	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      devbox.Name + "-svc",
			Namespace: devbox.Namespace,
			Labels:    recLabels,
		},
	}
	switch devbox.Spec.State {
	case devboxv1alpha1.DevboxStateShutdown:
		err := r.Client.Delete(ctx, service)
		if err != nil && !errors.IsNotFound(err) {
			return err
		}
		devbox.Status.Network = devboxv1alpha1.NetworkStatus{
			Type:     devboxv1alpha1.NetworkTypeNodePort,
			NodePort: int32(0),
		}
		return r.Status().Update(ctx, devbox)
	case devboxv1alpha1.DevboxStateRunning, devboxv1alpha1.DevboxStateStopped:
		if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, service, func() error {
			// only update some specific fields
			service.Spec.Selector = expectServiceSpec.Selector
			service.Spec.Type = expectServiceSpec.Type
			if len(service.Spec.Ports) == 0 {
				service.Spec.Ports = expectServiceSpec.Ports
			} else {
				service.Spec.Ports[0].Name = expectServiceSpec.Ports[0].Name
				service.Spec.Ports[0].Port = expectServiceSpec.Ports[0].Port
				service.Spec.Ports[0].TargetPort = expectServiceSpec.Ports[0].TargetPort
				service.Spec.Ports[0].Protocol = expectServiceSpec.Ports[0].Protocol
			}
			return controllerutil.SetControllerReference(devbox, service, r.Scheme)
		}); err != nil {
			return err
		}
		// Retrieve the updated Service to get the NodePort
		var updatedService corev1.Service
		err := retry.OnError(
			retry.DefaultRetry,
			func(err error) bool { return client.IgnoreNotFound(err) == nil },
			func() error {
				return r.Client.Get(ctx, client.ObjectKey{Namespace: service.Namespace, Name: service.Name}, &updatedService)
			})
		if err != nil {
			return fmt.Errorf("failed to get updated service: %w", err)
		}

		// Extract the NodePort
		nodePort := int32(0)
		for _, port := range updatedService.Spec.Ports {
			if port.NodePort != 0 {
				nodePort = port.NodePort
				break
			}
		}
		if nodePort == 0 {
			return fmt.Errorf("NodePort not found for service %s", service.Name)
		}
		devbox.Status.Network.Type = devboxv1alpha1.NetworkTypeNodePort
		devbox.Status.Network.NodePort = nodePort
		return r.Status().Update(ctx, devbox)
	}
	return nil
}

func (r *DevboxReconciler) deletePod(ctx context.Context, devbox *devboxv1alpha1.Devbox, pod *corev1.Pod) error {
	logger := log.FromContext(ctx)
	// remove finalizer and delete pod
	controllerutil.RemoveFinalizer(pod, devboxv1alpha1.FinalizerName)
	if err := r.Update(ctx, pod); err != nil {
		logger.Error(err, "remove finalizer failed")
		return err
	}
	if err := r.Delete(ctx, pod, client.GracePeriodSeconds(0), client.PropagationPolicy(metav1.DeletePropagationBackground)); err != nil {
		logger.Error(err, "delete pod failed")
		return err
	}
	return nil
}

func (r *DevboxReconciler) handlePodDeleted(ctx context.Context, devbox *devboxv1alpha1.Devbox, pod *corev1.Pod) error {
	logger := log.FromContext(ctx)
	controllerutil.RemoveFinalizer(pod, devboxv1alpha1.FinalizerName)
	if err := r.Update(ctx, pod); err != nil {
		logger.Error(err, "remove finalizer failed")
		return err
	}
	return nil
}

func (r *DevboxReconciler) removeAll(ctx context.Context, devbox *devboxv1alpha1.Devbox, recLabels map[string]string) error {
	// Delete Pod
	podList := &corev1.PodList{}
	if err := r.List(ctx, podList, client.InNamespace(devbox.Namespace), client.MatchingLabels(recLabels)); err != nil {
		return err
	}
	for _, pod := range podList.Items {
		if controllerutil.RemoveFinalizer(&pod, devboxv1alpha1.FinalizerName) {
			if err := r.Update(ctx, &pod); err != nil {
				return err
			}
		}
	}
	if err := r.deleteResourcesByLabels(ctx, &corev1.Pod{}, devbox.Namespace, recLabels); err != nil {
		return err
	}
	// Delete Service
	if err := r.deleteResourcesByLabels(ctx, &corev1.Service{}, devbox.Namespace, recLabels); err != nil {
		return err
	}
	// Delete Secret
	return r.deleteResourcesByLabels(ctx, &corev1.Secret{}, devbox.Namespace, recLabels)
}

func (r *DevboxReconciler) deleteResourcesByLabels(ctx context.Context, obj client.Object, namespace string, labels map[string]string) error {
	err := r.DeleteAllOf(ctx, obj,
		client.InNamespace(namespace),
		client.MatchingLabels(labels),
	)
	return client.IgnoreNotFound(err)
}

func (r *DevboxReconciler) generateDevboxPod(devbox *devboxv1alpha1.Devbox, opts ...helper.DevboxPodOptions) *corev1.Pod {
	objectMeta := metav1.ObjectMeta{
		Name:        devbox.Name,
		Namespace:   devbox.Namespace,
		Labels:      helper.GeneratePodLabels(devbox),
		Annotations: helper.GeneratePodAnnotations(devbox),
	}

	// ports := devbox.Spec.Config.Ports
	// TODO: add extra ports to pod, currently not support
	// ports = append(ports, devbox.Spec.NetworkSpec.ExtraPorts...)

	envs := devbox.Spec.Config.Env

	volumes := devbox.Spec.Config.Volumes
	volumes = append(volumes, helper.GenerateSSHVolume(devbox))

	volumeMounts := devbox.Spec.Config.VolumeMounts
	volumeMounts = append(volumeMounts, helper.GenerateSSHVolumeMounts()...)

	containers := []corev1.Container{
		{
			Name: devbox.ObjectMeta.Name,
			Env:  envs,
			// Ports:        ports,
			VolumeMounts: volumeMounts,

			WorkingDir: helper.GetWorkingDir(devbox),
			Command:    helper.GetCommand(devbox),
			Args:       helper.GetArgs(devbox),
			Resources:  helper.GenerateResourceRequirements(devbox, r.RequestRate, r.EphemeralStorage)},
	}

	terminationGracePeriodSeconds := 300
	automountServiceAccountToken := false

	runtimeClassName := devbox.Spec.RuntimeClassName
	var runtimeClassNamePtr *string
	if runtimeClassName == "" {
		runtimeClassNamePtr = nil
	} else {
		runtimeClassNamePtr = ptr.To(runtimeClassName)
	}

	expectPod := &corev1.Pod{
		ObjectMeta: objectMeta,
		Spec: corev1.PodSpec{
			TerminationGracePeriodSeconds: ptr.To(int64(terminationGracePeriodSeconds)),
			AutomountServiceAccountToken:  ptr.To(automountServiceAccountToken),
			RestartPolicy:                 corev1.RestartPolicyNever,

			Hostname:   devbox.Name,
			Containers: containers,
			Volumes:    volumes,

			RuntimeClassName: runtimeClassNamePtr,

			NodeSelector: devbox.Spec.NodeSelector,
			Tolerations:  devbox.Spec.Tolerations,
			Affinity:     devbox.Spec.Affinity,
		},
	}
	// set controller reference and finalizer
	_ = controllerutil.SetControllerReference(devbox, expectPod, r.Scheme)
	controllerutil.AddFinalizer(expectPod, devboxv1alpha1.FinalizerName)

	for _, opt := range opts {
		opt(expectPod)
	}

	return expectPod
}

type ControllerRestartPredicate struct {
	predicate.Funcs
	duration  time.Duration
	checkTime time.Time
}

func NewControllerRestartPredicate(duration time.Duration) *ControllerRestartPredicate {
	return &ControllerRestartPredicate{
		checkTime: time.Now().Add(-duration),
		duration:  duration,
	}
}

// skip create event p.duration ago
func (p *ControllerRestartPredicate) Create(e event.CreateEvent) bool {
	return e.Object.GetCreationTimestamp().Time.After(p.checkTime)
}

// SetupWithManager sets up the controller with the Manager.
func (r *DevboxReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 10}).
		For(&devboxv1alpha1.Devbox{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Pod{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})). // enqueue request if pod spec/status is updated
		Owns(&corev1.Service{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		WithEventFilter(NewControllerRestartPredicate(r.RestartPredicateDuration)).
		Complete(r)
}
