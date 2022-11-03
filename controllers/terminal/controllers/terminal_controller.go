/*
Copyright 2022 labring.

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
	"time"

	uuid "github.com/satori/go.uuid"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/source"

	terminalv1 "github.com/labring/sealos/controllers/terminal/api/v1"
)

const (
	Protocol            = "https://"
	FinalizerName       = "terminal.sealos.io/finalizer"
	HostnameLength      = 8
	TerminalNamespace   = "terminal-app"
	KeepaliveAnnotation = "lastUpdateTime"
)

// TerminalReconciler reconciles a Terminal object
type TerminalReconciler struct {
	client.Client
	Scheme   *runtime.Scheme
	recorder record.EventRecorder
	Config   *rest.Config
}

//+kubebuilder:rbac:groups=terminal.sealos.io,resources=terminals,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=terminal.sealos.io,resources=terminals/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=terminal.sealos.io,resources=terminals/finalizers,verbs=update
//+kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=services,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=events,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=networking.k8s.io,resources=ingresses,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=roles,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=rolebindings,verbs=get;list;watch;create;update;patch;delete

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Terminal object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.12.1/pkg/reconcile
func (r *TerminalReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx, "terminal", req.NamespacedName)
	terminal := &terminalv1.Terminal{}
	if err := r.Get(ctx, req.NamespacedName, terminal); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	terminalApp := &terminalv1.Terminal{
		ObjectMeta: metav1.ObjectMeta{
			Name:      req.Name,
			Namespace: TerminalNamespace,
		},
	}
	if req.Namespace != TerminalNamespace {
		if terminal.ObjectMeta.DeletionTimestamp.IsZero() {
			if controllerutil.AddFinalizer(terminal, FinalizerName) {
				if err := r.Update(ctx, terminal); err != nil {
					return ctrl.Result{}, err
				}
			}
		} else {
			// delete terminal-app
			if err := r.Delete(ctx, terminalApp); err != nil {
				return ctrl.Result{}, err
			}
			if controllerutil.RemoveFinalizer(terminal, FinalizerName) {
				if err := r.Update(ctx, terminal); err != nil {
					return ctrl.Result{}, err
				}
			}
			return ctrl.Result{}, nil
		}

		if err := r.fillDefaultValue(ctx, terminal); err != nil {
			return ctrl.Result{}, err
		}

		if isExpired(terminal) {
			if err := r.Delete(ctx, terminal); err != nil {
				return ctrl.Result{}, err
			}
			logger.Info("delete expired terminal success")
			return ctrl.Result{}, nil
		}
	}

	// crate a terminal in terminal-app ns
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, terminalApp, func() error {
		terminalApp.Spec = terminal.Spec
		return nil
	}); err != nil {
		return ctrl.Result{}, err
	}

	if err := r.syncRoleBinding(ctx, terminalApp); err != nil {
		logger.Error(err, "create Role and RoleBinding failed")
		r.recorder.Eventf(terminal, corev1.EventTypeWarning, "Create Role and RoleBinding failed", "%v", err)
		return ctrl.Result{}, err
	}

	if err := r.syncDeployment(ctx, terminalApp); err != nil {
		logger.Error(err, "create deployment failed")
		r.recorder.Eventf(terminal, corev1.EventTypeWarning, "Create deployment failed", "%v", err)
		return ctrl.Result{}, err
	}
	if err := r.syncService(ctx, terminalApp); err != nil {
		logger.Error(err, "create service failed")
		r.recorder.Eventf(terminal, corev1.EventTypeWarning, "Create service failed", "%v", err)
		return ctrl.Result{}, err
	}

	if err := r.syncIngress(ctx, terminalApp); err != nil {
		logger.Error(err, "create ingress failed")
		r.recorder.Eventf(terminal, corev1.EventTypeWarning, "Create ingress failed", "%v", err)
		return ctrl.Result{}, err
	}

	r.recorder.Eventf(terminal, corev1.EventTypeNormal, "Created", "create terminal success: %v", terminal.Name)
	duration, _ := time.ParseDuration(terminal.Spec.Keepalived)
	return ctrl.Result{RequeueAfter: duration}, nil
}

func (r *TerminalReconciler) syncRoleBinding(ctx context.Context, terminal *terminalv1.Terminal) error {
	role := &rbacv1.Role{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "terminalAppRole-" + terminal.Spec.User,
			Namespace: TerminalNamespace,
		},
	}
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, role, func() error {
		role.Rules = []rbacv1.PolicyRule{
			{
				APIGroups:     []string{"terminal.sealos.io"},
				Resources:     []string{"terminals"},
				Verbs:         []string{"get", "watch", "list"},
				ResourceNames: []string{terminal.Name},
			},
		}
		if err := controllerutil.SetControllerReference(terminal, role, r.Scheme); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return err
	}

	roleBinding := &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "terminalAppRoleBinding-" + terminal.Spec.User,
			Namespace: TerminalNamespace,
		},
	}
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, roleBinding, func() error {
		roleBinding.RoleRef = rbacv1.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "Role",
			Name:     role.Name,
		}
		roleBinding.Subjects = []rbacv1.Subject{
			{
				Kind:      "ServiceAccount",
				Name:      terminal.Spec.User,
				Namespace: GetDefaultUserNamespace(),
			},
		}

		if err := controllerutil.SetControllerReference(terminal, roleBinding, r.Scheme); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return err
	}

	return nil
}

func (r *TerminalReconciler) syncIngress(ctx context.Context, terminal *terminalv1.Terminal) error {
	var host string
	ingress := &networkingv1.Ingress{
		ObjectMeta: metav1.ObjectMeta{
			Name:      terminal.Name,
			Namespace: terminal.Namespace,
		},
	}
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, ingress, func() error {
		if len(ingress.Spec.Rules) != 0 && ingress.Spec.Rules[0].Host != "" {
			host = ingress.Spec.Rules[0].Host
		} else {
			host = uuid.NewV4().String() + DomainSuffix
		}
		expectIngress := createIngress(terminal, host)
		ingress.ObjectMeta.Labels = expectIngress.ObjectMeta.Labels
		ingress.ObjectMeta.Annotations = expectIngress.ObjectMeta.Annotations
		ingress.Spec.Rules = expectIngress.Spec.Rules
		ingress.Spec.TLS = expectIngress.Spec.TLS
		if err := controllerutil.SetControllerReference(terminal, ingress, r.Scheme); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return err
	}

	domain := Protocol + host
	if terminal.Status.Domain != domain {
		terminal.Status.Domain = domain
		return r.Status().Update(ctx, terminal)
	}

	return nil
}

func (r *TerminalReconciler) syncService(ctx context.Context, terminal *terminalv1.Terminal) error {
	labelsMap := buildLabelsMap(terminal)
	expectService := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      terminal.Name,
			Namespace: terminal.Namespace,
		},
		Spec: corev1.ServiceSpec{
			Selector: labelsMap,
			Type:     corev1.ServiceTypeClusterIP,
			Ports: []corev1.ServicePort{
				{Name: "tty", Port: 8080, TargetPort: intstr.FromInt(8080), Protocol: corev1.ProtocolTCP},
			},
		},
	}

	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      terminal.Name,
			Namespace: terminal.Namespace,
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
		if err := controllerutil.SetControllerReference(terminal, service, r.Scheme); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return err
	}
	return nil
}

func (r *TerminalReconciler) syncDeployment(ctx context.Context, terminal *terminalv1.Terminal) error {
	labelsMap := buildLabelsMap(terminal)
	var (
		objectMeta      metav1.ObjectMeta
		selector        *metav1.LabelSelector
		templateObjMeta metav1.ObjectMeta
		ports           []corev1.ContainerPort
		envs            []corev1.EnvVar
		containers      []corev1.Container
	)

	objectMeta = metav1.ObjectMeta{
		Name:      terminal.Name,
		Namespace: terminal.Namespace,
	}
	selector = &metav1.LabelSelector{
		MatchLabels: labelsMap,
	}
	templateObjMeta = metav1.ObjectMeta{
		Labels: labelsMap,
	}
	ports = []corev1.ContainerPort{
		{
			Name:          "http",
			Protocol:      corev1.ProtocolTCP,
			ContainerPort: 8080,
		},
	}
	envs = []corev1.EnvVar{
		{Name: "APISERVER", Value: terminal.Spec.APIServer},
		{Name: "USER_TOKEN", Value: terminal.Spec.Token},
		{Name: "NAMESPACE", Value: terminal.Spec.Namespace},
		{Name: "USER_NAME", Value: terminal.Spec.User},
	}

	containers = []corev1.Container{
		{Name: "tty", Image: terminal.Spec.TTYImage, Ports: ports, Env: envs},
	}

	expectDeployment := &appsv1.Deployment{
		ObjectMeta: objectMeta,
		Spec: appsv1.DeploymentSpec{
			Replicas: terminal.Spec.Replicas,
			Selector: selector,
			Template: corev1.PodTemplateSpec{
				ObjectMeta: templateObjMeta,
				Spec: corev1.PodSpec{
					Containers: containers,
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
			deployment.Spec.Template.Spec.Containers[0].Env = containers[0].Env
		}

		if deployment.Spec.Template.Spec.Hostname == "" {
			deployment.Spec.Template.Spec.Hostname = randString(HostnameLength)
		}

		if err := controllerutil.SetControllerReference(terminal, deployment, r.Scheme); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return err
	}

	if terminal.Status.AvailableReplicas != deployment.Status.AvailableReplicas {
		terminal.Status.AvailableReplicas = deployment.Status.AvailableReplicas
		return r.Status().Update(ctx, terminal)
	}

	return nil
}

func (r *TerminalReconciler) fillDefaultValue(ctx context.Context, terminal *terminalv1.Terminal) error {
	hasUpdate := false
	if terminal.Spec.APIServer == "" {
		terminal.Spec.APIServer = r.Config.Host
		hasUpdate = true
	}

	if terminal.Spec.Namespace == "" {
		terminal.Spec.Namespace = terminal.Namespace
		hasUpdate = true
	}

	if _, ok := terminal.ObjectMeta.Annotations[KeepaliveAnnotation]; !ok {
		terminal.ObjectMeta.Annotations[KeepaliveAnnotation] = time.Now().Format(time.RFC3339)
		hasUpdate = true
	}

	if hasUpdate {
		return r.Update(ctx, terminal)
	}

	return nil
}

// isExpired return true if the terminal has expired
func isExpired(terminal *terminalv1.Terminal) bool {
	anno := terminal.ObjectMeta.Annotations
	lastUpdateTime, err := time.Parse(time.RFC3339, anno[KeepaliveAnnotation])
	if err != nil {
		// treat parse errors as not expired
		return false
	}

	duration, _ := time.ParseDuration(terminal.Spec.Keepalived)
	return lastUpdateTime.Add(duration).Before(time.Now())
}

func buildLabelsMap(terminal *terminalv1.Terminal) map[string]string {
	labelsMap := map[string]string{
		"TerminalID": terminal.Name,
	}
	return labelsMap
}

// SetupWithManager sets up the controller with the Manager.
func (r *TerminalReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.recorder = mgr.GetEventRecorderFor("sealos-terminal-controller")
	r.Config = mgr.GetConfig()
	owner := &handler.EnqueueRequestForOwner{OwnerType: &terminalv1.Terminal{}, IsController: false}
	return ctrl.NewControllerManagedBy(mgr).
		For(&terminalv1.Terminal{}).
		Watches(&source.Kind{Type: &appsv1.Deployment{}}, owner).
		Complete(r)
}
