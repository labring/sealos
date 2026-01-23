package controller

import (
	"context"
	"errors"
	"fmt"

	devboxv1alpha2 "github.com/labring/sealos/controllers/devbox/api/v1alpha2"
	"github.com/labring/sealos/controllers/devbox/internal/commit"
	"github.com/labring/sealos/controllers/devbox/internal/controller/helper"
	"github.com/labring/sealos/controllers/devbox/internal/controller/utils/rwords"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/apimachinery/pkg/util/rand"
	"k8s.io/client-go/util/retry"
	"k8s.io/utils/ptr"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

type devboxSyncPipelineEvent struct {
	eventType  string
	reason     string
	messageFmt string
	args       func(err error) []any
}

type devboxSyncPipelineStep struct {
	startLog string
	errorLog string
	okLog    string

	conditionType   string
	okConditionMsg  string
	errConditionFmt string

	run func(ctx context.Context) error

	onErrorEvent   *devboxSyncPipelineEvent
	onSuccessEvent *devboxSyncPipelineEvent

	// If skip returns true, run is not called and onSkip (if any) is executed.
	skip   func() bool
	onSkip func(ctx context.Context)
}

func (r *DevboxReconciler) runSyncPipeline(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
	recLabels map[string]string,
) error {
	logger := log.FromContext(ctx)
	steps := r.syncPipelineSteps(devbox, recLabels)

	for _, step := range steps {
		if step.skip != nil && step.skip() {
			if step.onSkip != nil {
				step.onSkip(ctx)
			}
			continue
		}
		if step.startLog != "" {
			logger.Info(step.startLog)
		}
		if err := step.run(ctx); err != nil {
			if step.errorLog != "" {
				logger.Error(err, step.errorLog)
			} else {
				logger.Error(err, "sync step failed")
			}
			if step.conditionType != "" {
				r.setSyncCondition(
					ctx,
					devbox,
					step.conditionType,
					false,
					fmt.Sprintf(step.errConditionFmt, err),
				)
			}
			if step.onErrorEvent != nil {
				args := []any(nil)
				if step.onErrorEvent.args != nil {
					args = step.onErrorEvent.args(err)
				}
				r.Recorder.Eventf(
					devbox,
					step.onErrorEvent.eventType,
					step.onErrorEvent.reason,
					step.onErrorEvent.messageFmt,
					args...)
			}
			return err
		}
		if step.okLog != "" {
			logger.Info(step.okLog)
		}
		if step.conditionType != "" {
			r.setSyncCondition(ctx, devbox, step.conditionType, true, step.okConditionMsg)
		}
		if step.onSuccessEvent != nil {
			args := []any(nil)
			if step.onSuccessEvent.args != nil {
				args = step.onSuccessEvent.args(nil)
			}
			r.Recorder.Eventf(
				devbox,
				step.onSuccessEvent.eventType,
				step.onSuccessEvent.reason,
				step.onSuccessEvent.messageFmt,
				args...)
		}
	}

	return nil
}

// ! syncPipelineSteps returns the steps of the sync pipeline, this is the key!!!
func (r *DevboxReconciler) syncPipelineSteps(
	devbox *devboxv1alpha2.Devbox,
	recLabels map[string]string,
) []devboxSyncPipelineStep {
	return []devboxSyncPipelineStep{
		r.syncSecretStep(devbox, recLabels),
		r.syncStartupConfigMapStep(devbox, recLabels),
		r.syncNetworkStep(devbox, recLabels),
		r.syncDevboxPhaseStep(devbox, recLabels),
		r.syncPodStep(devbox, recLabels),
	}
}

func (r *DevboxReconciler) syncSecretStep(
	devbox *devboxv1alpha2.Devbox,
	recLabels map[string]string,
) devboxSyncPipelineStep {
	return devboxSyncPipelineStep{
		startLog:        "syncing secret",
		errorLog:        "sync secret failed",
		okLog:           "sync secret success",
		conditionType:   devboxv1alpha2.DevboxConditionSecretSynced,
		okConditionMsg:  "sync secret succeeded",
		errConditionFmt: "sync secret failed: %v",
		run: func(ctx context.Context) error {
			return r.syncSecret(ctx, devbox, recLabels)
		},
		onErrorEvent: &devboxSyncPipelineEvent{
			eventType:  corev1.EventTypeWarning,
			reason:     "Sync secret failed",
			messageFmt: "%v",
			args: func(err error) []any {
				return []any{err}
			},
		},
		onSuccessEvent: &devboxSyncPipelineEvent{
			eventType:  corev1.EventTypeNormal,
			reason:     "Sync secret success",
			messageFmt: "Sync secret success",
			args: func(err error) []any {
				return nil
			},
		},
	}
}

func (r *DevboxReconciler) syncSecret(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
	recLabels map[string]string,
) error {
	objectMeta := metav1.ObjectMeta{
		Name:      devbox.Name,
		Namespace: devbox.Namespace,
		Labels:    recLabels,
	}
	devboxSecret := &corev1.Secret{
		ObjectMeta: objectMeta,
	}

	err := r.Get(ctx, client.ObjectKeyFromObject(devboxSecret), devboxSecret)
	if err == nil {
		// Secret already exists, update with retry
		err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
			latestSecret := &corev1.Secret{}
			if err := r.Get(
				ctx,
				client.ObjectKey{Namespace: devbox.Namespace, Name: devbox.Name},
				latestSecret,
			); err != nil {
				return err
			}
			// update controller reference
			if err := controllerutil.SetControllerReference(
				devbox,
				latestSecret,
				r.Scheme,
			); err != nil {
				return fmt.Errorf("failed to update owner reference: %w", err)
			}
			// TODO: delete this code after we have a way to sync secret to devbox
			// check if SEALOS_DEVBOX_JWT_SECRET is exist, if not exist, create it
			if _, ok := latestSecret.Data["SEALOS_DEVBOX_JWT_SECRET"]; !ok {
				latestSecret.Data["SEALOS_DEVBOX_JWT_SECRET"] = []byte(rand.String(32))
			}
			// check if SEALOS_DEVBOX_AUTHORIZED_KEYS is exist, if not exist, set it to SEALOS_DEVBOX_PUBLIC_KEY
			if _, ok := latestSecret.Data["SEALOS_DEVBOX_AUTHORIZED_KEYS"]; !ok {
				latestSecret.Data["SEALOS_DEVBOX_AUTHORIZED_KEYS"] = latestSecret.Data["SEALOS_DEVBOX_PUBLIC_KEY"]
			}
			// generate SEALOS_DEVBOX_ENV_PROFILE
			latestSecret.Data["SEALOS_DEVBOX_ENV_PROFILE"] = helper.GenerateEnvProfile(
				devbox,
				latestSecret.Data["SEALOS_DEVBOX_JWT_SECRET"],
			)
			return r.Update(ctx, latestSecret)
		})
		return err
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

func (r *DevboxReconciler) syncStartupConfigMapStep(
	devbox *devboxv1alpha2.Devbox,
	recLabels map[string]string,
) devboxSyncPipelineStep {
	return devboxSyncPipelineStep{
		startLog:        "syncing startup configmap",
		errorLog:        "sync startup configmap failed",
		okLog:           "sync startup configmap success",
		conditionType:   devboxv1alpha2.DevboxConditionStartupConfigMapSynced,
		okConditionMsg:  "sync startup configmap succeeded",
		errConditionFmt: "sync startup configmap failed: %v",
		skip: func() bool {
			return r.StartupConfigMapName == ""
		},
		onSkip: func(ctx context.Context) {
			// Make it explicit that this step is not configured.
			_ = r.setConditionWithRetry(ctx, devbox, metav1.Condition{
				Type:    devboxv1alpha2.DevboxConditionStartupConfigMapSynced,
				Status:  metav1.ConditionFalse,
				Reason:  devboxv1alpha2.DevboxReasonNotConfigured,
				Message: "startup configmap is not configured",
			})
		},
		run: func(ctx context.Context) error {
			return r.syncStartupConfigMap(ctx, devbox, recLabels)
		},
		onErrorEvent: &devboxSyncPipelineEvent{
			eventType:  corev1.EventTypeWarning,
			reason:     "Sync startup configmap failed",
			messageFmt: "%v",
			args: func(err error) []any {
				return []any{err}
			},
		},
		onSuccessEvent: &devboxSyncPipelineEvent{
			eventType:  corev1.EventTypeNormal,
			reason:     "Sync startup configmap success",
			messageFmt: "Sync startup configmap success",
			args: func(err error) []any {
				return nil
			},
		},
	}
}

func (r *DevboxReconciler) syncStartupConfigMap(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
	recLabels map[string]string,
) error {
	objectMeta := metav1.ObjectMeta{
		Name:      devbox.Name,
		Namespace: devbox.Namespace,
		Labels:    recLabels,
	}
	devboxConfigmap := &corev1.ConfigMap{
		ObjectMeta: objectMeta,
	}

	startupConfigMap := &corev1.ConfigMap{}
	err := r.Get(
		ctx,
		client.ObjectKey{Namespace: r.StartupConfigMapNamespace, Name: r.StartupConfigMapName},
		startupConfigMap,
	)
	if err != nil {
		return fmt.Errorf("failed to get startup configmap: %w", err)
	}
	if startupConfigMap.Data == nil || startupConfigMap.Data["startup.sh"] == "" {
		return fmt.Errorf(
			"startup configmap %s/%s is missing the 'startup.sh' key or it is empty",
			r.StartupConfigMapNamespace,
			r.StartupConfigMapName,
		)
	}
	err = r.Get(
		ctx,
		client.ObjectKey{Namespace: devbox.Namespace, Name: devbox.Name},
		devboxConfigmap,
	)
	if err == nil {
		// configmap already exists, no need to create
		if devboxConfigmap.Data == nil {
			devboxConfigmap.Data = make(map[string]string)
		}
		if _, ok := devboxConfigmap.Data["startup.sh"]; !ok ||
			devboxConfigmap.Data["startup.sh"] != startupConfigMap.Data["startup.sh"] {
			devboxConfigmap.Data["startup.sh"] = startupConfigMap.Data["startup.sh"]
			if err := r.Update(ctx, devboxConfigmap); err != nil {
				return fmt.Errorf("failed to update configmap: %w", err)
			}
		}

		return nil
	}
	if client.IgnoreNotFound(err) != nil {
		return fmt.Errorf("failed to get configmap: %w", err)
	}

	configmap := &corev1.ConfigMap{
		ObjectMeta: objectMeta,
		Data: map[string]string{
			"startup.sh": startupConfigMap.Data["startup.sh"],
		},
	}

	if err := controllerutil.SetControllerReference(devbox, configmap, r.Scheme); err != nil {
		return fmt.Errorf("failed to set controller reference: %w", err)
	}

	if err := r.Create(ctx, configmap); err != nil {
		return fmt.Errorf("failed to create configmap: %w", err)
	}
	return nil
}

func (r *DevboxReconciler) syncNetworkStep(
	devbox *devboxv1alpha2.Devbox,
	recLabels map[string]string,
) devboxSyncPipelineStep {
	return devboxSyncPipelineStep{
		errorLog:        "sync network failed",
		okLog:           "sync network success",
		conditionType:   devboxv1alpha2.DevboxConditionNetworkSynced,
		okConditionMsg:  "sync network succeeded",
		errConditionFmt: "sync network failed: %v",
		run: func(ctx context.Context) error {
			return r.syncNetwork(ctx, devbox, recLabels)
		},
		onErrorEvent: &devboxSyncPipelineEvent{
			eventType:  corev1.EventTypeWarning,
			reason:     "Sync network failed",
			messageFmt: "%v",
			args: func(err error) []any {
				return []any{err}
			},
		},
		onSuccessEvent: &devboxSyncPipelineEvent{
			eventType:  corev1.EventTypeNormal,
			reason:     "Sync network success",
			messageFmt: "Sync network success",
			args: func(err error) []any {
				return nil
			},
		},
	}
}

func (r *DevboxReconciler) syncNetwork(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
	recLabels map[string]string,
) error {
	// Use a pipeline pattern to execute each sync function in order, returning early if an error occurs in any step.
	pipeline := []func(context.Context, *devboxv1alpha2.Devbox, map[string]string) error{
		r.syncNetworkCommon,
		r.syncNetworkTailnet,
		r.syncNetworkSSHGate,
		r.syncNetworkNodeport,
	}
	for _, fn := range pipeline {
		if err := fn(ctx, devbox, recLabels); err != nil && !apierrors.IsNotFound(err) {
			return err
		}
	}
	// succeed sync all network resources, do update devbox status network type
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		latestDevbox := &devboxv1alpha2.Devbox{}
		if err := r.Get(ctx, client.ObjectKeyFromObject(devbox), latestDevbox); err != nil {
			return err
		}
		latestDevbox.Status.Network.Type = devbox.Spec.NetworkSpec.Type
		return r.Status().Update(ctx, latestDevbox)
	})
}

