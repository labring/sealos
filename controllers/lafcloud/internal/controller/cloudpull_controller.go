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

	ntf "github.com/labring/sealos/controllers/common/notification/api/v1"
	cloudclientv1 "github.com/labring/sealos/controllers/notification/api/cloudclient/v1"
	cloudclient "github.com/labring/sealos/controllers/notification/internal/cloudclient"
	handler "github.com/labring/sealos/controllers/notification/internal/handler"
	"github.com/labring/sealos/pkg/utils/logger"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"k8s.io/apimachinery/pkg/types"
)

// CloudClientReconciler reconciles a CloudClient object
type CloudPullReconciler struct {
	client.Client
	Scheme        *runtime.Scheme
	CloudClient   cloudclient.CloudClient
	StartInstance cloudclientv1.CloudClient
	CloudHandler  handler.CloudHandler
	CloudTXT      cloudclient.CloudText
	Notification  ntf.Notification
	// The latest time of Cloud update
	CloudTime int64
	CycleTime int64
	CloudURL  string
}

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
func (r *CloudPullReconciler) Reconcile(ctx context.Context, _ ctrl.Request) (ctrl.Result, error) {
	lgr := log.FromContext(ctx)
	lgr.Info("enter CloudClientReconciler")

	defer r.CloudClient.Clear()
	r.CloudClient.SetTime(r.CloudTime)

	// pull notification from Cloud
	if err := r.CloudClient.Pull("POST", r.CloudClient.CloudURL); err != nil {
		return ctrl.Result{RequeueAfter: time.Duration(r.CycleTime)}, err
	}

	//Get the total json strings
	var CloudTexts []cloudclient.CloudText
	if err := json.Unmarshal(r.CloudClient.ResponseBody, &CloudTexts); err != nil {
		logger.Info("The jsonString from Cloud is error ", "Error: ", err)
		return ctrl.Result{RequeueAfter: time.Duration(r.CycleTime)}, nil
	}

	//per json string parse once
	for _, CloudText := range CloudTexts {
		r.CloudTXT = CloudText
		if r.CloudTime < CloudText.Timestamp {
			r.CloudTime = CloudText.Timestamp
		}
		//Apply cloud notification cr
		if err := r.Process(ctx); err != nil {
			logger.Info("This CloudCR failed to apply")
			continue
		}
	}
	return ctrl.Result{RequeueAfter: time.Duration(r.CycleTime)}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *CloudPullReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.init()

	namespace := corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{Name: "start-instance"},
	}

	// create the "StartInstance" namespace
	if err := r.Create(context.Background(), &namespace); err != nil {
		if client.IgnoreAlreadyExists(err) != nil {
			logger.Error("can't create the namespace: ", err)
			return err
		}
	}
	// create the cloudclient startinstance
	if err := r.Create(context.Background(), &r.StartInstance); client.IgnoreAlreadyExists(err) != nil {
		logger.Error("Create the start instance error ", err)
		return err
	}
	r.CycleTime = r.StartInstance.Spec.CycleTime
	r.CloudURL = r.StartInstance.Spec.CloudURL
	r.CloudClient.SetURL(r.CloudURL)

	return ctrl.NewControllerManagedBy(mgr).
		For(&cloudclientv1.CloudClient{}).
		Complete(r)
}

func (r *CloudPullReconciler) init() {
	//cloud client init
	r.CloudTime = 0
	r.StartInstance = cloudclientv1.NewStartInstance()
	//get a cloudhandler
	r.CloudHandler = *handler.NewCloudHandler()
}

func (r *CloudPullReconciler) Process(ctx context.Context) error {
	//parse cloud text ==> notification cr
	r.CloudHandler.Init(&r.CloudTXT, &r.Notification)
	//build cr
	if err := r.CloudHandler.BuildCloudCR(); err != nil {
		return err
	}
	var tmp ntf.Notification

	key := types.NamespacedName{Namespace: r.Notification.Namespace, Name: r.Notification.Name}

	if err := r.Client.Get(ctx, key, &tmp); err == nil {
		if err0 := r.Client.Update(ctx, &tmp); err0 != nil {
			logger.Info("update the cloud cr error ", err0)
			return err0
		}
		logger.Info("update the cloud cr success")
	} else {
		//apply cr
		if client.IgnoreNotFound(err) == nil {
			if err1 := r.Client.Create(ctx, &r.Notification); err1 != nil {
				logger.Info("create the cloud cr error ", err1)
				return err1
			}
			logger.Info("create the cloud cr success")
		} else {
			logger.Error(err)
			return err
		}
	}

	r.CloudHandler.Reset()
	r.Notification = ntf.Notification{}
	r.CloudTXT = cloudclient.CloudText{}
	return nil
}
