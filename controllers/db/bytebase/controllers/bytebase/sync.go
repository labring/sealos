// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package bytebase

import (
	"context"
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/jaevor/go-nanoid"
	bbv1 "github.com/labring/sealos/controllers/db/bytebase/apis/bytebase/v1"
	"k8s.io/apimachinery/pkg/api/resource"

	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

func (r *Reconciler) syncIngress(ctx context.Context, bb *bbv1.Bytebase, hostname string) error {
	var err error
	domainSuffix := DefaultDomainSuffix
	host := hostname + domainSuffix
	switch bb.Spec.IngressType {
	case bbv1.Nginx:
		err = r.syncNginxIngress(ctx, bb, host)
	default:
		err = r.syncNginxIngress(ctx, bb, host)
	}
	return err
}

func (r *Reconciler) syncNginxIngress(ctx context.Context, bb *bbv1.Bytebase, host string) error {
	ingress := &networkingv1.Ingress{
		ObjectMeta: metav1.ObjectMeta{
			Name:      bb.Name,
			Namespace: bb.Namespace,
		},
	}
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, ingress, func() error {
		cookies, err := r.getClientCookie(bb)
		if err != nil {
			return err
		}
		rootDomain := r.RootDomain
		// generate default Nginx configuration snippet without cookies
		wholeSnippet := generateDefaultNginxConfigSnippet(rootDomain)
		// add Set-Cookie configuration for Nginx
		snippet := ""
		for _, cookie := range cookies {
			snippet += fmt.Sprintf("add_header Set-Cookie \"%s\"; ", cookie)
		}
		wholeSnippet += snippet
		expectIngress := r.createNginxIngress(bb, host, wholeSnippet)
		ingress.ObjectMeta.Labels = expectIngress.ObjectMeta.Labels
		ingress.ObjectMeta.Annotations = expectIngress.ObjectMeta.Annotations
		ingress.Spec.Rules = expectIngress.Spec.Rules
		ingress.Spec.TLS = expectIngress.Spec.TLS
		return controllerutil.SetControllerReference(bb, ingress, r.Scheme)
	}); err != nil {
		return err
	}

	domain := Protocol + host
	if bb.Status.Domain != domain {
		bb.Status.Domain = domain
		return r.Status().Update(ctx, bb)
	}

	return nil
}

func (r *Reconciler) getClientCookie(bb *bbv1.Bytebase) ([]string, error) {
	cookies := []string{}
	if bb.Status.LoginCookie.AccessToken != "" {
		cookies = append(cookies, fmt.Sprintf("access-token=%s", bb.Status.LoginCookie.AccessToken))
	}
	if bb.Status.LoginCookie.RefreshToken != "" {
		cookies = append(cookies, fmt.Sprintf("refresh-token=%s", bb.Status.LoginCookie.RefreshToken))
	}
	if bb.Status.LoginCookie.User != "" {
		cookies = append(cookies, fmt.Sprintf("user=%s", bb.Status.LoginCookie.User))
	}

	return cookies, nil
}

func (r *Reconciler) syncService(ctx context.Context, bb *bbv1.Bytebase) error {
	labelsMap := buildLabelsMap(bb)
	expectService := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      bb.Name,
			Namespace: bb.Namespace,
		},
		Spec: corev1.ServiceSpec{
			Selector: labelsMap,
			Type:     corev1.ServiceTypeClusterIP,
			Ports: []corev1.ServicePort{
				{Name: bb.Name, Port: int32(bb.Spec.Port.IntValue()), TargetPort: bb.Spec.Port, Protocol: corev1.ProtocolTCP},
			},
		},
	}

	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      bb.Name,
			Namespace: bb.Namespace,
		},
	}

	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, service, func() error {
		// only update some specific fields
		service.Spec.Selector = expectService.Spec.Selector
		service.Spec.Type = expectService.Spec.Type
		if len(service.Spec.Ports) == 0 {
			service.Spec.Ports = expectService.Spec.Ports
		} else {
			service.Spec.Ports[0].Name = expectService.Spec.Ports[0].Name
			service.Spec.Ports[0].Port = expectService.Spec.Ports[0].Port
			service.Spec.Ports[0].TargetPort = expectService.Spec.Ports[0].TargetPort
			service.Spec.Ports[0].Protocol = expectService.Spec.Ports[0].Protocol
		}
		return controllerutil.SetControllerReference(bb, service, r.Scheme)
	}); err != nil {
		return err
	}
	return nil
}