// syncNetworkCommon syncs the common resources for the network, including headless service and unique id
func (r *DevboxReconciler) syncNetworkCommon(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
	recLabels map[string]string,
) error {
	logger := log.FromContext(ctx)
	logger.Info("syncing network common resources: headless service and unique id")
	_ = r.Get(ctx, client.ObjectKeyFromObject(devbox), devbox)
	if devbox.Status.Network.UniqueID == "" {
		err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
			latestDevbox := &devboxv1alpha2.Devbox{}
			if err := r.Get(ctx, client.ObjectKeyFromObject(devbox), latestDevbox); err != nil {
				return err
			}
			latestDevbox.Status.Network.UniqueID = rwords.GenerateRandomWords()
			return r.Status().Update(ctx, latestDevbox)
		})
		if err != nil {
			return err
		}
		// re-update devbox to get the latest status
		_ = r.Get(ctx, client.ObjectKeyFromObject(devbox), devbox)
	}

	if devbox.Status.Network.UniqueID == "" {
		return fmt.Errorf("devbox: %s network unique id is empty", devbox.Name)
	}

	// create a headless service for the devbox, use the unique id as the name
	// todo: use label to find the service
	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      devbox.Status.Network.UniqueID,
			Namespace: devbox.Namespace,
			Labels:    recLabels,
		},
	}
	_, err := controllerutil.CreateOrUpdate(ctx, r.Client, service, func() error {
		service.Spec.Selector = recLabels
		service.Spec.Type = corev1.ServiceTypeClusterIP
		if service.Spec.ClusterIP == "" {
			service.Spec.ClusterIP = corev1.ClusterIPNone
		}
		if len(service.Spec.ClusterIPs) == 0 {
			service.Spec.ClusterIPs = []string{corev1.ClusterIPNone}
		}
		service.Spec.Ports = nil
		return controllerutil.SetControllerReference(devbox, service, r.Scheme)
	})
	return err
}

