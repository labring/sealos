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
	"github.com/labring/sealos/controllers/devbox/label"

	corev1 "k8s.io/api/core/v1"
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
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

const (
	FinalizerName = "devbox.sealos.io/finalizer"
	DevBoxPartOf  = "devbox"
)

// DevboxReconciler reconciles a Devbox object
type DevboxReconciler struct {
	CommitImageRegistry string
	EquatorialStorage   string

	client.Client
	Scheme   *runtime.Scheme
	Recorder record.EventRecorder
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
	logger := log.FromContext(ctx, "devbox", req.NamespacedName)
	devbox := &devboxv1alpha1.Devbox{}

	if err := r.Get(ctx, req.NamespacedName, devbox); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	recLabels := label.RecommendedLabels(&label.Recommended{
		Name:      devbox.Name,
		ManagedBy: label.DefaultManagedBy,
		PartOf:    DevBoxPartOf,
	})

	if devbox.ObjectMeta.DeletionTimestamp.IsZero() {
		if controllerutil.AddFinalizer(devbox, FinalizerName) {
			if err := r.Update(ctx, devbox); err != nil {
				return ctrl.Result{}, err
			}
		}
	} else {
		logger.Info("devbox deleted, remove all resources")
		if err := r.removeAll(ctx, devbox, recLabels); err != nil {
			return ctrl.Result{}, err
		}

		logger.Info("devbox deleted, remove finalizer")
		if controllerutil.RemoveFinalizer(devbox, FinalizerName) {
			if err := r.Update(ctx, devbox); err != nil {
				return ctrl.Result{}, err
			}
		}
	}

	devbox.Status.Network.Type = devbox.Spec.NetworkSpec.Type
	_ = r.Status().Update(ctx, devbox)

	// create or update secret
	logger.Info("create or update secret", "devbox", devbox.Name)
	if err := r.syncSecret(ctx, devbox, recLabels); err != nil {
		logger.Error(err, "create or update secret failed")
		r.Recorder.Eventf(devbox, corev1.EventTypeWarning, "Create secret failed", "%v", err)
		return ctrl.Result{}, err
	}

	// create or update pod
	logger.Info("create or update pod", "devbox", devbox.Name)
	err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		return r.syncPod(ctx, devbox, recLabels)
	})
	if err != nil {
		logger.Error(err, "sync pod failed")
		r.Recorder.Eventf(devbox, corev1.EventTypeWarning, "Sync pod failed", "%v", err)
		return ctrl.Result{}, err
	}

	// create service if network type is NodePort
	if devbox.Spec.NetworkSpec.Type == devboxv1alpha1.NetworkTypeNodePort {
		logger.Info("create service", "devbox", devbox.Name)
		if err := r.syncService(ctx, devbox, recLabels); err != nil {
			logger.Error(err, "Create service failed")
			r.Recorder.Eventf(devbox, corev1.EventTypeWarning, "Create service failed", "%v", err)
			return ctrl.Result{RequeueAfter: time.Second * 3}, err
		}
	}
	logger.Info("create devbox success", "devbox", devbox.Name)
	r.Recorder.Eventf(devbox, corev1.EventTypeNormal, "Created", "create devbox success: %v", devbox.ObjectMeta.Name)

	return ctrl.Result{}, nil
}

func (r *DevboxReconciler) syncSecret(ctx context.Context, devbox *devboxv1alpha1.Devbox, recLabels map[string]string) error {
	logger := log.FromContext(ctx, "devbox", devbox.Name, "namespace", devbox.Namespace)
	objectMeta := metav1.ObjectMeta{
		Name:      devbox.Name,
		Namespace: devbox.Namespace,
		Labels:    recLabels,
	}
	devboxSecret := &corev1.Secret{
		ObjectMeta: objectMeta,
	}

	err := r.Get(ctx, client.ObjectKey{Namespace: devbox.Namespace, Name: devbox.Name}, devboxSecret)
	if err != nil && client.IgnoreNotFound(err) != nil {
		logger.Error(err, "get devbox secret failed")
		return err
	}
	// if secret not found, create a new one
	if err != nil && client.IgnoreNotFound(err) == nil {
		// set password to context, if error then no need to update secret
		publicKey, privateKey, err := helper.GenerateSSHKeyPair()
		if err != nil {
			logger.Error(err, "generate public and private key failed")
			return err
		}
		secret := &corev1.Secret{
			ObjectMeta: objectMeta,
			Data: map[string][]byte{
				"SEALOS_DEVBOX_PASSWORD":    []byte(rand.String(12)),
				"SEALOS_DEVBOX_PUBLIC_KEY":  publicKey,
				"SEALOS_DEVBOX_PRIVATE_KEY": privateKey,
			},
		}
		if err := controllerutil.SetControllerReference(devbox, secret, r.Scheme); err != nil {
			return err
		}
		if err := r.Create(ctx, secret); err != nil {
			logger.Error(err, "create devbox secret failed")
			return err
		}
		return nil
	}
	return nil
}

