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
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/apimachinery/pkg/util/rand"
	"k8s.io/client-go/tools/record"
	"k8s.io/utils/ptr"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const (
	rate          = 10
	FinalizerName = "devbox.sealos.io/finalizer"
	Devbox        = "devbox"
	DevBoxPartOf  = "devbox"
)

// DevboxReconciler reconciles a Devbox object
type DevboxReconciler struct {
	CommitImageRegistry string

	client.Client
	Scheme   *runtime.Scheme
	Recorder record.EventRecorder
}

// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxes,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxes/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxes/finalizers,verbs=update
// +kubebuilder:rbac:groups=core,resources=pods,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=core,resources=pods/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=core,resources=services,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch;create;update;patch;delete

func (r *DevboxReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx, "devbox", req.NamespacedName)
	devbox := &devboxv1alpha1.Devbox{}
	if err := r.Get(ctx, req.NamespacedName, devbox); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	if devbox.ObjectMeta.DeletionTimestamp.IsZero() {
		if controllerutil.AddFinalizer(devbox, FinalizerName) {
			if err := r.Update(ctx, devbox); err != nil {
				return ctrl.Result{}, err
			}
		}
	} else {
		if devbox.Spec.State == devboxv1alpha1.DevboxStateRunning {
			devbox.Spec.State = devboxv1alpha1.DevboxStateStopped
			return ctrl.Result{}, r.Update(ctx, devbox)
		}
		if controllerutil.RemoveFinalizer(devbox, FinalizerName) {
			if err := r.Update(ctx, devbox); err != nil {
				return ctrl.Result{}, err
			}
		}
	}

	devbox.Status.Network.Type = devbox.Spec.NetworkSpec.Type
	_ = r.Status().Update(ctx, devbox)

	recLabels := label.RecommendedLabels(&label.Recommended{
		Name:      devbox.Name,
		ManagedBy: label.DefaultManagedBy,
		PartOf:    DevBoxPartOf,
	})

	// create or update secret
	if err := r.syncSecret(ctx, devbox, recLabels); err != nil {
		logger.Error(err, "create or update secret failed")
		r.Recorder.Eventf(devbox, corev1.EventTypeWarning, "Create secret failed", "%v", err)
		return ctrl.Result{}, err
	}

	if err := r.syncPod(ctx, devbox, recLabels); err != nil {
		logger.Error(err, "sync pod failed")
		r.Recorder.Eventf(devbox, corev1.EventTypeWarning, "Sync pod failed", "%v", err)
		return ctrl.Result{}, err
	}

	// create service if network type is NodePort
	if devbox.Spec.NetworkSpec.Type == devboxv1alpha1.NetworkTypeNodePort {
		if err := r.syncService(ctx, devbox, recLabels); err != nil {
			logger.Error(err, "Create service failed")
			r.Recorder.Eventf(devbox, corev1.EventTypeWarning, "Create service failed", "%v", err)
			return ctrl.Result{RequeueAfter: time.Second * 3}, err
		}
	}
	r.Recorder.Eventf(devbox, corev1.EventTypeNormal, "Created", "create devbox success: %v", devbox.ObjectMeta.Name)
	return ctrl.Result{Requeue: false}, nil
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
		return fmt.Errorf("more than one pod found")
	}

	switch devbox.Spec.State {
	case devboxv1alpha1.DevboxStateRunning:
		// check pod status, if no pod found, create a new one, with finalizer and controller reference
		if len(podList.Items) == 0 {
			nextCommitHistory := r.generateNextCommitHistory(devbox)
			expectPod, err := r.generateDevboxPod(ctx, devbox, nextCommitHistory)
			if err != nil {
				logger.Error(err, "generate pod failed")
				return err
			}
			if err := r.Create(ctx, expectPod); err != nil {
				logger.Error(err, "create pod failed")
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
				if !helper.CheckPodConsistency(devbox, &podList.Items[0]) {
					_ = r.Delete(ctx, &podList.Items[0])
				}
			case corev1.PodRunning:
				//if pod is running,check pod need restart
				if !helper.CheckPodConsistency(devbox, &podList.Items[0]) {
					_ = r.Delete(ctx, &podList.Items[0])
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
				return r.updateDevboxCommitHistory(ctx, devbox, &podList.Items[0])
			}
		}

	case devboxv1alpha1.DevboxStateStopped:
		// check pod status, if no pod found, do nothing
		if len(podList.Items) == 0 {
			return nil
		}
		// if pod found, remove finalizer and delete pod
		if len(podList.Items) == 1 {
			// remove finalizer and delete pod
			if controllerutil.RemoveFinalizer(&podList.Items[0], FinalizerName) {
				if err := r.Update(ctx, &podList.Items[0]); err != nil {
					logger.Error(err, "remove finalizer failed")
					return err
				}
			}
			_ = r.Delete(ctx, &podList.Items[0])
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

func (r *DevboxReconciler) generateDevboxPod(ctx context.Context, devbox *devboxv1alpha1.Devbox, nextCommitHistory *devboxv1alpha1.CommitHistory) (*corev1.Pod, error) {
	objectMeta := metav1.ObjectMeta{
		Name:      nextCommitHistory.Pod,
		Namespace: devbox.Namespace,
		Labels:    r.getRecLabels(devbox),
	}

	ports := []corev1.ContainerPort{
		{
			Name:          "ssh",
			Protocol:      corev1.ProtocolTCP,
			ContainerPort: 22,
		},
	}
	ports = append(ports, devbox.Spec.NetworkSpec.ExtraPorts...)
	envs := []corev1.EnvVar{
		{
			Name:  "SEALOS_COMMIT_ON_STOP",
			Value: "true",
		},
		{
			Name:  "SEALOS_COMMIT_IMAGE_NAME",
			Value: nextCommitHistory.Image,
		},
		{
			Name:  "SEALOS_COMMIT_IMAGE_SQUASH",
			Value: fmt.Sprintf("%v", devbox.Spec.Squash),
		},
		{
			Name:  "SEALOS_DEVBOX_NAME",
			Value: devbox.ObjectMeta.Namespace + devbox.ObjectMeta.Name,
		},
		{
			Name: "SEALOS_DEVBOX_PASSWORD",
			ValueFrom: &corev1.EnvVarSource{
				SecretKeyRef: &corev1.SecretKeySelector{
					Key: "SEALOS_DEVBOX_PASSWORD",
					LocalObjectReference: corev1.LocalObjectReference{
						Name: devbox.Name,
					},
				},
			},
		},
		{
			Name: "SEALOS_DEVBOX_POD_UID",
			ValueFrom: &corev1.EnvVarSource{
				FieldRef: &corev1.ObjectFieldSelector{
					FieldPath: "metadata.uid",
				},
			},
		},
	}

	//get image name
	imageName, err := r.getLastSuccessCommitImageName(ctx, devbox)
	if err != nil {
		return nil, err
	}

	containers := []corev1.Container{
		{
			Name:  devbox.ObjectMeta.Name,
			Image: imageName,
			Ports: ports,
			Env:   envs,
			Resources: corev1.ResourceRequirements{
				Requests: calculateResourceRequest(
					corev1.ResourceList{
						corev1.ResourceCPU:    devbox.Spec.Resource["cpu"],
						corev1.ResourceMemory: devbox.Spec.Resource["memory"],
					},
				),
				Limits: corev1.ResourceList{
					"cpu":    devbox.Spec.Resource["cpu"],
					"memory": devbox.Spec.Resource["memory"],
				},
			},
			VolumeMounts: []corev1.VolumeMount{
				{
					Name:      "devbox-ssh-public-key",
					MountPath: "/usr/start/.ssh",
					ReadOnly:  true,
				},
			},
		},
	}
	volume := []corev1.Volume{
		{
			Name: "devbox-ssh-public-key",
			VolumeSource: corev1.VolumeSource{
				Secret: &corev1.SecretVolumeSource{
					SecretName: devbox.Name,
					Items: []corev1.KeyToPath{
						{
							Key:  "SEALOS_DEVBOX_PUBLIC_KEY",
							Path: "id.pub",
						},
					},
				},
			},
		},
	}
	terminationGracePeriodSeconds := 300
	automountServiceAccountToken := false
	expectPod := &corev1.Pod{
		ObjectMeta: objectMeta,
		Spec: corev1.PodSpec{
			Hostname:                      devbox.Name,
			RestartPolicy:                 corev1.RestartPolicyNever,
			Containers:                    containers,
			Volumes:                       volume,
			TerminationGracePeriodSeconds: ptr.To(int64(terminationGracePeriodSeconds)),
			AutomountServiceAccountToken:  ptr.To(automountServiceAccountToken),
		},
	}
	if err = controllerutil.SetControllerReference(devbox, expectPod, r.Scheme); err != nil {
		return nil, err
	}
	controllerutil.AddFinalizer(expectPod, FinalizerName)
	return expectPod, nil
}

func (r *DevboxReconciler) getLastSuccessCommitImageName(ctx context.Context, devbox *devboxv1alpha1.Devbox) (string, error) {
	// get image name from runtime if commit history is empty
	rt := &devboxv1alpha1.Runtime{}
	if err := r.Get(ctx, client.ObjectKey{Namespace: devbox.Namespace, Name: devbox.Spec.RuntimeRef.Name}, rt); err != nil {
		return "", err
	}
	if devbox.Status.CommitHistory == nil || len(devbox.Status.CommitHistory) == 0 {
		return rt.Spec.Image, nil
	}
	// get image name from commit history, ues the latest commit history
	for i := len(devbox.Status.CommitHistory) - 1; i >= 0; i-- {
		if devbox.Status.CommitHistory[i].Status == devboxv1alpha1.CommitStatusSuccess {
			return devbox.Status.CommitHistory[i].Image, nil
		}
	}
	// if all commit history is failed, get image name from runtime
	return rt.Spec.Image, nil
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
	if err := r.Client.Get(ctx, client.ObjectKey{Namespace: service.Namespace, Name: service.Name}, &updatedService); err != nil {
		return err
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

func (r *DevboxReconciler) getRecLabels(devbox *devboxv1alpha1.Devbox) map[string]string {
	return label.RecommendedLabels(&label.Recommended{
		Name:      devbox.Name,
		ManagedBy: label.DefaultManagedBy,
		PartOf:    DevBoxPartOf,
	})
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
	return fmt.Sprintf("%s/%s/%s:%s", r.CommitImageRegistry, devbox.Namespace, devbox.Name, now.Format("2006-01-02-150405"))
}

func calculateResourceRequest(limit corev1.ResourceList) corev1.ResourceList {
	if limit == nil {
		return nil
	}
	request := make(corev1.ResourceList)
	// Calculate CPU request
	if cpu, ok := limit[corev1.ResourceCPU]; ok {
		cpuValue := cpu.AsApproximateFloat64()
		cpuRequest := cpuValue / rate
		request[corev1.ResourceCPU] = *resource.NewMilliQuantity(int64(cpuRequest*1000), resource.DecimalSI)
	}
	// Calculate memory request
	if memory, ok := limit[corev1.ResourceMemory]; ok {
		memoryValue := memory.AsApproximateFloat64()
		memoryRequest := memoryValue / rate
		request[corev1.ResourceMemory] = *resource.NewQuantity(int64(memoryRequest), resource.BinarySI)
	}
	return request
}

// SetupWithManager sets up the controller with the Manager.
func (r *DevboxReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&devboxv1alpha1.Devbox{}).
		Owns(&corev1.Pod{}).
		Owns(&corev1.Service{}).
		Complete(r)
}
