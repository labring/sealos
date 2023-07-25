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

package controller

import (
	"context"
	"errors"
	"net/http"
	"sync"
	"time"

	"github.com/go-logr/logr"
	ntf "github.com/labring/sealos/controllers/common/notification/api/v1"
	issuerv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	"github.com/labring/sealos/controllers/licenseissuer/internal/controller/util"
	issuer "github.com/labring/sealos/controllers/licenseissuer/internal/manager"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// NotificationReconciler reconciles a Notification object
type NotificationReconciler struct {
	client.Client
	Scheme          *runtime.Scheme
	NotificationMgr *issuer.NotificationManager
	Users           issuer.UserCategory
	logger          logr.Logger
}

//+kubebuilder:rbac:groups=core,resources=nodes,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=persistentvolumes,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch;create;update
//+kubebuilder:rbac:groups=infostream.sealos.io,resources=notifications,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=infostream.sealos.io,resources=notifications/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=infostream.sealos.io,resources=notifications/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Notification object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.14.4/pkg/reconcile

func (r *NotificationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.logger.Info("Enter NotificationReconcile", "namespace:", req.Namespace, "name", req.Name)
	if err := r.Users.GetNameSpace(ctx, r.Client); err != nil {
		r.logger.Error(err, "failed to get users info")
		return ctrl.Result{}, err
	}
	r.logger.Info("Start to get the resource for pull notification...")
	var (
		err          error
		configMap    corev1.ConfigMap
		url          string
		clusterScret corev1.Secret
		launcher     issuerv1.Launcher
	)
	var (
		readOperations  issuer.ReadOperationList
		writeOperations issuer.WriteOperationList
	)

	// read the resource for pull notification
	(&issuer.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).WithObject(&launcher).
		WithTag(req.NamespacedName).AddToList(&readOperations)
	(&issuer.WriteEventBuilder{}).WithCallback(func() error {
		if launcher.Labels[string(issuer.NotificationLable)] == string(issuer.TRUE) {
			return nil
		}
		launcher.Labels[string(issuer.NotificationLable)] = issuer.TRUE
		return r.Client.Update(ctx, &launcher)
	}).AddToList(&writeOperations)
	(&issuer.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).WithObject(&clusterScret).
		WithTag(types.NamespacedName{Namespace: string(issuer.Namespace), Name: string(issuer.ClusterInfoSecretName)}).
		AddToList(&readOperations)
	(&issuer.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).WithObject(&configMap).
		WithTag(types.NamespacedName{Namespace: string(issuer.Namespace), Name: string(issuer.URLConfigName)}).
		AddToList(&readOperations)

	if err := readOperations.Execute(); err != nil {
		r.logger.Error(err, "failed to get the resource for pull notification")
		return ctrl.Result{}, err
	}
	if err := writeOperations.Execute(); err != nil {
		r.logger.Error(err, "failed to update the launcher")
		return ctrl.Result{}, err
	}

	config, err := util.ReadConfigFromConfigMap(string(issuer.URLConfigName), &configMap)
	if err != nil {
		r.logger.Error(err, "failed to read config")
		return ctrl.Result{}, err
	}

	r.logger.Info("Start to pull notification from cloud...")
	url = config.NotificationURL
	var requestBody = issuer.NotificationRequest{
		UID:       string(clusterScret.Data["uid"]),
		Timestamp: r.NotificationMgr.TimeLastPull,
	}

	// communicate with cloud
	r.logger.Info("Starting to communicate with cloud")
	httpResp, err := issuer.CommunicateWithCloud("POST", url, requestBody)
	if err != nil {
		r.logger.Error(err, "failed to communicate with cloud")
		return ctrl.Result{}, err
	}
	if !issuer.IsSuccessfulStatusCode(httpResp.StatusCode) {
		r.logger.Error(errors.New(http.StatusText(httpResp.StatusCode)), string(httpResp.Body))
		return ctrl.Result{}, errors.New(http.StatusText(httpResp.StatusCode))
	}

	// submit the notification to the cluster
	var notificationResp []issuer.NotificationResponse
	var notificationCache []ntf.Notification
	err = issuer.Convert(httpResp.Body, &notificationResp)
	if err != nil {
		r.logger.Error(err, "failed to convert notifications")
		return ctrl.Result{}, err
	}

	r.logger.Info("Starting to delivery notifications")
	for _, body := range notificationResp {
		notificationCache = append(notificationCache, issuer.NotificationResponseToNotification(body))
	}
	var wg sync.WaitGroup
	errchan := make(chan error)
	for _, targetMap := range r.Users {
		for ns := range targetMap.Iter() {
			wg.Add(1)
			notificationTask := issuer.NewNotificationTask(ctx, r.Client, ns, notificationCache)
			go issuer.AsyncCloudTask(&wg, errchan, &notificationTask)
		}
	}
	go func() {
		wg.Wait()
		close(errchan)
	}()
	for err := range errchan {
		if err != nil {
			r.logger.Error(err, "failed to delivery notification")
		}
	}
	r.NotificationMgr.InitTime()
	return ctrl.Result{RequeueAfter: time.Second * 3600}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *NotificationReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.logger = ctrl.Log.WithName("NotificationReconcile")
	r.NotificationMgr = issuer.NewNotificationManager()
	r.Users = issuer.UserCategory{}

	Predicate := predicate.NewPredicateFuncs(func(object client.Object) bool {
		return object.GetName() == string(issuer.ClientStartName) &&
			object.GetNamespace() == string(issuer.Namespace) &&
			object.GetLabels() != nil &&
			object.GetLabels()[string(issuer.NotificationLable)] == string(issuer.FALSE)
	})
	return ctrl.NewControllerManagedBy(mgr).
		For(&issuerv1.Launcher{}, builder.WithPredicates(Predicate)).
		Complete(r)
}
