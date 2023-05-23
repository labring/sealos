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
	"encoding/json"
	"time"

	cloudclientv1 "github.com/labring/sealos/controllers/cloud/api/cloudclient/v1"
	cloudclient "github.com/labring/sealos/controllers/cloud/internal/cloudclient"
	handler "github.com/labring/sealos/controllers/cloud/internal/handler"
	ntf "github.com/labring/sealos/controllers/common/notification/api/v1"
	"github.com/labring/sealos/pkg/utils/logger"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"k8s.io/apimachinery/pkg/types"
)

// CloudClientReconciler reconciles a CloudClient object
type CloudPullReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	//some tools
	CloudClient  cloudclient.CloudClient
	CloudHandler *handler.CloudHandler
	//controller strategy
	Strategy cloudclientv1.CloudClient

	Input  cloudclient.CloudText
	Output []ntf.Notification

	CloudTime int64
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

	CycleTime := r.Strategy.Spec.CycleTime
	CloudURL := r.Strategy.Spec.CloudURL
	defer r.CloudClient.Clear()
	r.CloudClient.SetTime(r.CloudTime)
	r.CloudClient.SetURL(CloudURL)
	r.CloudClient.SetMethod("POST")

	// pull notification from Cloud
	if err := r.CloudClient.Pull(); err != nil {
		return ctrl.Result{}, err
	}

	//Get the total json strings
	var CloudTexts []cloudclient.CloudText
	if err := json.Unmarshal(r.CloudClient.ResponseBody, &CloudTexts); err != nil {
		logger.Info("failed to decode the json string ", "Error: ", err)
		return ctrl.Result{RequeueAfter: time.Duration(CycleTime)}, nil
	}

	//per json string parse once
	for _, CloudText := range CloudTexts {
		r.Input = CloudText
		if r.CloudTime < CloudText.Timestamp {
			r.CloudTime = CloudText.Timestamp
		}
		//Apply cloud notification cr
		if err := r.Process(ctx); err != nil {
			logger.Info("failed to apply a Cloud notification")
			continue
		}
	}
	return ctrl.Result{RequeueAfter: time.Duration(CycleTime)}, nil
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
	//cloud client init
	r.CloudTime = 0
	r.Strategy = cloudclientv1.NewStartInstance()
	//get a cloudhandler
	r.CloudHandler = handler.NewCloudHandler()
	r.Output = []ntf.Notification{}
}

func (r *CloudPullReconciler) Process(ctx context.Context) error {
	//parse cloud text ==> notification cr
	r.initHandler(&r.Input, r.Output, r.Client)
	//build cr
	if err := r.CloudHandler.BuildCloudCR(); err != nil {
		return err
	}
	r.Output = r.CloudHandler.Output
	var tmp ntf.Notification
	//apply cr
	var err error
	for _, res := range r.Output {
		key := types.NamespacedName{Namespace: res.Namespace, Name: res.Name}
		if err = r.Client.Get(ctx, key, &tmp); err == nil {
			res.ResourceVersion = tmp.ResourceVersion
			if err = r.Client.Update(ctx, &res); err != nil {
				logger.Info("failed to update", "notification id: ", res.Name, "Error: ", err)
			}
		} else {
			if client.IgnoreNotFound(err) == nil {
				if err = r.Client.Create(ctx, &res); err != nil {
					logger.Info("failed to create", "notification id: ", res.Name, "Error: ", err)
				}
			} else {
				logger.Error("unknown error for cloud", "notification id: ", res.Name, "Error: ", err)
			}
		}
	}

	r.CloudHandler.Reset()
	r.Output = []ntf.Notification{}
	r.Input = cloudclient.CloudText{}
	return err
}

func (r *CloudPullReconciler) initHandler(cloudtext *cloudclient.CloudText, notification []ntf.Notification, client client.Client) {
	r.CloudHandler.Input = cloudtext
	r.CloudHandler.Output = notification
	r.CloudHandler.Client = client
}
