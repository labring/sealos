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

package cloudclient

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	ntf "github.com/labring/sealos/controllers/common/notification/api/v1"
	cloudclientv1 "github.com/labring/sealos/controllers/notification/api/cloudclient/v1"
	cloudclient "github.com/labring/sealos/controllers/notification/internal/cloudclient"
	"github.com/labring/sealos/pkg/utils/logger"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"k8s.io/apimachinery/pkg/types"
)

// CloudClientReconciler reconciles a CloudClient object
type CloudClientReconciler struct {
	client.Client
	Scheme        *runtime.Scheme
	CloudClient   cloudclient.CloudClient
	StartInstance cloudclientv1.CloudClient
	NS            types.NamespacedName

	// The latest time of Cloud update
	CloudTime string
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
func (r *CloudClientReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	lgr := log.FromContext(ctx)

	lgr.Info("enter CloudClientReconciler")
	if err := r.CloudClient.Get(); err != nil {
		return ctrl.Result{RequeueAfter: time.Second * 10}, err
	}
	//Get the total json strings
	jsonStrings := strings.Split(string(r.CloudClient.ResponseBody), "\n")

	var CloudNTF ntf.Notification
	//per json string parse once
	for _, jsonString := range jsonStrings {
		if err := json.Unmarshal([]byte(jsonString), &CloudNTF); err != nil {
			lgr.Info("The jsonString from Cloud is error ", "Error: ", err)
			continue
		}
		if err := r.Client.Create(ctx, &CloudNTF); err != nil {
			lgr.Info("Can't create the Notification CR for Cloud ", "Error: ", err)
			continue
		}
	}

	return ctrl.Result{RequeueAfter: time.Second * 10}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *CloudClientReconciler) SetupWithManager(mgr ctrl.Manager) error {

	r.init()

	if err := r.Create(context.Background(), &r.StartInstance); err != nil {
		if client.IgnoreAlreadyExists(err) == nil {
			logger.Info("The CloudClient startInstance: ", err)
		}
	}

	return ctrl.NewControllerManagedBy(mgr).
		For(&cloudclientv1.CloudClient{}).
		Complete(r)
}

func (r *CloudClientReconciler) init() {
	r.CloudClient.Init()
	r.CloudTime = "0"
	r.StartInstance = cloudclientv1.CloudClient{}
	r.StartInstance.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "cloudclient.sealos.io",
		Version: "v1",
		Kind:    "CloudClient",
	})
	r.StartInstance.SetNamespace("default")
	r.StartInstance.SetName("startinstance")
	r.NS = types.NamespacedName{Namespace: "default"}
}