func (r *DevboxReconciler) syncNetworkTailnet(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
	recLabels map[string]string,
) error {
	// deprecated, we don't need to sync tailnet anymore
	logger := log.FromContext(ctx)
	logger.Info("syncing tailnet")
	return nil
}

func (r *DevboxReconciler) syncNetworkSSHGate(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
	recLabels map[string]string,
) error {
	// maybe we should do something here...
	logger := log.FromContext(ctx)
	logger.Info("syncing ssh gate")
	return nil
}

func (r *DevboxReconciler) syncNetworkNodeport(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
	recLabels map[string]string,
) error {
	// todo: use label to find the service
	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      devbox.Name + "-svc",
			Namespace: devbox.Namespace,
			Labels:    recLabels,
		},
	}

	desiredNodePort := devbox.Spec.NetworkSpec.Type == devboxv1alpha2.NetworkTypeNodePort
	if !desiredNodePort {
		return r.deleteNodeport(ctx, devbox, service)
	}

	servicePorts := make([]corev1.ServicePort, 0, len(devbox.Spec.Config.Ports))
	for _, port := range devbox.Spec.Config.Ports {
		servicePorts = append(servicePorts, corev1.ServicePort{
			Name:       port.Name,
			Port:       port.ContainerPort,
			TargetPort: intstr.FromInt32(port.ContainerPort),
			Protocol:   port.Protocol,
		})
	}
	if len(servicePorts) == 0 {
		// use the default value
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

	switch devbox.Spec.State {
	case devboxv1alpha2.DevboxStateShutdown:
		return r.deleteNodeport(ctx, devbox, service)
	case devboxv1alpha2.DevboxStateRunning,
		devboxv1alpha2.DevboxStatePaused,
		devboxv1alpha2.DevboxStateStopped:
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
				return r.Get(
					ctx,
					client.ObjectKey{Namespace: service.Namespace, Name: service.Name},
					&updatedService,
				)
			},
		)
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
		// Update devbox status with retry
		return retry.RetryOnConflict(retry.DefaultRetry, func() error {
			latestDevbox := &devboxv1alpha2.Devbox{}
			if err := r.Get(ctx, client.ObjectKeyFromObject(devbox), latestDevbox); err != nil {
				return err
			}
			latestDevbox.Status.Network.NodePort = nodePort
			return r.Status().Update(ctx, latestDevbox)
		})
	}
	return nil
}

