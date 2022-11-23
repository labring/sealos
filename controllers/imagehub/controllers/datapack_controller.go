/*
Copyright 2022.

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

package controllers

import (
	"context"
	"fmt"
	"reflect"
	rt "runtime"
	"time"

	"github.com/go-logr/logr"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	imagehubv1 "github.com/labring/sealos/controllers/imagehub/api/v1"
)

var DataPackRequeueDuration, _ = time.ParseDuration("1m")

// DataPackReconciler reconciles a DataPack object
type DataPackReconciler struct {
	client.Client
	logr.Logger
	Scheme *runtime.Scheme

	DataHelper
}

//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=images,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=repositories,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=organizations,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=datapacks,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=datapacks/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=imagehub.sealos.io,resources=datapacks/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the DataPack object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.13.0/pkg/reconcile
func (r *DataPackReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger = log.FromContext(ctx)
	r.Logger.Info("enter reconcile", "name: ", req.Name, "namespace: ", req.Namespace)

	// get pack
	pack := &imagehubv1.DataPack{}
	if err := r.Get(ctx, req.NamespacedName, pack); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// check datapack
	r.Logger.Info("check isExpired", "time", pack.Spec.ExpireTime)
	if r.isExpired(pack) {
		if err := r.Delete(ctx, pack); err != nil {
			return ctrl.Result{}, err
		}
		r.Logger.Info("delete expired datapack success")
		return ctrl.Result{}, nil
	}

	// created a datapack, set codes to running
	if pack.Status.Codes == imagehubv1.NOTRUN {
		r.Logger.Info("switch codes to running")
		pack.Status.Codes = imagehubv1.PENDING
		err := r.Status().Update(ctx, pack)
		if err != nil {
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	}

	// start a pipeline
	r.Logger.Info("start pack pipeline", "datapack type:", pack.Spec.Type, "datapack names: ", pack.Spec.Names)
	pipeline := []func(context.Context, *imagehubv1.DataPack) error{
		r.init,
		r.spec2Status,
	}
	for _, fn := range pipeline {
		err := fn(ctx, pack)
		if err != nil {
			r.Logger.Info("error in pipeline", "error func:", rt.FuncForPC(reflect.ValueOf(fn).Pointer()).Name())
			return ctrl.Result{}, err
		}
	}

	// update status
	err := r.Status().Update(ctx, pack)
	if err != nil {
		return ctrl.Result{}, err
	}

	return ctrl.Result{RequeueAfter: DataPackRequeueDuration}, nil
}

func (r *DataPackReconciler) init(ctx context.Context, pack *imagehubv1.DataPack) error {
	r.Logger.Info("enter init")
	for _, name := range pack.Spec.Names {
		if !name.IsLegal() {
			r.Logger.Info("error in init", "name: ", name)
			return fmt.Errorf("image name illegal")
		}
	}

	if pack.Status.Datas == nil {
		pack.Status.Datas = map[imagehubv1.ImageName]imagehubv1.Data{}
	}

	r.DataHelper = DataHelper{
		Client: r.Client,
		Logger: r.Logger,
	}
	return nil
}

func (r *DataPackReconciler) spec2Status(ctx context.Context, pack *imagehubv1.DataPack) error {
	r.Logger.Info("enter spec2Status")
	datas := imagehubv1.Datas{}
	for _, name := range pack.Spec.Names {
		var data imagehubv1.Data
		fd, err := r.genFulldataByImageName(ctx, name)
		if err != nil {
			pack.Status.Codes = imagehubv1.ERROR
			r.Logger.Error(err, "error in gen fulldata", "name: ", name)
			return err
		}
		switch pack.Spec.Type {
		case imagehubv1.ImageBaseDataType:
			i := imagehubv1.ImageBaseData{}
			i.New(&fd)
			data = i.ToData()
		case imagehubv1.ImageGridDataType:
			i := imagehubv1.ImageGridData{}
			i.New(&fd)
			data = i.ToData()
		case imagehubv1.ImageDetailDataType:
			i := imagehubv1.ImageDetailData{}
			i.New(&fd)
			data = i.ToData()
		default:
			// finished a datapack, set codes to error and update status
			pack.Status.Codes = imagehubv1.ERROR
			return fmt.Errorf("error data pack type")
		}
		datas[name] = data
	}
	// finished a datapack, set codes to ok and update status
	r.Logger.Info("switch codes to ok")
	pack.Status.Codes = imagehubv1.OK
	pack.Status.Datas = datas
	return nil
}

func (r *DataPackReconciler) isExpired(pack *imagehubv1.DataPack) bool {
	d, _ := time.ParseDuration(pack.Spec.ExpireTime)
	if pack.CreationTimestamp.Add(d).Before(time.Now()) {
		r.Logger.Info("datapack isExpired", "name", pack.Name)
		return true
	}
	return false
}

// SetupWithManager sets up the controller with the Manager.
func (r *DataPackReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.DataHelper = DataHelper{r.Client, r.Logger}

	return ctrl.NewControllerManagedBy(mgr).
		For(&imagehubv1.DataPack{}).
		Complete(r)
}
