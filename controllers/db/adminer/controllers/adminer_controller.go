/*
Copyright 2023 labring.

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
	"os"
	"time"

	apisix "github.com/apache/apisix-ingress-controller/pkg/kube/apisix/apis/config/v2beta3"
	"github.com/jaevor/go-nanoid"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"

	adminerv1 "github.com/labring/sealos/controllers/db/adminer/api/v1"
)

const (
	protocolHTTPS       = "https://"
	protocolHTTP        = "http://"
	FinalizerName       = "adminer.db.sealos.io/finalizer"
	HostnameLength      = 8
	KeepaliveAnnotation = "lastUpdateTime"
	LetterBytes         = "abcdefghijklmnopqrstuvwxyz0123456789"
)

const (
	DefaultDomain          = "cloud.sealos.io"
	DefaultSecretName      = "wildcard-cloud-sealos-io-cert"
	DefaultSecretNamespace = "sealos-system"
	DefaultImage           = "docker.io/labring/docker-adminer:v4.8.1"
)

var (
	defaultReplicas = int32(1)
)

// request and limit for adminer pod
const (
	CPURequest    = "0.02"
	MemoryRequest = "32Mi"
	CPULimit      = "0.1"
	MemoryLimit   = "128Mi"
)

// AdminerReconciler reconciles a Adminer object
type AdminerReconciler struct {
	client.Client
	Scheme          *runtime.Scheme
	recorder        record.EventRecorder
	Config          *rest.Config
	adminerDomain   string
	tlsEnabled      bool
	image           string
	secretName      string
	secretNamespace string
}

//+kubebuilder:rbac:groups=adminer.db.sealos.io,resources=adminers,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=adminer.db.sealos.io,resources=adminers/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=adminer.db.sealos.io,resources=adminers/finalizers,verbs=update
//+kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=services,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=events,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=networking.k8s.io,resources=ingresses,verbs=get;list;watch;create;update;patch;delete

// No needed for now
//-kubebuilder:rbac:groups=apisix.apache.org,resources=apisixroutes,verbs=get;list;watch;create;update;patch;delete
//-kubebuilder:rbac:groups=apisix.apache.org,resources=apisixtlses,verbs=get;list;watch;create;update;patch;delete
//-kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=roles,verbs=get;list;watch;create;update;patch;delete
//-kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=rolebindings,verbs=get;list;watch;create;update;patch;delete

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Adminer object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.12.1/pkg/reconcile
func (r *AdminerReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx, "adminer", req.NamespacedName)
	adminer := &adminerv1.Adminer{}
	if err := r.Get(ctx, req.NamespacedName, adminer); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if adminer.ObjectMeta.DeletionTimestamp.IsZero() {
		if controllerutil.AddFinalizer(adminer, FinalizerName) {
			if err := r.Update(ctx, adminer); err != nil {
				return ctrl.Result{}, err
			}
		}
	} else {
		if controllerutil.RemoveFinalizer(adminer, FinalizerName) {
			if err := r.Update(ctx, adminer); err != nil {
				return ctrl.Result{}, err
			}
		}
		return ctrl.Result{}, nil
	}

	if err := r.fillDefaultValue(ctx, adminer); err != nil {
		return ctrl.Result{}, err
	}

	if isExpired(adminer) {
		if err := r.Delete(ctx, adminer); err != nil {
			return ctrl.Result{}, err
		}
		logger.Info("delete expired adminer success")
		return ctrl.Result{}, nil
	}

	if err := r.syncSecret(ctx, adminer); err != nil {
		logger.Error(err, "create secret failed")
		r.recorder.Eventf(adminer, corev1.EventTypeWarning, "Create secret failed", "%v", err)
		return ctrl.Result{}, err
	}

	var hostname string
	if err := r.syncDeployment(ctx, adminer, &hostname); err != nil {
		logger.Error(err, "create deployment failed")
		r.recorder.Eventf(adminer, corev1.EventTypeWarning, "Create deployment failed", "%v", err)
		return ctrl.Result{}, err
	}

	if err := r.syncService(ctx, adminer); err != nil {
		logger.Error(err, "create service failed")
		r.recorder.Eventf(adminer, corev1.EventTypeWarning, "Create service failed", "%v", err)
		return ctrl.Result{}, err
	}

	if err := r.syncIngress(ctx, adminer, hostname); err != nil {
		logger.Error(err, "create ingress failed")
		r.recorder.Eventf(adminer, corev1.EventTypeWarning, "Create ingress failed", "%v", err)
		return ctrl.Result{}, err
	}

	r.recorder.Eventf(adminer, corev1.EventTypeNormal, "Created", "create adminer success: %v", adminer.Name)
	duration, _ := time.ParseDuration(adminer.Spec.Keepalived)
	return ctrl.Result{RequeueAfter: duration}, nil
}

func (r *AdminerReconciler) syncSecret(ctx context.Context, adminer *adminerv1.Adminer) error {
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      adminer.Name,
			Namespace: adminer.Namespace,
		},
	}

	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, secret, func() error {
		expectSecret := r.createSecret(adminer)
		secret.StringData = expectSecret.StringData
		secret.Type = expectSecret.Type
		return controllerutil.SetControllerReference(adminer, secret, r.Scheme)
	}); err != nil {
		return err
	}
	return nil
}

func (r *AdminerReconciler) syncDeployment(ctx context.Context, adminer *adminerv1.Adminer, hostname *string) error {
	labelsMap := buildLabelsMap(adminer)

	objectMeta := metav1.ObjectMeta{
		Name:      adminer.Name,
		Namespace: adminer.Namespace,
	}

	selector := &metav1.LabelSelector{
		MatchLabels: labelsMap,
	}

	templateObjMeta := metav1.ObjectMeta{
		Labels: labelsMap,
	}

	containers := []corev1.Container{
		{
			Name:  "adminer",
			Image: r.image,
			Ports: []corev1.ContainerPort{
				{
					Name:          "http",
					Protocol:      corev1.ProtocolTCP,
					ContainerPort: 8080,
				},
			},
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
			VolumeMounts: []corev1.VolumeMount{
				{
					Name: "servers-volume",
					// Note: we cannot use subpath since k8s cannot auto update it's mounts.
					// @see: https://kubernetes.io/docs/concepts/configuration/secret/#mounted-secrets-are-updated-automatically
					MountPath: "/var/www/html/servers",
					// MountPath: "/var/www/html/servers.php",
					// SubPath:   "servers.php",
					ReadOnly: true,
				},
			},
		},
	}

	volumes := []corev1.Volume{
		{
			Name: "servers-volume",
			VolumeSource: corev1.VolumeSource{
				Secret: &corev1.SecretVolumeSource{
					SecretName: adminer.Name,
					// Items: []corev1.KeyToPath{
					// 	{
					// 		Key:  "servers",
					// 		Path: "servers.php",
					// 	},
					// },
				},
			},
		},
	}

	expectDeployment := &appsv1.Deployment{
		ObjectMeta: objectMeta,
		Spec: appsv1.DeploymentSpec{
			Replicas: &defaultReplicas,
			Selector: selector,
			Template: corev1.PodTemplateSpec{
				ObjectMeta: templateObjMeta,
				Spec: corev1.PodSpec{
					Containers: containers,
					Volumes:    volumes,
				},
			},
		},
	}

	deployment := &appsv1.Deployment{
		ObjectMeta: objectMeta,
	}

	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, deployment, func() error {
		// only update some specific fields
		deployment.Spec.Replicas = expectDeployment.Spec.Replicas
		deployment.Spec.Selector = expectDeployment.Spec.Selector
		deployment.Spec.Template.ObjectMeta.Labels = expectDeployment.Spec.Template.Labels
		if len(deployment.Spec.Template.Spec.Containers) == 0 {
			deployment.Spec.Template.Spec.Containers = containers
		} else {
			deployment.Spec.Template.Spec.Containers[0].Name = containers[0].Name
			deployment.Spec.Template.Spec.Containers[0].Image = containers[0].Image
			deployment.Spec.Template.Spec.Containers[0].Ports = containers[0].Ports
			deployment.Spec.Template.Spec.Containers[0].Resources = containers[0].Resources
			deployment.Spec.Template.Spec.Containers[0].VolumeMounts = containers[0].VolumeMounts
		}
		if len(deployment.Spec.Template.Spec.Volumes) == 0 {
			deployment.Spec.Template.Spec.Volumes = volumes
		} else {
			deployment.Spec.Template.Spec.Volumes[0].Name = volumes[0].Name
			deployment.Spec.Template.Spec.Volumes[0].VolumeSource = volumes[0].VolumeSource
		}

		if deployment.Spec.Template.Spec.Hostname == "" {
			letterID, err := nanoid.CustomASCII(LetterBytes, HostnameLength)
			if err != nil {
				return err
			}
			// to keep pace with ingress host, hostname must start with a lower case letter
			*hostname = "a" + letterID()
			deployment.Spec.Template.Spec.Hostname = *hostname
		} else {
			*hostname = deployment.Spec.Template.Spec.Hostname
		}

		return controllerutil.SetControllerReference(adminer, deployment, r.Scheme)
	}); err != nil {
		return err
	}

	if adminer.Status.AvailableReplicas != deployment.Status.AvailableReplicas {
		adminer.Status.AvailableReplicas = deployment.Status.AvailableReplicas
		return r.Status().Update(ctx, adminer)
	}

	return nil
}

func (r *AdminerReconciler) syncService(ctx context.Context, adminer *adminerv1.Adminer) error {
	labelsMap := buildLabelsMap(adminer)
	expectService := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      adminer.Name,
			Namespace: adminer.Namespace,
		},
		Spec: corev1.ServiceSpec{
			Selector: labelsMap,
			Type:     corev1.ServiceTypeClusterIP,
			Ports: []corev1.ServicePort{
				{Name: "adminer", Port: 8080, TargetPort: intstr.FromInt(8080), Protocol: corev1.ProtocolTCP},
			},
		},
	}

	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      adminer.Name,
			Namespace: adminer.Namespace,
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
		return controllerutil.SetControllerReference(adminer, service, r.Scheme)
	}); err != nil {
		return err
	}
	return nil
}

func (r *AdminerReconciler) syncIngress(ctx context.Context, adminer *adminerv1.Adminer, hostname string) error {
	var err error
	host := hostname + "." + r.adminerDomain
	switch adminer.Spec.IngressType {
	case adminerv1.Nginx:
		err = r.syncNginxIngress(ctx, adminer, host)
	case adminerv1.Apisix:
		err = r.syncApisixIngress(ctx, adminer, host)
	}
	return err
}

func (r *AdminerReconciler) syncNginxIngress(ctx context.Context, adminer *adminerv1.Adminer, host string) error {
	ingress := &networkingv1.Ingress{
		ObjectMeta: metav1.ObjectMeta{
			Name:      adminer.Name,
			Namespace: adminer.Namespace,
		},
	}
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, ingress, func() error {
		expectIngress := r.createNginxIngress(adminer, host)
		ingress.ObjectMeta.Labels = expectIngress.ObjectMeta.Labels
		ingress.ObjectMeta.Annotations = expectIngress.ObjectMeta.Annotations
		ingress.Spec.Rules = expectIngress.Spec.Rules
		ingress.Spec.TLS = expectIngress.Spec.TLS
		return controllerutil.SetControllerReference(adminer, ingress, r.Scheme)
	}); err != nil {
		return err
	}

	protocol := protocolHTTPS
	if !r.tlsEnabled {
		protocol = protocolHTTP
	}

	domain := protocol + host
	if adminer.Status.Domain != domain {
		adminer.Status.Domain = domain
		return r.Status().Update(ctx, adminer)
	}

	return nil
}

func (r *AdminerReconciler) syncApisixIngress(ctx context.Context, adminer *adminerv1.Adminer, host string) error {
	// 1. sync ApisixRoute
	apisixRoute := &apisix.ApisixRoute{
		ObjectMeta: metav1.ObjectMeta{
			Name:      adminer.Name,
			Namespace: adminer.Namespace,
		},
	}
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, apisixRoute, func() error {
		expectRoute := r.createApisixRoute(adminer, host)
		if len(apisixRoute.Spec.HTTP) == 0 {
			apisixRoute.Spec.HTTP = expectRoute.Spec.HTTP
		} else {
			apisixRoute.Spec.HTTP[0].Name = expectRoute.Spec.HTTP[0].Name
			apisixRoute.Spec.HTTP[0].Match = expectRoute.Spec.HTTP[0].Match
			apisixRoute.Spec.HTTP[0].Backends = expectRoute.Spec.HTTP[0].Backends
			apisixRoute.Spec.HTTP[0].Timeout = expectRoute.Spec.HTTP[0].Timeout
			apisixRoute.Spec.HTTP[0].Authentication = expectRoute.Spec.HTTP[0].Authentication
		}
		return controllerutil.SetControllerReference(adminer, apisixRoute, r.Scheme)
	}); err != nil {
		return err
	}

	// 2. sync ApisixTls
	if r.tlsEnabled {
		apisixTLS := &apisix.ApisixTls{
			ObjectMeta: metav1.ObjectMeta{
				Name:      adminer.Name,
				Namespace: adminer.Namespace,
			},
		}
		if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, apisixTLS, func() error {
			expectTLS := r.createApisixTLS(adminer, host)
			if apisixTLS.Spec != nil {
				apisixTLS.Spec.Hosts = expectTLS.Spec.Hosts
				apisixTLS.Spec.Secret = expectTLS.Spec.Secret
			} else {
				apisixTLS.Spec = expectTLS.Spec
			}
			return controllerutil.SetControllerReference(adminer, apisixTLS, r.Scheme)
		}); err != nil {
			return err
		}
	}

	protocol := protocolHTTPS
	if !r.tlsEnabled {
		protocol = protocolHTTP
	}

	domain := protocol + host
	if adminer.Status.Domain != domain {
		adminer.Status.Domain = domain
		return r.Status().Update(ctx, adminer)
	}

	return nil
}

func (r *AdminerReconciler) fillDefaultValue(ctx context.Context, adminer *adminerv1.Adminer) error {
	hasUpdate := false

	if _, ok := adminer.ObjectMeta.Annotations[KeepaliveAnnotation]; !ok {
		adminer.ObjectMeta.Annotations[KeepaliveAnnotation] = time.Now().Format(time.RFC3339)
		hasUpdate = true
	}

	if hasUpdate {
		return r.Update(ctx, adminer)
	}

	return nil
}

// isExpired return true if the adminer has expired
func isExpired(adminer *adminerv1.Adminer) bool {
	anno := adminer.ObjectMeta.Annotations
	lastUpdateTime, err := time.Parse(time.RFC3339, anno[KeepaliveAnnotation])
	if err != nil {
		// treat parse errors as not expired
		return false
	}

	duration, _ := time.ParseDuration(adminer.Spec.Keepalived)
	return lastUpdateTime.Add(duration).Before(time.Now())
}

func buildLabelsMap(adminer *adminerv1.Adminer) map[string]string {
	labelsMap := map[string]string{
		"AdminerID": adminer.Name,
	}
	return labelsMap
}

func getDomain() string {
	domain := os.Getenv("DOMAIN")
	if domain == "" {
		return DefaultDomain
	}
	return domain
}

func getTLSEnabled() bool {
	tlsEnabled := os.Getenv("TLS_ENABLED")
	if tlsEnabled == "" {
		return true
	}
	return tlsEnabled == "true" || tlsEnabled == "1" || tlsEnabled == "on"
}

func getImage() string {
	image := os.Getenv("IMAGE")
	if image == "" {
		return DefaultImage
	}
	return image
}

func getSecretName() string {
	secretName := os.Getenv("SECRET_NAME")
	if secretName == "" {
		return DefaultSecretName
	}
	return secretName
}

func getSecretNamespace() string {
	secretNamespace := os.Getenv("SECRET_NAMESPACE")
	if secretNamespace == "" {
		return DefaultSecretNamespace
	}
	return secretNamespace
}

// SetupWithManager sets up the controller with the Manager.
func (r *AdminerReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.recorder = mgr.GetEventRecorderFor("sealos-db-adminer-controller")
	r.adminerDomain = getDomain()
	r.tlsEnabled = getTLSEnabled()
	r.image = getImage()
	r.secretName = getSecretName()
	r.secretNamespace = getSecretNamespace()
	r.Config = mgr.GetConfig()
	return ctrl.NewControllerManagedBy(mgr).
		For(&adminerv1.Adminer{}).
		Owns(&appsv1.Deployment{}).Owns(&corev1.Service{}).Owns(&corev1.Secret{}).Owns(&networkingv1.Ingress{}).
		Complete(r)
}
