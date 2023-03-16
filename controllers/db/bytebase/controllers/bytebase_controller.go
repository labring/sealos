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

package controllers

import (
	"context"
	"time"

	"github.com/go-logr/logr"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"

	//	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"

	bbv1 "github.com/labring/sealos/controllers/db/bytebase/api/v1"

	bbclient "github.com/labring/sealos/controllers/db/bytebase/client"
	api "github.com/labring/sealos/controllers/db/bytebase/client/api"

	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	// "sigs.k8s.io/controller-runtime/pkg/log"
)

const (
	Protocol            = "https://"
	FinalizerName       = "bytebase.sealos.io/finalizer"
	HostnameLength      = 8
	KeepaliveAnnotation = "lastUpdateTime"
	LetterBytes         = "abcdefghijklmnopqrstuvwxyz0123456789"
)

const (
	CPURequest    = "0.04"
	MemoryRequest = "64Mi"
	CPULimit      = "0.5"
	MemoryLimit   = "128Mi"
)

const (
	DomainSuffix = ".cloud.sealos.io"
	AuthType     = "basicAuth"
)

// BytebaseReconciler reconciles a Bytebase object
type BytebaseReconciler struct {
	client.Client
	Scheme          *runtime.Scheme
	Recorder        record.EventRecorder
	Logger          logr.Logger
	Config          *rest.Config
	SecretName      string
	SecretNamespace string
	Bc              api.Client // bytebase client
}

//+kubebuilder:rbac:groups=db.sealos.io,resources=bytebases,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=db.sealos.io,resources=bytebases/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=db.sealos.io,resources=bytebases/finalizers,verbs=update
//+kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=services,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch
//+kubebuilder:rbac:groups="",resources=events,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=networking.k8s.io,resources=ingresses,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=roles,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=rolebindings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=apisix.apache.org,resources=apisixroutes,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=apisix.apache.org,resources=apisixtlses,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=acid.zalan.do,resources=postgresqls,verbs=get;list;watch;create;update;patch;delete

func (r *BytebaseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := r.Logger
	bb := &bbv1.Bytebase{}
	// Get CRD bytebase (status). Call reconciler again if not found.
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

	url := "http://" + svc.Spec.ClusterIP + ":" + bb.Spec.Port.String()
	version := "v1"

	healthCheckURL := url + "/healthz"

	if err := bbclient.CheckServerHealth(healthCheckURL); err != nil {
		message := "wait for bytebase instance to be initialized and started..."
		logger.Info(message)
		return ctrl.Result{Requeue: true}, err
	}

	// register bytebase account
	email := "admin@sealos.io"
	passwd, err := generateRandomString(16)
	if err != nil {
		logger.Error(err, "failed to generated password for the user")
		return ctrl.Result{}, err
	}
	// passwd := "1234"
	// This is first time the user login, so we register the user.
	if r.Bc == nil {
		var clientErr error
		r.Bc, clientErr = bbclient.NewClient(url, version, email, passwd)
		if clientErr != nil {
			logger.Error(clientErr, "Error registering user")
			return ctrl.Result{}, clientErr
		}
		logger.Info("successfully registered and logged user in.")
	}

	if err != nil {
		logger.Error(err, "Fetch token error.")
		return ctrl.Result{}, err
	}

	if err := r.syncIngress(ctx, bb, hostname); err != nil {
		logger.Error(err, "create ingress failed")
		return ctrl.Result{}, err
	}

	if err := r.syncInstance(ctx, req, bb); err != nil {
		logger.Error(err, "create instance failed")
		return ctrl.Result{}, err
	}

	// r.Recorder.Eventf(bb, corev1.EventTypeNormal, "Created and Initialized", "bytebase success: %v", bb.Name)
	logger.Info("reconciling completed")
	return ctrl.Result{}, nil
}

func (r *BytebaseReconciler) fillDefaultValue(ctx context.Context, bb *bbv1.Bytebase) error {
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
func (r *BytebaseReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&bbv1.Bytebase{}).Owns(&appsv1.Deployment{}).Owns(&networkingv1.Ingress{}).Owns(&corev1.Service{}).
		Complete(r)
}