func (r *DevboxReconciler) deleteNodeport(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
	service *corev1.Service,
) error {
	logger := log.FromContext(ctx)
	logger.Info("deleting nodeport service for devbox", "devbox", devbox.Name)
	if err := r.Delete(ctx, service); err != nil && !apierrors.IsNotFound(err) {
		return err
	}

	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		latestDevbox := &devboxv1alpha2.Devbox{}
		if err := r.Get(ctx, client.ObjectKeyFromObject(devbox), latestDevbox); err != nil {
			return err
		}
		latestDevbox.Status.Network.NodePort = 0
		return r.Status().Update(ctx, latestDevbox)
	})
}

func (r *DevboxReconciler) syncDevboxPhaseStep(
	devbox *devboxv1alpha2.Devbox,
	recLabels map[string]string,
) devboxSyncPipelineStep {
	return devboxSyncPipelineStep{
		errorLog:        "sync devbox phase failed",
		conditionType:   devboxv1alpha2.DevboxConditionPhaseSynced,
		okConditionMsg:  "sync devbox phase succeeded",
		errConditionFmt: "sync devbox phase failed: %v",
		run: func(ctx context.Context) error {
			return r.syncDevboxPhase(ctx, devbox, recLabels)
		},
	}
}

// syncDevboxPhase updates devbox.Status.Phase derived from desired state and current pod status
func (r *DevboxReconciler) syncDevboxPhase(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
	recLabels map[string]string,
) error {
	logger := log.FromContext(ctx)

	// Fetch pod list
	podList := &corev1.PodList{}
	if err := r.List(
		ctx,
		podList,
		client.InNamespace(devbox.Namespace),
		client.MatchingLabels(recLabels),
	); err != nil {
		return err
	}

	// Refresh devbox to get latest status
	if err := r.Get(
		ctx,
		client.ObjectKey{Namespace: devbox.Namespace, Name: devbox.Name},
		devbox,
	); err != nil {
		return fmt.Errorf("failed to get devbox: %w", err)
	}

	// Analyze pod status
	podStatus := helper.AnalyzePodStatus(podList)

	// Get commit record for current contentID
	latestCommitRecord := helper.GetLatestCommitRecord(
		devbox.Status.CommitRecords,
		devbox.Status.ContentID,
	)

	// Derive phase based on State to Phase Mapping Table
	newPhase := helper.DerivePhase(devbox.Spec.State, podStatus, latestCommitRecord)

	// Skip update if phase hasn't changed
	if devbox.Status.Phase == newPhase {
		return nil
	}

	// Log phase change
	latestCommitStatus := "none"
	if latestCommitRecord != nil {
		latestCommitStatus = string(latestCommitRecord.CommitStatus)
	}
	logger.Info("updating devbox phase",
		"from", devbox.Status.Phase,
		"to", newPhase,
		"latestCommitStatus", latestCommitStatus,
	)

	// Update devbox phase with retry
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		latestDevbox := &devboxv1alpha2.Devbox{}
		if err := r.Get(ctx, client.ObjectKeyFromObject(devbox), latestDevbox); err != nil {
			return err
		}
		latestDevbox.Status.Phase = newPhase
		return r.Status().Update(ctx, latestDevbox)
	})
}