func (r *DevboxReconciler) syncPod(ctx context.Context, devbox *devboxv1alpha1.Devbox, recLabels map[string]string) error {
	logger := log.FromContext(ctx, "devbox", devbox.Name, "namespace", devbox.Namespace)

	var podList corev1.PodList
	if err := r.List(ctx, &podList, client.InNamespace(devbox.Namespace), client.MatchingLabels(recLabels)); err != nil {
		logger.Error(err, "list devbox pod failed")
		return err
	}
	// only one pod is allowed, if more than one pod found, return error
	if len(podList.Items) > 1 {
		logger.Error(fmt.Errorf("more than one pod found"), "more than one pod found")
		devbox.Status.Phase = devboxv1alpha1.DevboxPhaseError
		err := r.Status().Update(ctx, devbox)
		if err != nil {
			logger.Error(err, "update devbox phase failed")
			return err
		}
		return fmt.Errorf("more than one pod found")
	}

	var runtimeNamespace string
	if devbox.Spec.RuntimeRef.Namespace != "" {
		runtimeNamespace = devbox.Spec.RuntimeRef.Namespace
	} else {
		runtimeNamespace = devbox.Namespace
	}

	runtimecr := &devboxv1alpha1.Runtime{}
	if err := r.Get(ctx, client.ObjectKey{Namespace: runtimeNamespace, Name: devbox.Spec.RuntimeRef.Name}, runtimecr); err != nil {
		return err
	}

	// update devbox pod phase
	defer func() {
		if len(podList.Items) == 1 {
			devbox.Status.DevboxPodPhase = podList.Items[0].Status.Phase
			_ = r.Status().Update(ctx, devbox)
		}
	}()

	nextCommitHistory := r.generateNextCommitHistory(devbox)
	expectPod, err := r.generateDevboxPod(devbox, runtimecr, nextCommitHistory)
	if err != nil {
		logger.Error(err, "generate pod failed")
		return err
	}

	switch devbox.Spec.State {
	case devboxv1alpha1.DevboxStateRunning:
		// check pod status, if no pod found, create a new one, with finalizer and controller reference
		if len(podList.Items) == 0 {
			if err := r.Create(ctx, expectPod); err != nil {
				logger.Error(err, "create pod failed")
				devbox.Status.Phase = devboxv1alpha1.DevboxPhaseError
				err := r.Status().Update(ctx, devbox)
				if err != nil {
					logger.Error(err, "update devbox phase failed")
					return err
				}
				return err
			}
			// add next commit history to status
			devbox.Status.CommitHistory = append(devbox.Status.CommitHistory, nextCommitHistory)
			return r.Status().Update(ctx, devbox)
		}
		// else if pod found, check pod status
		// if pod is pending
		//    check if pod is being deleting, if true, we need update commit history status to failed by pod name
		// if pod is running
		//    assume the commit status is success, update commit history status to success by pod name
		// if pod is succeeded
		//    remove finalizer and delete pod, next reconcile will create a new pod, and update commit history status to success
		if len(podList.Items) == 1 {
			// if pod is being deleting, we need remove finalizer and delete pod.
			removeFlag := false
			if !podList.Items[0].DeletionTimestamp.IsZero() {
				removeFlag = true
				if controllerutil.RemoveFinalizer(&podList.Items[0], FinalizerName) {
					_ = r.Update(ctx, &podList.Items[0])
				}
				_ = r.Delete(ctx, &podList.Items[0])
			}

			// check pod status and update commit history status
			switch podList.Items[0].Status.Phase {
			case corev1.PodPending:
				// if pod is pending and removeFlag is true, update commit history status to failed by pod name
				if removeFlag {
					return r.updateDevboxCommitHistory(ctx, devbox, &podList.Items[0])
				}
				if !helper.CheckPodConsistency(expectPod, &podList.Items[0]) {
					logger.Info("pod is pending, but pod spec is not consistent, delete pod")
					logger.Info("pod", "pod", podList.Items[0].Name, "pod spec", podList.Items[0].Spec)
					logger.Info("expect pod", "pod", expectPod.Name, "pod spec", expectPod.Spec)
					_ = r.Delete(ctx, &podList.Items[0])
				}
				devbox.Status.Phase = devboxv1alpha1.DevboxPhasePending
				err := r.Status().Update(ctx, devbox)
				if err != nil {
					logger.Error(err, "update devbox phase failed")
					return err
				}
			case corev1.PodRunning:
				//if pod is running,check pod need restart
				if !helper.CheckPodConsistency(expectPod, &podList.Items[0]) {
					logger.Info("pod is running, but pod spec is not consistent, delete pod")
					logger.Info("pod", "pod", podList.Items[0].Name, "pod spec", podList.Items[0].Spec)
					logger.Info("expect pod", "pod", expectPod.Name, "pod spec", expectPod.Spec)
					_ = r.Delete(ctx, &podList.Items[0])
				}
				devbox.Status.Phase = devboxv1alpha1.DevboxPhaseRunning
				err = r.Status().Update(ctx, devbox)
				if err != nil {
					logger.Error(err, "update devbox phase failed")
					return err
				}
				return r.updateDevboxCommitHistory(ctx, devbox, &podList.Items[0])
			case corev1.PodSucceeded:
				if controllerutil.RemoveFinalizer(&podList.Items[0], FinalizerName) {
					if err := r.Update(ctx, &podList.Items[0]); err != nil {
						logger.Error(err, "remove finalizer failed")
						return err
					}
				}
				_ = r.Delete(ctx, &podList.Items[0])
				// update commit history status to success by pod name
				return r.updateDevboxCommitHistory(ctx, devbox, &podList.Items[0])
			case corev1.PodFailed:
				// we can't find the reason of failure, we assume the commit status is failed
				// todo maybe use pod condition to get the reason of failure and update commit history status to failed by pod name
				devbox.Status.Phase = devboxv1alpha1.DevboxPhaseError
				err = r.Status().Update(ctx, devbox)
				if err != nil {
					logger.Error(err, "update devbox phase failed")
					return err
				}
				return r.updateDevboxCommitHistory(ctx, devbox, &podList.Items[0])
			}
		}
	case devboxv1alpha1.DevboxStateStopped:
		// check pod status, if no pod found, do nothing
		if len(podList.Items) == 0 {
			devbox.Status.Phase = devboxv1alpha1.DevboxPhaseStopped
			err = r.Status().Update(ctx, devbox)
			if err != nil {
				logger.Error(err, "update devbox phase failed")
			}
			return nil
		}
		// if pod found, remove finalizer and delete pod
		if len(podList.Items) == 1 {
			devbox.Status.Phase = devboxv1alpha1.DevboxPhaseStopping
			err := r.Status().Update(ctx, devbox)
			if err != nil {
				logger.Error(err, "update devbox phase failed")
				return err
			}
			// remove finalizer and delete pod
			if controllerutil.RemoveFinalizer(&podList.Items[0], FinalizerName) {
				if err := r.Update(ctx, &podList.Items[0]); err != nil {
					logger.Error(err, "remove finalizer failed")
					return err
				}
			}
			_ = r.Delete(ctx, &podList.Items[0])
			devbox.Status.Phase = devboxv1alpha1.DevboxPhaseStopped
			err = r.Status().Update(ctx, devbox)
			if err != nil {
				logger.Error(err, "update devbox phase failed")
			}
			return r.updateDevboxCommitHistory(ctx, devbox, &podList.Items[0])
		}
	}
	return nil
}