func (r *Reconciler) syncDeployment(ctx context.Context, bb *bbv1.Bytebase, hostname *string) error {
	var (
		objectMeta metav1.ObjectMeta
		selector   *metav1.LabelSelector
		ports      []corev1.ContainerPort
		// envs          []corev1.EnvVar
		containers    []corev1.Container
		volumeMounts  []corev1.VolumeMount
		args          []string
		livenessProbe corev1.Probe
		volumeSource  corev1.VolumeSource
		volumes       []corev1.Volume
		replicas      int32
		probeHandler  corev1.ProbeHandler
	)
	objectMeta = metav1.ObjectMeta{
		Name:      bb.Name,
		Namespace: bb.Namespace,
	}

	deployment := &appsv1.Deployment{
		ObjectMeta: objectMeta,
	}

	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, deployment, func() error {
		labelsMap := buildLabelsMap(bb)

		replicas = int32(1)
		if bb.Spec.Replicas != nil {
			replicas = *bb.Spec.Replicas
		}
		deployment.Spec.Replicas = &replicas

		selector = &metav1.LabelSelector{
			MatchLabels: labelsMap,
		}

		if deployment.Spec.Selector == nil {
			deployment.Spec.Selector = selector
		}

		if deployment.Spec.Template.ObjectMeta.Labels == nil {
			deployment.Spec.Template.ObjectMeta.Labels = labelsMap
		}

		containerPort := bb.Spec.Port.IntValue()
		if containerPort == 0 {
			return fmt.Errorf("the container port number cannot be 0 or the format is wrong")
		}

		ports = []corev1.ContainerPort{
			{
				ContainerPort: int32(containerPort),
			},
		}

		if deployment.Spec.Template.Spec.Hostname == "" {
			letterID, err := nanoid.CustomASCII(LetterBytes, HostnameLength)
			if err != nil {
				return err
			}
			// to be compatible with ingress host, hostname must start with a lower case letter
			*hostname = "bb" + letterID()
			deployment.Spec.Template.Spec.Hostname = *hostname
		} else {
			*hostname = deployment.Spec.Template.Spec.Hostname
		}

		externalURL := Protocol + deployment.Spec.Template.Spec.Hostname + DefaultDomainSuffix

		args = []string{
			"--data",
			"/var/opt/bytebase",
			"--external-url",
			externalURL,
			"--port",
			bb.Spec.Port.String(),
		}

		probeHandler = corev1.ProbeHandler{
			HTTPGet: &corev1.HTTPGetAction{
				Path: "/healthz",
				Port: bb.Spec.Port,
			},
		}

		livenessProbe = corev1.Probe{
			ProbeHandler:        probeHandler,
			InitialDelaySeconds: 300,
			PeriodSeconds:       300,
			TimeoutSeconds:      60,
		}

		volumeMounts = []corev1.VolumeMount{
			{
				Name:      "data",
				MountPath: "/var/opt/bytebase",
			},
		}

		volumeSource = corev1.VolumeSource{
			EmptyDir: &corev1.EmptyDirVolumeSource{},
		}

		volumes = []corev1.Volume{
			{
				Name:         "data",
				VolumeSource: volumeSource,
			},
		}

		containers = []corev1.Container{
			{
				Name:            "bytebase",
				Image:           bb.Spec.Image,
				ImagePullPolicy: corev1.PullAlways,
				Ports:           ports,
				// Env:             envs,
				Resources: corev1.ResourceRequirements{
					Requests: corev1.ResourceList{
						"cpu":    resource.MustParse(CPURequest),
						"memory": resource.MustParse(MemoryRequest),
					},
					Limits: corev1.ResourceList{
						"cpu":    resource.MustParse(CPULimit),
						"memory": resource.MustParse(MemoryLimit),
					},
				},
				Args:          args,
				VolumeMounts:  volumeMounts,
				LivenessProbe: &livenessProbe,
			},
		}

		if deployment.Spec.Template.Spec.Containers == nil {
			deployment.Spec.Template.Spec.Containers = containers
		}

		if deployment.Spec.Template.Spec.Volumes == nil {
			deployment.Spec.Template.Spec.Volumes = volumes
		}

		return controllerutil.SetControllerReference(bb, deployment, r.Scheme)
	}); err != nil {
		return err
	}

	if bb.Status.AvailableReplicas != deployment.Status.AvailableReplicas {
		bb.Status.AvailableReplicas = deployment.Status.AvailableReplicas
		return r.Status().Update(ctx, bb)
	}

	return nil
}