func (r *DevboxReconciler) syncPodStep(
	devbox *devboxv1alpha2.Devbox,
	recLabels map[string]string,
) devboxSyncPipelineStep {
	return devboxSyncPipelineStep{
		startLog:        "syncing pod",
		errorLog:        "sync pod failed",
		okLog:           "sync pod success",
		conditionType:   devboxv1alpha2.DevboxConditionPodSynced,
		okConditionMsg:  "sync pod succeeded",
		errConditionFmt: "sync pod failed: %v",
		run: func(ctx context.Context) error {
			return r.syncPod(ctx, devbox, recLabels)
		},
		onErrorEvent: &devboxSyncPipelineEvent{
			eventType:  corev1.EventTypeWarning,
			reason:     "Sync pod failed",
			messageFmt: "%v",
			args: func(err error) []any {
				return []any{err}
			},
		},
		onSuccessEvent: &devboxSyncPipelineEvent{
			eventType:  corev1.EventTypeNormal,
			reason:     "Sync pod success",
			messageFmt: "Sync pod success",
			args: func(err error) []any {
				return nil
			},
		},
	}
}

func (r *DevboxReconciler) syncPod(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
	recLabels map[string]string,
) error {
	logger := log.FromContext(ctx)
	podList := &corev1.PodList{}
	if err := r.List(
		ctx,
		podList,
		client.InNamespace(devbox.Namespace),
		client.MatchingLabels(recLabels),
	); err != nil {
		return err
	}
	switch devbox.Spec.State {
	case devboxv1alpha2.DevboxStateRunning:
		// get pod
		switch len(podList.Items) {
		case 0:
			// check last devbox status
			currentRecord := devbox.Status.CommitRecords[devbox.Status.ContentID]
			if currentRecord == nil {
				return errors.New("current record is nil")
			}
			// create a new pod with default image, with new content id
			podOptions := []helper.DevboxPodOptions{
				helper.WithPodImage(currentRecord.BaseImage),
				helper.WithPodContentID(devbox.Status.ContentID),
				helper.WithPodNodeName(currentRecord.Node),
				helper.WithPodRuntimeHandler(devboxv1alpha2.PodRuntimeHandler),
			}
			if r.MergeBaseImageTopLayer {
				podOptions = append(podOptions, helper.WithPodInit(commit.AnnotationImageFromValue))
			}
			pod := r.generateDevboxPod(devbox, podOptions...)
			if err := r.Create(ctx, pod); err != nil {
				return err
			}
		case 1:
			// skip if pod is already created
			if !podList.Items[0].DeletionTimestamp.IsZero() {
				return r.handlePodDeleted(ctx, devbox, &podList.Items[0])
			}
			if podList.Items[0].Status.Phase != corev1.PodRunning &&
				podList.Items[0].Status.Phase != corev1.PodPending {
				return r.deletePod(ctx, devbox, &podList.Items[0])
			}
			return nil
		default:
			// more than one pod found, remove finalizer and delete them
			for i := range podList.Items {
				pod := &podList.Items[i]
				if err := r.deletePod(ctx, devbox, pod); err != nil {
					logger.Error(err, "failed to delete pod", "pod", pod.Name)
					return err
				}
			}
			moreThanOnePodErr := errors.New("more than one pod found")
			logger.Error(moreThanOnePodErr, "more than one pod found")
			r.Recorder.Eventf(
				devbox,
				corev1.EventTypeWarning,
				"More than one pod found",
				"More than one pod found",
			)
			return moreThanOnePodErr
		}
	case devboxv1alpha2.DevboxStatePaused,
		devboxv1alpha2.DevboxStateStopped,
		devboxv1alpha2.DevboxStateShutdown:
		if len(podList.Items) > 0 {
			for _, pod := range podList.Items {
				if err := r.deletePod(ctx, devbox, &pod); err != nil {
					logger.Error(err, "failed to delete pod", "pod", pod.Name)
					return err
				}
			}
		}
		return nil
	}
	return nil
}