func commitSuccess(podStatus corev1.PodPhase) bool {
	switch podStatus {
	case corev1.PodSucceeded, corev1.PodRunning:
		return true
	case corev1.PodPending, corev1.PodFailed:
		return false
	}
	return false
}

func (r *DevboxReconciler) removeAll(ctx context.Context, devbox *devboxv1alpha1.Devbox, recLabels map[string]string) error {
	// Delete Pod
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

func (r *DevboxReconciler) updateDevboxCommitHistory(ctx context.Context, devbox *devboxv1alpha1.Devbox, pod *corev1.Pod) error {
	for i := len(devbox.Status.CommitHistory) - 1; i >= 0; i-- {
		if devbox.Status.CommitHistory[i].Pod == pod.Name {
			// based on pod status, update commit history status
			if commitSuccess(pod.Status.Phase) {
				devbox.Status.CommitHistory[i].Status = devboxv1alpha1.CommitStatusSuccess
			} else {
				devbox.Status.CommitHistory[i].Status = devboxv1alpha1.CommitStatusFailed
			}
			return r.Status().Update(ctx, devbox)
		}
	}
	return nil
}

func (r *DevboxReconciler) generateDevboxPod(devbox *devboxv1alpha1.Devbox, runtime *devboxv1alpha1.Runtime, nextCommitHistory *devboxv1alpha1.CommitHistory) (*corev1.Pod, error) {
	objectMeta := metav1.ObjectMeta{
		Name:        nextCommitHistory.Pod,
		Namespace:   devbox.Namespace,
		Labels:      helper.GeneratePodLabels(devbox, runtime),
		Annotations: helper.GeneratePodAnnotations(devbox, runtime),
	}

	// set up ports and env by using runtime ports and devbox extra ports
	ports := runtime.Spec.Config.Ports
	ports = append(ports, devbox.Spec.NetworkSpec.ExtraPorts...)

	envs := runtime.Spec.Config.Env
	envs = append(envs, devbox.Spec.ExtraEnvs...)
	envs = append(envs, helper.GenerateDevboxEnvVars(devbox, nextCommitHistory)...)

	//get image name
	imageName, err := helper.GetLastSuccessCommitImageName(devbox, runtime)
	if err != nil {
		return nil, err
	}

	volumes := runtime.Spec.Config.Volumes
	volumes = append(volumes, helper.GenerateSSHVolume(devbox))
	volumes = append(volumes, devbox.Spec.ExtraVolumes...)

	volumeMounts := runtime.Spec.Config.VolumeMounts
	volumeMounts = append(volumeMounts, helper.GenerateSSHVolumeMounts())
	volumeMounts = append(volumeMounts, devbox.Spec.ExtraVolumeMounts...)

	containers := []corev1.Container{
		{
			Name:         devbox.ObjectMeta.Name,
			Image:        imageName,
			Env:          envs,
			Ports:        ports,
			VolumeMounts: volumeMounts,

			WorkingDir: helper.GenerateWorkingDir(devbox, runtime),
			Command:    helper.GenerateCommand(devbox, runtime),
			Args:       helper.GenerateDevboxArgs(devbox, runtime),
			Resources:  helper.GenerateResourceRequirements(devbox, r.EquatorialStorage),
		},
	}

	terminationGracePeriodSeconds := 300
	automountServiceAccountToken := false

	expectPod := &corev1.Pod{
		ObjectMeta: objectMeta,
		Spec: corev1.PodSpec{
			TerminationGracePeriodSeconds: ptr.To(int64(terminationGracePeriodSeconds)),
			AutomountServiceAccountToken:  ptr.To(automountServiceAccountToken),
			RestartPolicy:                 corev1.RestartPolicyNever,

			Hostname:   devbox.Name,
			Containers: containers,
			Volumes:    volumes,

			Tolerations: devbox.Spec.Tolerations,
			Affinity:    devbox.Spec.Affinity,
		},
	}
	if err = controllerutil.SetControllerReference(devbox, expectPod, r.Scheme); err != nil {
		return nil, err
	}
	controllerutil.AddFinalizer(expectPod, FinalizerName)
	return expectPod, nil
}

func (r *DevboxReconciler) syncService(ctx context.Context, devbox *devboxv1alpha1.Devbox, recLabels map[string]string) error {
	expectServiceSpec := corev1.ServiceSpec{
		Selector: recLabels,
		Type:     corev1.ServiceTypeNodePort,
		Ports: []corev1.ServicePort{
			{
				Name:       "tty",
				Port:       22,
				TargetPort: intstr.FromInt32(22),
				Protocol:   corev1.ProtocolTCP,
			},
		},
	}

	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      devbox.Name + "-svc",
			Namespace: devbox.Namespace,
			Labels:    recLabels,
		},
	}

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

