/*
Copyright 2023.

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

package bytebase

import (
	"context"
	"fmt"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/go-logr/logr"
	bbv1 "github.com/labring/sealos/controllers/db/bytebase/apis/bytebase/v1"
	bbclient "github.com/labring/sealos/controllers/db/bytebase/client"
	api "github.com/labring/sealos/controllers/db/bytebase/client/api"
)

const (
	Protocol            = "https://"
	FinalizerName       = "bytebase.sealos.io/finalizer"
	HostnameLength      = 8
	KeepaliveAnnotation = "lastUpdateTime"
	LetterBytes         = "abcdefghijklmnopqrstuvwxyz0123456789"
)

const (
	CPURequest    = "0.05"
	MemoryRequest = "64Mi"
	CPULimit      = "0.5"
	MemoryLimit   = "128Mi"
)

const (
	DefaultDomainSuffix = ".cloud.sealos.io"
	AuthType            = "basicAuth"
)

// Reconciler reconciles a Bytebase object
type Reconciler struct {
	client.Client
	Scheme          *runtime.Scheme
	Recorder        record.EventRecorder
	Logger          logr.Logger // the manager's default logger
	Config          *rest.Config
	SecretName      string
	SecretNamespace string
	Bc              api.Client // bytebase client
	DefaultEmail    string
	RootDomain      string
}

// +kubebuilder:rbac:groups=bytebase.db.sealos.io,resources=bytebases,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=bytebase.db.sealos.io,resources=bytebases/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=bytebase.db.sealos.io,resources=bytebases/finalizers,verbs=update
// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=core,resources=services,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch
// +kubebuilder:rbac:groups="",resources=events,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=networking.k8s.io,resources=ingresses,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=roles,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=rolebindings,verbs=get;list;watch;create;update;patch;delete

func (r *Reconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	// use new logger so that we can log where the request is
	logger := log.FromContext(ctx, "bytebase", req.NamespacedName)
	bb := &bbv1.Bytebase{}
	// get CRD bytebase (status). Call reconciler again if not found.
	if err := r.Get(ctx, req.NamespacedName, bb); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if bb.ObjectMeta.DeletionTimestamp.IsZero() {
		if !controllerutil.ContainsFinalizer(bb, FinalizerName) {
			controllerutil.AddFinalizer(bb, FinalizerName)
			if err := r.Update(ctx, bb); err != nil {
				return ctrl.Result{}, err
			}
		}
	} else {
		logger.Info("remove finalizer")
		if controllerutil.ContainsFinalizer(bb, FinalizerName) {
			r.Bc = nil
			controllerutil.RemoveFinalizer(bb, FinalizerName)
			if err := r.Update(ctx, bb); err != nil {
				return ctrl.Result{}, err
			}
		}
		return ctrl.Result{}, nil
	}

	if err := r.fillDefaultValue(ctx, bb); err != nil {
		return ctrl.Result{}, err
	}

	if isExpired(bb) {
		if err := r.Delete(ctx, bb); err != nil {
			return ctrl.Result{}, err
		}
		r.Bc = nil
		logger.Info("successfully deleted the expired bytebase resource.")
		return ctrl.Result{}, nil
	}

	var hostname string
	if err := r.syncDeployment(ctx, bb, &hostname); err != nil {
		logger.Error(err, "create deployment failed")
		r.Recorder.Eventf(bb, corev1.EventTypeWarning, "create deployment failed", "%v", err)
		return ctrl.Result{}, err
	}

	if err := r.syncService(ctx, bb); err != nil {
		logger.Error(err, "create service failed")
		r.Recorder.Eventf(bb, corev1.EventTypeWarning, "create service failed", "%v", err)
		return ctrl.Result{}, err
	}

	// Init instance logic here
	/// get basic info, bytebase entry point etc
	svc := corev1.Service{}
	if err := r.Get(ctx, client.ObjectKey{
		Namespace: req.Namespace,
		Name:      bb.Name,
	}, &svc); err != nil {
		logger.Error(err, "get bytebase service failed")
		return ctrl.Result{}, err
	}

	url := fmt.Sprintf("http://%s:%s", svc.Spec.ClusterIP, bb.Spec.Port.String())
	version := "v1"
	healthCheckURL := fmt.Sprintf("%s/healthz", url)

	if err := bbclient.CheckServerHealth(healthCheckURL); err != nil {
		message := "wait for bytebase instance to be initialized and started..."
		logger.Info(message)
		return ctrl.Result{}, err
	}

	rootPassword := bb.Status.RootPassword
	if rootPassword == "" {
		password, err := generateRandomString(16)
		if err != nil {
			return ctrl.Result{}, fmt.Errorf("generate Random root password failed: %w", err)
		}
		rootPassword = password
		bb.Status.RootPassword = rootPassword
		if err := r.Status().Update(ctx, bb); err != nil {
			return ctrl.Result{}, fmt.Errorf("update status root password failed: %w", err)
		}
	}

	// register bytebase account
	email := r.DefaultEmail
	// log user in, or if user doesn't exist, register them
	if r.Bc == nil {
		logger.Info("start to register the principal user...")
		var clientErr error
		r.Bc, clientErr = bbclient.NewClient(bb, url, version, email, rootPassword)
		if clientErr != nil {
			logger.Error(clientErr, "Error registering user, retrying...")
			return ctrl.Result{Requeue: true}, clientErr
		}
		logger.Info("successfully registered and logged user in.")

		// update cookie status
		if bb.Status.LoginCookie.AccessToken == "" {
			if loginCookie := r.Bc.GetLoginCookie(); loginCookie.AccessToken != "" {
				bb.Status.LoginCookie = loginCookie
				if err := r.Status().Update(ctx, bb); err != nil {
					return ctrl.Result{}, fmt.Errorf("update status loginCookie failed: %w", err)
				}
			}
		}
	}

	if err := r.syncIngress(ctx, bb, hostname); err != nil {
		logger.Error(err, "create ingress failed")
		return ctrl.Result{}, err
	}

	if err := r.syncInstance(ctx, req); err != nil {
		logger.Error(err, "create instance failed")
		return ctrl.Result{}, err
	}

	r.Recorder.Eventf(bb, corev1.EventTypeNormal, "Created and Initialized", "bytebase success: %v", bb.Name)
	logger.Info("reconciliation completed")
	duration, _ := time.ParseDuration(bb.Spec.Keepalived)
	// reconciliation completed, delete client
	r.Bc = nil
	return ctrl.Result{RequeueAfter: duration}, nil
}

func (r *Reconciler) fillDefaultValue(ctx context.Context, bb *bbv1.Bytebase) error {
	hasUpdate := false

	if bb.ObjectMeta.Annotations == nil {
		bb.ObjectMeta.Annotations = map[string]string{KeepaliveAnnotation: time.Now().Format(time.RFC3339)}
		hasUpdate = true
	} else if _, ok := bb.ObjectMeta.Annotations[KeepaliveAnnotation]; !ok {
		bb.ObjectMeta.Annotations[KeepaliveAnnotation] = time.Now().Format(time.RFC3339)
		hasUpdate = true
	}

	if hasUpdate {
		return r.Update(ctx, bb)
	}
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *Reconciler) SetupWithManager(mgr ctrl.Manager) error {
	// set up default email
	r.DefaultEmail = "admin@sealos.io"
	return ctrl.NewControllerManagedBy(mgr).
		For(&bbv1.Bytebase{}).Owns(&appsv1.Deployment{}).Owns(&networkingv1.Ingress{}).Owns(&corev1.Service{}).
		Complete(r)
}
