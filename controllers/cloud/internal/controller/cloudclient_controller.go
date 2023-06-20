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
	"encoding/json"
	"errors"
	"time"

	v1 "github.com/labring/sealos/controllers/cloud/api/v1"
	cloud "github.com/labring/sealos/controllers/cloud/internal/cloudtool"
	"github.com/labring/sealos/controllers/cloud/internal/controller/util"
	"github.com/labring/sealos/pkg/utils/logger"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// CloudClientReconciler reconciles a CloudClient object
type CloudClientReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

//+kubebuilder:rbac:groups=cloud.sealos.io,resources=cloudclients,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=cloudclients/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=cloudclients/finalizers,verbs=update

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
	logger.Info("enter CloudClientReconciler ", "namespace: ", req.Namespace, "name: ", req.Name)
	// set up cloud
	var url string
	var clusterSecret corev1.Secret
	var expire int64 = time.Now().Unix() + 60*60
	var clusterInfo cloud.ClusterInfo
	for {
		logger.Info("CloudClientReconciler: start the cloud module...")
		logger.Info("CloudClientReconciler: try to get the cloud secret resource...")
		if ok := cloud.GetImportantResource(r.Client, &clusterSecret, ctx, cloud.Namespace, cloud.SecretName); !ok {
			logger.Error("CloudClientReconciler: Important resource missing: secret resource", "retrying...")
			time.Sleep(time.Second * 60)
			continue
		}
		if value, ok := clusterSecret.Labels["registered"]; ok && value == "true" {
			var license v1.License
			if err := r.Client.Get(ctx, types.NamespacedName{Namespace: cloud.Namespace, Name: cloud.LicenseName}, &license); err != nil {
				logger.Error("CloudClientReconciler: cluster has registered but no license", "retrying...")
				time.Sleep(time.Second * 3)
				continue
			}
			license.Labels["isRead"] = "false"
			if err := r.Client.Update(ctx, &license); err != nil {
				continue
			}
			return r.startCloudClient(ctx)
		}
		logger.Info("CloudClientReconciler: try to connect with cloud...")
		config, err := util.ReadConfigFile("/etc/config/config.json")
		if err != nil {
			logger.Error("CloudClientReconciler: failed to read /etc/config/config.json")
			time.Sleep(time.Second * 3)
			continue
		}
		url = config.RegisterURL
		if resp, err := cloud.CommunicateWithCloud("GET", url, nil); err != nil {
			logger.Error("CloudClientReconciler: failed to communicate with cloud")
			time.Sleep(time.Second * 3)
		} else {
			if err := json.Unmarshal(resp.Body, &clusterInfo); err != nil {
				logger.Error("CloudClientReconciler: failed to parse the register info")
				continue
			}
			clusterSecret.Data["uid"] = []byte(clusterInfo.UID)
			clusterSecret.Data["key"] = []byte(clusterInfo.PublicKey)
			clusterSecret.Data["token"] = []byte(clusterInfo.License.Token)
			clusterSecret.Labels["registered"] = "true"
			if err := r.Client.Update(context.Background(), &clusterSecret); err != nil {
				logger.Error("CloudClientReconciler: failed to store the secret of cluster during register,retrying...")
				time.Sleep(time.Second * 3)
				continue
			}
			break
		}
		if time.Now().Unix() > expire {
			logger.Error("CloudClientReconciler: failed to register,time out")
			return ctrl.Result{RequeueAfter: time.Second * 60}, nil
		}
	}
	if ok := r.SubmitLicense(ctx, clusterInfo, expire); !ok {
		return ctrl.Result{RequeueAfter: time.Second * 60}, errors.New("CloudClientReconciler: failed to register,time out")
	}
	logger.Info("CloudClientReconciler: success to set up cloud module")
	return r.startCloudClient(ctx)
}

// SetupWithManager sets up the controller with the Manager.
func (r *CloudClientReconciler) SetupWithManager(mgr ctrl.Manager) error {
	nameFilter := cloud.CloudStartName
	namespaceFilter := cloud.Namespace
	Predicates := predicate.NewPredicateFuncs(func(obj client.Object) bool {
		return obj.GetName() == nameFilter && obj.GetNamespace() == namespaceFilter
	})
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1.CloudClient{}, builder.WithPredicates(Predicates)).
		Complete(r)
}
func (r *CloudClientReconciler) startCloudClient(ctx context.Context) (ctrl.Result, error) {
	logger.Info("start to start cloud client...")
	var startInstance v1.CloudClient
	startInstance.SetName(cloud.ClientStartName)
	startInstance.SetNamespace(cloud.Namespace)
	if err := r.Client.Get(ctx, types.NamespacedName{Namespace: cloud.Namespace, Name: cloud.ClientStartName}, &startInstance); err != nil {
		startInstance.Labels = make(map[string]string)
		startInstance.Labels["isRead"] = "false"
		if err := r.Client.Create(ctx, &startInstance); err != nil {
			logger.Error("failed to start cloud client, retrying...", err)
			return ctrl.Result{RequeueAfter: time.Second * 5}, err
		}
	} else {
		if startInstance.Labels == nil {
			startInstance.Labels = map[string]string{}
		}
		startInstance.Labels["isRead"] = "false"
		if err := r.Client.Update(ctx, &startInstance); err != nil {
			return ctrl.Result{}, err
		}
	}
	time.Sleep(time.Millisecond * 1000)
	if startInstance.Labels == nil {
		startInstance.Labels = map[string]string{}
	}
	startInstance.Labels["isRead"] = "true"
	if err := r.Client.Update(ctx, &startInstance); err != nil {
		return ctrl.Result{}, err
	}
	return ctrl.Result{}, nil
}

func (r *CloudClientReconciler) SubmitLicense(ctx context.Context, clusterInfo cloud.ClusterInfo, expire int64) bool {
	logger.Info("try to create license...")
	var license v1.License
	for {
		if time.Now().Unix() > expire {
			logger.Error("failed to register,time out")
			return false
		}
		license.SetName(cloud.LicenseName)
		license.SetNamespace(cloud.Namespace)
		license.Spec.Token = clusterInfo.License.Token
		license.Spec.UID = clusterInfo.UID
		license.Spec.Key = clusterInfo.PublicKey
		license.Spec.Policy = clusterInfo.Policy.LicensePolicy
		if license.Labels == nil {
			license.Labels = make(map[string]string)
		}
		license.Labels["isRead"] = "false"
		if err := r.Client.Create(ctx, &license); err != nil {
			logger.Error("failed to set up cluster", "can't create license", err)
			time.Sleep(time.Second * 3)
			continue
		}
		break
	}
	return true
}
