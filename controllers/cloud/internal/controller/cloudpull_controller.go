/*
Copyright 2023 yxxchange@163.com.

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
	"time"

	cloudclientv1 "github.com/labring/sealos/controllers/cloud/api/cloudclient/v1"
	cloud "github.com/labring/sealos/controllers/cloud/internal/cloudtool"
	"github.com/labring/sealos/pkg/utils/logger"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

// CloudClientReconciler reconciles a CloudClient object
type CloudPullReconciler struct {
	client.Client
	Cloud    cloud.CloudClient
	Scheme   *runtime.Scheme
	Strategy cloudclientv1.CloudClient
}

//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch
//+kubebuilder:rbac:groups=cloudclient.sealos.io,resources=cloudclients,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cloudclient.sealos.io,resources=cloudclients/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=cloudclient.sealos.io,resources=cloudclients/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the CloudClient object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.14.4/pkg/reconcile
func (r *CloudPullReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	lgr := log.FromContext(ctx)
	lgr.Info("enter CloudClientReconciler")
	if err := r.Client.Get(ctx, req.NamespacedName, &r.Strategy); err != nil {
		logger.Error("failed to get cloudpull strategy")
		return ctrl.Result{}, err
	}

	cycletime := time.Duration(r.Strategy.Spec.CycleTime) * time.Second
	cloudURL := r.Strategy.Spec.CloudURL
	logger.Info("cycletime: ", cycletime)
	var cloudreq []byte
	var err error
	// pull notification from Cloud
	if cloudreq, err = cloud.CloudPull(&r.Cloud, "POST", cloudURL); err != nil {
		return ctrl.Result{}, err
	}
	logger.Info("success to pull from cloud")
	if err := cloud.CloudCreateCR(&r.Cloud, r.Client, cloudreq); err != nil {
		return ctrl.Result{}, err
	}
	return ctrl.Result{RequeueAfter: cycletime}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *CloudPullReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.init()

	// create the cloudpull strategy-instance
	if err := r.Create(context.Background(), &r.Strategy); client.IgnoreAlreadyExists(err) != nil {
		logger.Error("failed to create the strategy instance ", err)
		return err
	}

	return ctrl.NewControllerManagedBy(mgr).
		For(&cloudclientv1.CloudClient{}).
		Complete(r)
}

func (r *CloudPullReconciler) init() {
	r.Strategy = cloudclientv1.NewStartInstance()
	timeTmp, _ := time.Parse("2006-01-02", r.Strategy.Spec.Date)
	r.Cloud.SetTime(timeTmp.Unix() - int64(7)*24*60*60)
}
