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
	cloud "github.com/labring/sealos/controllers/cloud/internal/tools"
	"k8s.io/apimachinery/pkg/runtime"
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
	logger          logr.Logger
}

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
	var url string = "https://anqp0y.laf.dev/NotificationHandle"
	var requestBody = cloud.NotificationRequest{
		Uid:       "f4bf10cd-28b3-4384-92ec-24fa006f14d2",
		Timestamp: r.NotificationMgr.TimeLastPull,
	}
	r.logger.Info("Starting to get cluster user")
	em := r.NotificationMgr.GetNameSpace(ctx, r.Client)
	if em != nil {
		r.logger.Error(em.Concat(": "), "GetNamespace error")
		return ctrl.Result{RequeueAfter: time.Second * 5}, em.Concat(": ")
	}
	//---------------------------------------------------------------------------//
	r.logger.Info("Starting to communicate with cloud")
	httpResp, em := cloud.CommunicateWithCloud("POST", url, requestBody)
	if em != nil {
		r.logger.Error(cloud.LoadError("CommunicateWithCloud", em).Concat(": "), "failed to communicate with cloud")
		return ctrl.Result{RequeueAfter: time.Second * 5}, errors.New(http.StatusText(httpResp.StatusCode))
	}
	if !cloud.IsSuccessfulStatusCode(httpResp.StatusCode) {
		r.logger.Error(errors.New(http.StatusText(httpResp.StatusCode)), string(httpResp.Body))
		return ctrl.Result{RequeueAfter: time.Second * 5}, nil
	}
	var content = []cloud.NotificationResponse{}
	if em := cloud.Convert(httpResp.Body, &content, r.NotificationMgr); em != nil {
		r.logger.Error(em.Concat(": "), "failed to convert")
		return ctrl.Result{RequeueAfter: time.Second * 5}, nil
	}
	//---------------------------------------------------------------------------//
	r.logger.Info("Starting to deliver notifications to cluster users")
	var wg sync.WaitGroup
	r.NotificationMgr.ErrorChannel = make(chan *cloud.ErrorMgr)
	for _, targetMap := range []map[string]int{r.NotificationMgr.AdmNamespaceGroup, r.NotificationMgr.UserNameSpaceGroup} {
		for nsName, pos := range targetMap {
			wg.Add(1)
			var tk = cloud.NotificationTask{
				Pos:                pos,
				Size:               len(r.NotificationMgr.NotificationCache),
				Ns:                 nsName,
				RWMutex:            &r.NotificationMgr.RWMutex,
				UserNameSpaceGroup: r.NotificationMgr.UserNameSpaceGroup,
				AdmNamespaceGroup:  r.NotificationMgr.AdmNamespaceGroup,
				NotificationCache:  r.NotificationMgr.NotificationCache,
			}
			go cloud.AsyncCloudTask(r.NotificationMgr.ErrorChannel, &wg, ctx, r.Client, tk)
		}
	}
	go func() {
		wg.Wait()
		close(r.NotificationMgr.ErrorChannel)
	}()
	for em := range r.NotificationMgr.ErrorChannel {
		r.logger.Error(errors.New("notification error"), em.Concat(": ").Error())
	}
	//---------------------------------------------------------------------------//
	r.logger.Info("Starting the update operation")

	if time.Now().Unix() > r.NotificationMgr.ExpireToUpdate {
		r.NotificationMgr.UpdateManager(ctx, r.Client)
	}
	r.logger.Info("The task of the notification module has been completed.")
	return ctrl.Result{RequeueAfter: time.Second * 5}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *NotificationReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.logger = ctrl.Log.WithName("NotificationReconcile")
	r.NotificationMgr = cloud.NewNotificationManager()

	nameFilter := cloud.CloudStartName
	namespaceFilter := cloud.Namespace
	Predicates := predicate.NewPredicateFuncs(func(obj client.Object) bool {
		return obj.GetName() == nameFilter &&
			obj.GetNamespace() == namespaceFilter
	})

	return ctrl.NewControllerManagedBy(mgr).
		For(&cloudv1.CloudClient{}, builder.WithPredicates(Predicates)).
		Complete(r)
}