func (r *DevboxReconciler) deletePod(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
	pod *corev1.Pod,
) error {
	logger := log.FromContext(ctx)
	originalPodUID := pod.UID

	// Get latest devbox
	err := r.Get(ctx, client.ObjectKey{Namespace: devbox.Namespace, Name: devbox.Name}, devbox)
	if err != nil {
		logger.Error(err, "failed to get devbox")
		return err
	}

	// Update devbox status with container status if available
	if len(pod.Status.ContainerStatuses) > 0 {
		err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
			latestDevbox := &devboxv1alpha2.Devbox{}
			if err := r.Get(ctx, client.ObjectKeyFromObject(devbox), latestDevbox); err != nil {
				return err
			}
			latestDevbox.Status.LastContainerStatus = pod.Status.ContainerStatuses[0]
			return r.Status().Update(ctx, latestDevbox)
		})
		if err != nil {
			logger.Error(err, "failed to update devbox status")
			return err
		}
	}

	// Remove finalizer and delete pod with retry and UID check
	err = retry.RetryOnConflict(retry.DefaultRetry, func() error {
		latestPod := &corev1.Pod{}
		if err := r.Get(ctx, client.ObjectKeyFromObject(pod), latestPod); err != nil {
			if apierrors.IsNotFound(err) {
				// Pod already deleted
				logger.Info("pod already deleted", "pod", pod.Name)
				return nil
			}
			return err
		}

		// Check if UID matches
		if latestPod.UID != originalPodUID {
			logger.Info("pod UID changed, skip finalizer removal",
				"pod", pod.Name,
				"originalUID", originalPodUID,
				"currentUID", latestPod.UID)
			return nil
		}

		// Remove finalizer
		controllerutil.RemoveFinalizer(latestPod, devboxv1alpha2.FinalizerName)
		return r.Update(ctx, latestPod)
	})
	if err != nil {
		logger.Error(err, "remove finalizer failed")
		return err
	}

	// Delete pod
	if err := r.Delete(
		ctx,
		pod,
		client.GracePeriodSeconds(0),
		client.PropagationPolicy(metav1.DeletePropagationBackground),
	); err != nil {
		if !apierrors.IsNotFound(err) {
			logger.Error(err, "delete pod failed")
			return err
		}
		logger.Info("pod already deleted", "pod", pod.Name)
	}
	return nil
}

