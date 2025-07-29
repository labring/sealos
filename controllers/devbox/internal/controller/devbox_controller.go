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
	"math"
	"strconv"
	"time"

	devboxv1alpha1 "github.com/labring/sealos/controllers/devbox/api/v1alpha1"
	"github.com/labring/sealos/controllers/devbox/internal/controller/helper"
	"github.com/labring/sealos/controllers/devbox/internal/controller/utils/matcher"
	"github.com/labring/sealos/controllers/devbox/internal/controller/utils/resource"
	"github.com/labring/sealos/controllers/devbox/internal/stat"
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
	Scheme              *runtime.Scheme
	Recorder            record.EventRecorder
	StateChangeRecorder record.EventRecorder

	RestartPredicateDuration time.Duration
	AcceptanceThreshold      int
	stat.NodeStatsProvider
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
		devbox.Status.State = devboxv1alpha1.DevboxStateRunning
		devbox.Status.CommitRecords[devbox.Status.ContentID] = &devboxv1alpha1.CommitRecord{
			Node:         "",
			BaseImage:    devbox.Spec.Image,
			CommitImage:  r.generateImageName(devbox),
			CommitStatus: devboxv1alpha1.CommitStatusPending,
			GenerateTime: metav1.Now(),
		}
	}

	// todo: implement the schedule logic to replace the current logic
	// if devbox state is running, schedule devbox to node, update devbox status and create a new commit record
	// and filter out the devbox that are not in the current node
	if devbox.Spec.State == devboxv1alpha1.DevboxStateRunning {
		if devbox.Status.CommitRecords[devbox.Status.ContentID].Node == "" && r.getAcceptanceScore(ctx) >= r.AcceptanceThreshold {
			// if devbox is not scheduled to node, schedule it to current node
			logger.Info("devbox not scheduled to node, try scheduling to us now",
				"nodeName", r.NodeName,
				"contentID", devbox.Status.ContentID)
			// set up devbox node and content id, new a record for the devbox
			devbox.Status.CommitRecords[devbox.Status.ContentID].Node = r.NodeName
			if err := r.Status().Update(ctx, devbox); err != nil {
				logger.Info("try to schedule devbox to node failed. This devbox may have already been scheduled to another node", "error", err)
				return ctrl.Result{}, err
			}
			logger.Info("devbox scheduled to node", "node", r.NodeName)
			r.Recorder.Eventf(devbox, corev1.EventTypeNormal, "Devbox scheduled to node", "Devbox scheduled to node")
		} else if devbox.Status.CommitRecords[devbox.Status.ContentID].Node != r.NodeName {
			logger.Info("devbox already scheduled to node", "node", devbox.Status.CommitRecords[devbox.Status.ContentID].Node)
			return ctrl.Result{}, nil
		}
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

	// sync devbox state
	logger.Info("syncing devbox state")
	if stateChanged := r.syncDevboxState(ctx, devbox); stateChanged {
		logger.Info("devbox state changed, wait for state change handler to handle the event, requeue after 5 seconds", "from", devbox.Status.State, "to", devbox.Spec.State)
		r.Recorder.Eventf(devbox, corev1.EventTypeNormal, "Devbox state changed", "Devbox state changed from %s to %s", devbox.Status.State, devbox.Spec.State)
		return ctrl.Result{RequeueAfter: 5 * time.Second}, nil
	}
	logger.Info("sync devbox state success")

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
				helper.WithPodImage(currentRecord.BaseImage),
				helper.WithPodContentID(devbox.Status.ContentID),
				helper.WithPodNodeName(currentRecord.Node),
			)
			if err := r.Create(ctx, pod); err != nil {
				return err
			}
		case 1:
			// skip if pod is already created
			if !podList.Items[0].DeletionTimestamp.IsZero() {
				return r.handlePodDeleted(ctx, &podList.Items[0])
			}
			return nil
		default:
			// more than one pod found, remove finalizer and delete them
			for _, pod := range podList.Items {
				r.deletePod(ctx, &pod)
			}
			logger.Error(fmt.Errorf("more than one pod found"), "more than one pod found")
			r.Recorder.Eventf(devbox, corev1.EventTypeWarning, "More than one pod found", "More than one pod found")
			return fmt.Errorf("more than one pod found")
		}
	case devboxv1alpha1.DevboxStateStopped, devboxv1alpha1.DevboxStateShutdown:
		if len(podList.Items) > 0 {
			for _, pod := range podList.Items {
				r.deletePod(ctx, &pod)
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

// sync devbox state, and record the state change event to state change recorder, state change handler will handle the event
func (r *DevboxReconciler) syncDevboxState(ctx context.Context, devbox *devboxv1alpha1.Devbox) bool {
	logger := log.FromContext(ctx)
	logger.Info("syncDevboxState called",
		"devbox", devbox.Name,
		"specState", devbox.Spec.State,
		"statusState", devbox.Status.State,
		"nodeName", r.NodeName)

	if devbox.Spec.State != devbox.Status.State {
		logger.Info("devbox state changing",
			"from", devbox.Status.State,
			"to", devbox.Spec.State,
			"devbox", devbox.Name)
		logger.Info("recording state change event",
			"devbox", devbox.Name,
			"nodeName", r.NodeName)
		r.StateChangeRecorder.Eventf(devbox, corev1.EventTypeNormal, "Devbox state changed", "Devbox state changed from %s to %s", devbox.Status.State, devbox.Spec.State)
		return true
	}
	logger.Info("devbox state unchanged",
		"devbox", devbox.Name,
		"state", devbox.Spec.State)
	return false
}

func (r *DevboxReconciler) deletePod(ctx context.Context, pod *corev1.Pod) error {
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

func (r *DevboxReconciler) handlePodDeleted(ctx context.Context, pod *corev1.Pod) error {
	logger := log.FromContext(ctx)
	controllerutil.RemoveFinalizer(pod, devboxv1alpha1.FinalizerName)
	if err := r.Update(ctx, pod); err != nil {
		logger.Error(err, "remove finalizer failed")
		return err
	}
	return nil
}

func (r *DevboxReconciler) generateImageName(devbox *devboxv1alpha1.Devbox) string {
	now := time.Now()
	return fmt.Sprintf("%s/%s/%s:%s-%s", r.CommitImageRegistry, devbox.Namespace, devbox.Name, rand.String(5), now.Format("2006-01-02-150405"))
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
func (r *DevboxReconciler) getAcceptanceConsideration(ctx context.Context) (helper.AcceptanceConsideration, error) {
	logger := log.FromContext(ctx)
	node := &corev1.Node{}
	if err := r.Get(context.Background(), client.ObjectKey{Name: r.NodeName}, node); err != nil {
		return helper.AcceptanceConsideration{}, err
	}
	ann := node.Annotations
	ac := helper.AcceptanceConsideration{}
	if v, err := strconv.Atoi(ann[devboxv1alpha1.AnnotationContainerFSAvailableThreshold]); err != nil {
		logger.Error(err, "failed to parse containerfs available threshold. use default value instead", "value", ann[devboxv1alpha1.AnnotationContainerFSAvailableThreshold])
		ac.ContainerFSAvailableThreshold = helper.DefaultContainerFSAvailableThreshold
	} else {
		ac.ContainerFSAvailableThreshold = uint(v)
	}
	if v, err := strconv.Atoi(ann[devboxv1alpha1.AnnotationCPURequestRatio]); err != nil {
		logger.Error(err, "failed to parse CPU request ratio. use default value instead", "value", ann[devboxv1alpha1.AnnotationCPURequestRatio])
		ac.CPURequestRatio = helper.DefaultCPURequestRatio
	} else {
		ac.CPURequestRatio = uint(v)
	}
	if v, err := strconv.Atoi(ann[devboxv1alpha1.AnnotationCPULimitRatio]); err != nil {
		logger.Error(err, "failed to parse CPU limit ratio. use default value instead", "value", ann[devboxv1alpha1.AnnotationCPULimitRatio])
		ac.CPULimitRatio = helper.DefaultCPULimitRatio
	} else {
		ac.CPULimitRatio = uint(v)
	}
	if v, err := strconv.Atoi(ann[devboxv1alpha1.AnnotationMemoryRequestRatio]); err != nil {
		logger.Error(err, "failed to parse memory request ratio. use default value instead", "value", ann[devboxv1alpha1.AnnotationMemoryRequestRatio])
		ac.MemoryRequestRatio = helper.DefaultMemoryRequestRatio
	} else {
		ac.MemoryRequestRatio = uint(v)
	}
	if v, err := strconv.Atoi(ann[devboxv1alpha1.AnnotationMemoryLimitRatio]); err != nil {
		logger.Error(err, "failed to parse memory limit ratio. use default value instead", "value", ann[devboxv1alpha1.AnnotationMemoryLimitRatio])
		ac.MemoryLimitRatio = helper.DefaultMemoryLimitRatio
	} else {
		ac.MemoryLimitRatio = uint(v)
	}
	return ac, nil
}

func (r *DevboxReconciler) getAcceptanceScore(ctx context.Context) int {
	logger := log.FromContext(ctx)
	var (
		ac                      helper.AcceptanceConsideration
		containerFsStats        stat.FsStats
		err                     error
		availableBytes          uint64
		availablePercentage     uint
		capacityBytes           uint64
		cpuRequestPercentage    uint
		cpuLimitPercentage      uint
		memoryRequestPercentage uint
		memoryLimitPercentage   uint

		score int
	)
	ac, err = r.getAcceptanceConsideration(ctx)
	if err != nil {
		logger.Error(err, "failed to get acceptance consideration")
		goto unsuitable // If we can't get the acceptance consideration, we assume the node is not suitable
	}
	containerFsStats, err = r.ContainerFsStats(ctx)
	if err != nil || containerFsStats.AvailableBytes == nil || containerFsStats.CapacityBytes == nil {
		logger.Error(err, "failed to get container filesystem stats")
		goto unsuitable // If we can't get the container filesystem stats, we assume the node is not suitable
	}
	availableBytes = *containerFsStats.AvailableBytes
	capacityBytes = *containerFsStats.CapacityBytes
	if minBytesRequired, ok := r.EphemeralStorage.MaximumLimit.AsInt64(); !ok {
		logger.Error(err, "failed to get minimum bytes required for ephemeral storage")
		goto unsuitable // If we can't get the minimum bytes required, we assume the node is not suitable
	} else if availableBytes < uint64(minBytesRequired) {
		logger.Info("available bytes less than minimum required", "availableBytes", availableBytes, "minimumRequired", minBytesRequired)
		goto unsuitable // If available bytes are less than the minimum required, we assume the node is not suitable
	}
	availablePercentage = uint(float64(availableBytes) / float64(capacityBytes) * 100)
	if availablePercentage > ac.ContainerFSAvailableThreshold {
		logger.Info("container filesystem available percentage is greater than threshold",
			"availablePercentage", availablePercentage,
			"threshold", ac.ContainerFSAvailableThreshold)
		score += getScoreUnit(1)
	}
	cpuRequestPercentage, err = r.getTotalCPURequest(ctx, r.NodeName)
	if err != nil {
		logger.Error(err, "failed to get total CPU request")
		goto unsuitable // If we can't get the CPU request, we assume the node is not suitable
	} else if cpuRequestPercentage < ac.CPURequestRatio {
		logger.Info("cpu request percentage is less than cpu overcommitment request ratio", "requestPercentage", cpuRequestPercentage, "ratio", ac.CPURequestRatio)
		score += getScoreUnit(0)
	}
	cpuLimitPercentage, err = r.getTotalCPULimit(ctx, r.NodeName)
	if err != nil {
		logger.Error(err, "failed to get total CPU limit")
		goto unsuitable // If we can't get the CPU limit, we assume the node is not suitable
	} else if cpuLimitPercentage < ac.CPULimitRatio {
		logger.Info("cpu limit percentage is less than cpu overcommitment limit ratio", "limitPercentage", cpuLimitPercentage, "ratio", ac.CPULimitRatio)
		score += getScoreUnit(0)
	}
	memoryRequestPercentage, err = r.getTotalMemoryRequest(ctx, r.NodeName)
	if err != nil {
		logger.Error(err, "failed to get total memory request")
		goto unsuitable // If we can't get the memory request, we assume the node is not suitable
	} else if memoryRequestPercentage < ac.MemoryRequestRatio {
		logger.Info("memory request percentage is less than memory overcommitment request ratio", "requestPercentage", memoryRequestPercentage, "ratio", ac.MemoryRequestRatio)
		score += getScoreUnit(0)
	}
	memoryLimitPercentage, err = r.getTotalMemoryLimit(ctx, r.NodeName)
	if err != nil {
		logger.Error(err, "failed to get total memory limit")
		goto unsuitable // If we can't get the memory limit, we assume the node is not suitable
	} else if memoryLimitPercentage < ac.MemoryLimitRatio {
		logger.Info("memory limit percentage is less than memory overcommitment limit ratio", "limitPercentage", memoryLimitPercentage, "ratio", ac.MemoryLimitRatio)
		score += getScoreUnit(0)
	}
	return score
unsuitable:
	return math.MinInt
}

// This function may lead to overflow if p is too large, but since p is always in the range of 0-6, it should be safe.
// Use with caution.
func getScoreUnit(p uint) int {
	return 16 << (p * 4)
}

// getTotalCPURequest returns the total CPU requests (in millicores) for all pods in the namespace.
func (r *DevboxReconciler) getTotalCPURequest(ctx context.Context, namespace string) (uint, error) {
	podList := &corev1.PodList{}
	listOpts := []client.ListOption{
		client.InNamespace(namespace),
		client.MatchingFields{"spec.nodeName": r.NodeName},
	}
	if err := r.List(ctx, podList, listOpts...); err != nil {
		return 0, err
	}
	var totalCPURequest int64
	for _, pod := range podList.Items {
		for _, container := range pod.Spec.Containers {
			if cpuReq, ok := container.Resources.Requests[corev1.ResourceCPU]; ok {
				// TODO: check if this could lead to overflow
				totalCPURequest += cpuReq.MilliValue()
			}
		}
	}
	node := &corev1.Node{}
	if err := r.Get(ctx, client.ObjectKey{Name: r.NodeName}, node); err != nil {
		return 0, err
	}
	allocatableCPU := node.Status.Allocatable[corev1.ResourceCPU]
	allocatableMilli := allocatableCPU.MilliValue()
	if allocatableMilli == 0 {
		return 0, fmt.Errorf("node %s allocatable CPU is zero", r.NodeName)
	}
	percentage := uint((float64(totalCPURequest) / float64(allocatableMilli)) * 100)
	return percentage, nil
}

// getTotalCPULimit returns the total CPU limits (in millicores) for all pods in the namespace.
func (r *DevboxReconciler) getTotalCPULimit(ctx context.Context, namespace string) (uint, error) {
	podList := &corev1.PodList{}
	listOpts := []client.ListOption{
		client.InNamespace(namespace),
		client.MatchingFields{"spec.nodeName": r.NodeName},
	}
	if err := r.List(ctx, podList, listOpts...); err != nil {
		return 0, err
	}
	var totalCPULimit int64
	for _, pod := range podList.Items {
		for _, container := range pod.Spec.Containers {
			if cpuLimit, ok := container.Resources.Limits[corev1.ResourceCPU]; ok {
				// TODO: check if this could lead to overflow
				totalCPULimit += cpuLimit.MilliValue()
			}
		}
	}
	node := &corev1.Node{}
	if err := r.Get(ctx, client.ObjectKey{Name: r.NodeName}, node); err != nil {
		return 0, err
	}
	allocatableCPU := node.Status.Allocatable[corev1.ResourceCPU]
	allocatableMilli := allocatableCPU.MilliValue()
	if allocatableMilli == 0 {
		return 0, fmt.Errorf("node %s allocatable CPU is zero", r.NodeName)
	}
	percentage := uint((float64(totalCPULimit) / float64(allocatableMilli)) * 100)
	return percentage, nil
}

func (r *DevboxReconciler) getTotalMemoryRequest(ctx context.Context, namespace string) (uint, error) {
	podList := &corev1.PodList{}
	listOpts := []client.ListOption{
		client.InNamespace(namespace),
		client.MatchingFields{"spec.nodeName": r.NodeName},
	}
	if err := r.List(ctx, podList, listOpts...); err != nil {
		return 0, err
	}
	var totalMemoryRequest int64
	for _, pod := range podList.Items {
		for _, container := range pod.Spec.Containers {
			if memReq, ok := container.Resources.Requests[corev1.ResourceMemory]; ok {
				// TODO: check if this could lead to overflow
				totalMemoryRequest += memReq.Value()
			}
		}
	}
	node := &corev1.Node{}
	if err := r.Get(ctx, client.ObjectKey{Name: r.NodeName}, node); err != nil {
		return 0, err
	}
	allocatableMemory := node.Status.Allocatable[corev1.ResourceMemory]
	allocatableBytes := allocatableMemory.Value()
	if allocatableBytes == 0 {
		return 0, fmt.Errorf("node %s allocatable memory is zero", r.NodeName)
	}
	percentage := uint((float64(totalMemoryRequest) / float64(allocatableBytes)) * 100)
	return percentage, nil
}

func (r *DevboxReconciler) getTotalMemoryLimit(ctx context.Context, namespace string) (uint, error) {
	podList := &corev1.PodList{}
	listOpts := []client.ListOption{
		client.InNamespace(namespace),
		client.MatchingFields{"spec.nodeName": r.NodeName},
	}
	if err := r.List(ctx, podList, listOpts...); err != nil {
		return 0, err
	}
	var totalMemoryLimit int64
	for _, pod := range podList.Items {
		for _, container := range pod.Spec.Containers {
			if memLimit, ok := container.Resources.Limits[corev1.ResourceMemory]; ok {
				// TODO: check if this could lead to overflow
				totalMemoryLimit += memLimit.Value()
			}
		}
	}
	node := &corev1.Node{}
	if err := r.Get(ctx, client.ObjectKey{Name: r.NodeName}, node); err != nil {
		return 0, err
	}
	allocatableMemory := node.Status.Allocatable[corev1.ResourceMemory]
	allocatableBytes := allocatableMemory.Value()
	if allocatableBytes == 0 {
		return 0, fmt.Errorf("node %s allocatable memory is zero", r.NodeName)
	}
	percentage := uint((float64(totalMemoryLimit) / float64(allocatableBytes)) * 100)
	return percentage, nil
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
		For(&devboxv1alpha1.Devbox{}).
		Owns(&corev1.Pod{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})). // enqueue request if pod spec/status is updated
		Owns(&corev1.Service{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		WithEventFilter(NewControllerRestartPredicate(r.RestartPredicateDuration)).
		Complete(r)
}
