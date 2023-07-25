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
	"time"

	"github.com/go-logr/logr"
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

// CloudSyncReconciler reconciles a CloudSync object
type CloudSyncReconciler struct {
	client.Client
	Scheme    *runtime.Scheme
	logger    logr.Logger
	needSync  bool
	syncCache issuer.SyncResponse
}

//+kubebuilder:rbac:groups=cloud.sealos.io,resources=cloudsyncs,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=cloudsyncs/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=cloudsyncs/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the CloudSync object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.14.4/pkg/reconcile
func (r *CloudSyncReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	// Logging the start of the sync operation
	r.logger.Info("Enter CloudSyncReconcile", "namespace:", req.Namespace, "name", req.Name)
	// Defining error and operation lists
	var err error
	var (
		readOperations  issuer.ReadOperationList
		writeOperations issuer.WriteOperationList
	)
	// Defining the necessary variables
	var (
		config    issuer.Config
		secret    corev1.Secret
		sync      issuer.SyncRequest
		resp      issuer.SyncResponse
		configMap corev1.ConfigMap
		launcher  issuerv1.Launcher
	)

	r.logger.Info("Start to get the resource for data sync...")

	// Building read operations to fetch necessary resources
	// Here, we fetch the Launcher, Secret and ConfigMap
	// The fetched objects are added to readOperations list
	(&issuer.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).WithObject(&launcher).
		WithTag(types.NamespacedName{Namespace: req.Namespace, Name: string(issuer.ClientStartName)}).
		AddToList(&readOperations)
	(&issuer.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).WithObject(&secret).
		WithTag(types.NamespacedName{Namespace: string(issuer.Namespace), Name: string(issuer.UIDSecretName)}).
		AddToList(&readOperations)
	(&issuer.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).WithObject(&configMap).
		WithTag(types.NamespacedName{Namespace: string(issuer.Namespace), Name: string(issuer.URLConfigName)}).
		AddToList(&readOperations)
	// Executing the read operations. If there is an error, it's logged and returned
	if err := readOperations.Execute(); err != nil {
		r.logger.Error(err, "failed to read resources...")
		return ctrl.Result{}, err
	}

	// register a callback function to update the launcher
	(&issuer.WriteEventBuilder{}).WithCallback(func() error {
		if launcher.Labels[string(issuer.SyncLable)] == issuer.TRUE {
			return nil
		}
		launcher.Labels[string(issuer.SyncLable)] = issuer.TRUE
		return r.Client.Update(ctx, &launcher)
	}).AddToList(&writeOperations)

	// Extracting the config from the ConfigMap
	config, err = util.ReadConfigFromConfigMap(string(issuer.URLConfigName), &configMap)
	if err != nil {
		r.logger.Error(err, "failed to get config...")
		return ctrl.Result{}, err
	}
	url := config.CloudSyncURL
	sync.UID = string(secret.Data["uid"])
	// Checking if we need to sync. If true, we communicate with the cloud and get the response
	if r.needSync {
		r.logger.Info("Start to communicate with cloud...")
		httpBody, err := issuer.CommunicateWithCloud("POST", url, sync)
		if err != nil {
			r.logger.Error(err, "failed to communicate with cloud...")
			return ctrl.Result{}, err
		}
		if !issuer.IsSuccessfulStatusCode(httpBody.StatusCode) {
			err := errors.New(http.StatusText(httpBody.StatusCode))
			r.logger.Error(err, err.Error())
			return ctrl.Result{}, err
		}
		err = issuer.Convert(httpBody.Body, &resp)
		if err != nil {
			r.logger.Error(err, "failed to convert to cloud.SyncResponse")
			return ctrl.Result{}, err
		}
		r.syncCache = resp
	} else {
		resp = r.syncCache
	}
	// Building write operations to update the configmap and secret
	(&issuer.WriteEventBuilder{}).WithCallback(func() error {
		// Checking if the new config is different from the old one.
		// If true, we sync the resources
		// If false, we do nothing
		if ok := issuer.IsConfigMapChanged(resp.Config, &configMap); ok {
			r.logger.Info("Update the configmap...")
			return r.Client.Update(ctx, &configMap)
		}
		return nil
	}).AddToList(&writeOperations)

	(&issuer.WriteEventBuilder{}).WithCallback(func() error {
		secret.Data["key"] = []byte(resp.Key)
		return r.Client.Update(ctx, &secret)
	})
	// Executing the write operations.
	// If there is an error, it's logged and returned
	if err := writeOperations.Execute(); err != nil {
		r.logger.Error(err, "failed to write resources...")
		r.needSync = false
		return ctrl.Result{}, err
	}

	r.needSync = true
	r.syncCache = issuer.SyncResponse{}

	r.logger.Info("Finish to sync the resources...")
	return ctrl.Result{RequeueAfter: time.Second * 3600}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *CloudSyncReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.logger = ctrl.Log.WithName("DataSyncReconcile")
	r.needSync = true
	Predicate := predicate.NewPredicateFuncs(func(object client.Object) bool {
		return object.GetName() == string(issuer.ClientStartName) &&
			object.GetNamespace() == string(issuer.Namespace) &&
			object.GetLabels() != nil &&
			object.GetLabels()[string(issuer.SyncLable)] == issuer.FALSE
	})
	return ctrl.NewControllerManagedBy(mgr).
		For(&issuerv1.Launcher{}, builder.WithPredicates(Predicate)).
		Complete(r)
}