func (r *DevboxReconciler) handlePodDeleted(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
	pod *corev1.Pod,
) error {
	logger := log.FromContext(ctx)
	originalPodUID := pod.UID

	// Remove finalizer with retry and UID check
	err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		latestPod := &corev1.Pod{}
		if err := r.Get(ctx, client.ObjectKeyFromObject(pod), latestPod); err != nil {
			if apierrors.IsNotFound(err) {
				// Pod already deleted
				logger.Info("pod already deleted, skip finalizer removal", "pod", pod.Name)
				return nil
			}
			return err
		}

		// Check if UID matches
		if latestPod.UID != originalPodUID {
			logger.Info("pod UID changed, skip finalizer removal",
				"pod", pod.Name,
				"originalUID", originalPodUID,
				"currentUID", latestPod.UID)
			return nil
		}

		controllerutil.RemoveFinalizer(latestPod, devboxv1alpha2.FinalizerName)
		return r.Update(ctx, latestPod)
	})
	if err != nil {
		logger.Error(err, "remove finalizer failed")
		return err
	}

	// Get latest devbox
	err = r.Get(ctx, client.ObjectKey{Namespace: devbox.Namespace, Name: devbox.Name}, devbox)
	if err != nil {
		logger.Error(err, "failed to get devbox")
		return err
	}

	// Update devbox status with container status if available
	if len(pod.Status.ContainerStatuses) > 0 {
		err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
			latestDevbox := &devboxv1alpha2.Devbox{}
			if err := r.Get(ctx, client.ObjectKeyFromObject(devbox), latestDevbox); err != nil {
				return err
			}
			latestDevbox.Status.LastContainerStatus = pod.Status.ContainerStatuses[0]
			return r.Status().Update(ctx, latestDevbox)
		})
		if err != nil {
			logger.Error(err, "failed to update devbox status")
			return err
		}
	}
	return nil
}

