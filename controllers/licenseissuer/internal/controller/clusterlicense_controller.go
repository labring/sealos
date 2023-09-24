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

	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/go-logr/logr"
	count "github.com/labring/sealos/controllers/common/account"
	infostreamv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	"github.com/labring/sealos/controllers/licenseissuer/internal/controller/util"
	"github.com/labring/sealos/controllers/pkg/crypto"
	notificationv1 "github.com/labring/sealos/controllers/pkg/notification/api/v1"
	ntf "github.com/labring/sealos/controllers/pkg/notification/utils"
)

// ClusterLicenseReconciler reconciles a ClusterLicense object
type ClusterLicenseReconciler struct {
	client.Client
	Scheme   *runtime.Scheme
	logger   logr.Logger
	Recorder util.Map[string]
	DBCol    util.MongoHandler
	payload  map[string]interface{}

	csb *infostreamv1.ClusterScaleBilling
	cl  *infostreamv1.ClusterLicense
}

//+kubebuilder:rbac:groups=infostream.sealos.io,resources=clusterlicenses,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=infostream.sealos.io,resources=clusterlicenses/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=infostream.sealos.io,resources=clusterlicenses/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the ClusterLicense object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.15.0/pkg/reconcile
func (r *ClusterLicenseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.logger.Info("Reconciling ClusterLicense")

	nq := &ntf.NoticeEventQueue{}
	nm := ntf.NewNotificationManager(ctx, r.Client, r.logger, 1, 1)
	nb := (&ntf.Builder{}).WithLevel(notificationv1.High).
		WithTitle(util.LicenseNoticeTitle).WithFrom(util.Sealos).
		WithType(ntf.General)
	receiver := ntf.NewReceiver(ctx, r.Client).AddReceiver(req.Namespace)

	err := r.Read(ctx, req)
	if err != nil {
		r.logger.Info("failed to read cluster license", "error", err)
		return ctrl.Result{}, err
	}

	message, err := r.Authorize(ctx)
	nb.WithMessage(message).AddToEventQueue(nq)
	nm.Load(receiver, nq.Events).Run()
	if err != nil {
		return ctrl.Result{}, r.Delete(ctx, r.cl)
	}

	_ = r.RecordLicense(r.payload)

	return ctrl.Result{}, r.Delete(ctx, r.cl)
}

// SetupWithManager sets up the controller with the Manager.
func (r *ClusterLicenseReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.logger = ctrl.Log.WithName("ClusterLicenseReconciler")

	predicateFuncs := predicate.Funcs{
		UpdateFunc: func(e event.UpdateEvent) bool {
			return false
		},
		DeleteFunc: func(e event.DeleteEvent) bool {
			return false
		},
		CreateFunc: func(e event.CreateEvent) bool {
			return true
		},
	}
	return ctrl.NewControllerManagedBy(mgr).
		For(&infostreamv1.ClusterLicense{}, builder.WithPredicates(predicateFuncs)).
		Complete(r)
}

func (r *ClusterLicenseReconciler) Read(ctx context.Context, req ctrl.Request) error {
	reader := &util.Reader{}

	Namespace := util.GetOptions().GetEnvOptions().Namespace
	// csb is ClusterScaleBilling object
	csbID := types.NamespacedName{
		Name:      util.ScaleBilling,
		Namespace: Namespace,
	}
	csb := &infostreamv1.ClusterScaleBilling{}
	// cl is ClusterLicense object
	clID := req.NamespacedName
	cl := &infostreamv1.ClusterLicense{}
	reader.Add(csb, csbID)
	reader.Add(cl, clID)
	err := reader.Read(ctx, r.Client)
	if err != nil {
		return err
	}
	r.csb = csb
	r.cl = cl
	return nil
}

func (r *ClusterLicenseReconciler) Authorize(ctx context.Context) (string, error) {
	meta := util.LicenseMeta{
		Token: r.cl.Spec.Token,
	}
	message, payload, ok := util.CheckLicense(meta, r.DBCol)
	if !ok {
		return message, errors.New("invalid license")
	}
	r.payload = payload

	if util.ContainsFields(payload, util.Amount) {
		err := r.Recharge(ctx)
		if err != nil {
			return util.RechargeFailedMessage, err
		}
	}
	return util.ValidLicenseMessage, nil
}

func (r *ClusterLicenseReconciler) Recharge(ctx context.Context) error {
	amtADD, ok := r.payload[util.Amount].(float64)
	if !ok {
		return errors.New("amount error type")
	}

	EncryptQuota := r.csb.Status.EncryptQuota
	decryptQuota, err := crypto.DecryptInt64WithKey(EncryptQuota, []byte(util.CryptoKey))
	if err != nil {
		return err
	}
	newQuata := decryptQuota + int64(amtADD)*count.CurrencyUnit
	NewEncryptQuota, err := crypto.EncryptInt64WithKey(newQuata, []byte(util.CryptoKey))
	if err != nil {
		return err
	}
	r.csb.Status.EncryptQuota = *NewEncryptQuota
	// Update the quota
	r.csb.Status.Quota = newQuata
	// Trigger the cluster scale quota
	util.GetTrigger().TriggerForClusterScaleQuato(newQuata)
	err = r.Client.Status().Update(ctx, r.csb)
	if err != nil {
		return err
	}
	return nil
}

func (r *ClusterLicenseReconciler) RecordLicense(payload map[string]interface{}) error {
	util.GetHashMap().Add(r.cl.Spec.Token)
	cl := util.ClusterLicense{
		Meta: util.LicenseMeta{
			Token:      r.cl.Spec.Token,
			CreateTime: r.cl.CreationTimestamp.Format("2006-01-02"),
		},
		Payload: payload,
	}
	return util.RecordLicense(r.DBCol, cl)
}
