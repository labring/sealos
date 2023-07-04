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
	cloudv1 "github.com/labring/sealos/controllers/cloud/api/v1"
	"github.com/labring/sealos/controllers/cloud/internal/controller/util"
	cloud "github.com/labring/sealos/controllers/cloud/internal/manager"
	ntf "github.com/labring/sealos/controllers/common/notification/api/v1"
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
	NotificationMgr *cloud.NotificationManager
	Users           cloud.UserCategory
	logger          logr.Logger
}

//+kubebuilder:rbac:groups=core,resources=nodes,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=persistentvolumes,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch;create;update
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=notifications,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=notifications/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=notifications/finalizers,verbs=update

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
	var err error
	var configMap corev1.ConfigMap
	var url string
	var clusterScret corev1.Secret

	err = r.Client.Get(ctx, types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.SecretName)}, &clusterScret)
	if err != nil {
		r.logger.Error(err, "failed to get secret...")
		return ctrl.Result{}, err
	}

	err = r.Client.Get(ctx, types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.ConfigName)}, &configMap)
	if err != nil {
		r.logger.Error(err, "failed to get configmap...")
		return ctrl.Result{}, err
	}

	config, err := util.ReadConfigFromConfigMap(string(cloud.ConfigName), &configMap)
	if err != nil {
		r.logger.Error(err, "failed to read config")
		return ctrl.Result{}, err
	}
	r.logger.Info("Start to pull notification from cloud...")
	url = config.NotificationURL
	var requestBody = cloud.NotificationRequest{
		UID:       string(clusterScret.Data["uid"]),
		Timestamp: r.NotificationMgr.TimeLastPull,
	}

	r.logger.Info("Starting to communicate with cloud")
	httpResp, err := cloud.CommunicateWithCloud("POST", url, requestBody)
	if err != nil {
		r.logger.Error(err, "failed to communicate with cloud")
		return ctrl.Result{}, err
	}
	if !cloud.IsSuccessfulStatusCode(httpResp.StatusCode) {
		r.logger.Error(errors.New(http.StatusText(httpResp.StatusCode)), string(httpResp.Body))
		return ctrl.Result{}, errors.New(http.StatusText(httpResp.StatusCode))
	}

	var notificationResp []cloud.NotificationResponse
	var notificationCache []ntf.Notification
	err = cloud.Convert(httpResp.Body, &notificationResp)
	if err != nil {
		r.logger.Error(err, "failed to convert notifications")
		return ctrl.Result{}, err
	}

	r.logger.Info("Starting to delivery notifications")
	for _, body := range notificationResp {
		notificationCache = append(notificationCache, cloud.NotificationResponseToNotification(body))
	}
	var wg sync.WaitGroup
	errchan := make(chan error)
	for _, targetMap := range r.Users {
		for ns := range targetMap.Iter() {
			wg.Add(1)
			notificationTask := cloud.NewNotificationTask(ctx, r.Client, ns, notificationCache)
			go cloud.AsyncCloudTask(&wg, errchan, &notificationTask)
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
	r.NotificationMgr = cloud.NewNotificationManager()
	r.Users = cloud.UserCategory{}
	Predicate := predicate.NewPredicateFuncs(func(object client.Object) bool {
		return object.GetName() == string(cloud.ClientStartName) &&
			object.GetNamespace() == string(cloud.Namespace) &&
			object.GetLabels() != nil &&
			object.GetLabels()[string(cloud.IsRead)] == cloud.FALSE &&
			object.GetLabels()[string(cloud.ExternalNetworkAccessLabel)] == string(cloud.Enabled)
	})
	return ctrl.NewControllerManagedBy(mgr).
		For(&cloudv1.Launcher{}, builder.WithPredicates(Predicate)).
		Complete(r)
}