func (r *DevboxReconciler) generateDevboxPod(
	devbox *devboxv1alpha2.Devbox,
	opts ...helper.DevboxPodOptions,
) *corev1.Pod {
	objectMeta := metav1.ObjectMeta{
		Name:        devbox.Name,
		Namespace:   devbox.Namespace,
		Labels:      helper.GeneratePodLabels(devbox),
		Annotations: helper.GeneratePodAnnotations(devbox, r.EnableBlockIOResource),
	}

	// ports := devbox.Spec.Config.Ports
	// TODO: add extra ports to pod, currently not support
	// ports = append(ports, devbox.Spec.NetworkSpec.ExtraPorts...)

	envs := devbox.Spec.Config.Env
	envs = append(envs, corev1.EnvVar{
		Name: "DEVBOX_JWT_SECRET",
		ValueFrom: &corev1.EnvVarSource{
			SecretKeyRef: &corev1.SecretKeySelector{
				Key: "SEALOS_DEVBOX_JWT_SECRET",
				LocalObjectReference: corev1.LocalObjectReference{
					Name: devbox.Name,
				},
			},
		},
	})
	volumes := devbox.Spec.Config.Volumes
	volumes = append(volumes, helper.GenerateSSHVolume(devbox))
	if r.StartupConfigMapName != "" {
		volumes = append(volumes, helper.GenerateStartupVolume(devbox))
	}
	volumes = append(volumes, helper.GenerateEnvProfileVolume(devbox))

	volumeMounts := devbox.Spec.Config.VolumeMounts
	volumeMounts = append(volumeMounts, helper.GenerateSSHVolumeMounts()...)
	if r.StartupConfigMapName != "" {
		volumeMounts = append(volumeMounts, helper.GenerateStartupVolumeMounts()...)
	}
	volumeMounts = append(volumeMounts, helper.GenerateEnvProfileVolumeMount()...)

	containers := []corev1.Container{
		{
			Name: devbox.Name,
			Env:  envs,
			// Ports:        ports,
			VolumeMounts: volumeMounts,

			WorkingDir: helper.GetWorkingDir(devbox),
			Command:    helper.GetCommand(devbox),
			Args:       helper.GetArgs(devbox),
			Resources: helper.GenerateResourceRequirements(
				devbox,
				r.RequestRate,
				r.EphemeralStorage,
			),
		},
	}

	terminationGracePeriodSeconds := 3
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
	controllerutil.AddFinalizer(expectPod, devboxv1alpha2.FinalizerName)

	for _, opt := range opts {
		opt(expectPod)
	}

	return expectPod
}