func (r *DevboxReconciler) generateNextCommitHistory(devbox *devboxv1alpha1.Devbox) *devboxv1alpha1.CommitHistory {
	now := time.Now()
	return &devboxv1alpha1.CommitHistory{
		Image:  r.generateImageName(devbox),
		Time:   metav1.Time{Time: now},
		Pod:    devbox.Name + "-" + rand.String(5),
		Status: devboxv1alpha1.CommitStatusPending,
	}
}

func (r *DevboxReconciler) generateImageName(devbox *devboxv1alpha1.Devbox) string {
	now := time.Now()
	return fmt.Sprintf("%s/%s/%s:%s", r.CommitImageRegistry, devbox.Namespace, devbox.Name, rand.String(5)+"-"+now.Format("2006-01-02-150405"))
}

// SetupWithManager sets up the controller with the Manager.
func (r *DevboxReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&devboxv1alpha1.Devbox{}).
		Owns(&corev1.Pod{}).
		Owns(&corev1.Service{}).
		Watches(
			&corev1.Pod{},
			handler.EnqueueRequestForOwner(mgr.GetScheme(), mgr.GetRESTMapper(), &devboxv1alpha1.Devbox{}),
			builder.WithPredicates(predicate.ResourceVersionChangedPredicate{}),
		).
		Complete(r)
}
