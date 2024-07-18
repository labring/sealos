/*
Copyright 2022 labring.

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

package v1

import (
	"context"
	"errors"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

// log is for logging in this package.
var operationrequestlog = logf.Log.WithName("operationrequest-resource")

func (r *Operationrequest) SetupWebhookWithManager(mgr ctrl.Manager) error {
	m := &ReqMutator{Client: mgr.GetClient()}
	v := &ReqValidator{Client: mgr.GetClient()}
	return ctrl.NewWebhookManagedBy(mgr).
		For(r).
		WithDefaulter(m).
		WithValidator(v).
		Complete()
}

// +kubebuilder:webhook:path=/mutate-user-sealos-io-v1-operationrequest,mutating=true,failurePolicy=fail,sideEffects=None,groups=user.sealos.io,resources=operationrequests,verbs=create;update,versions=v1,name=moperationrequest.kb.io,admissionReviewVersions=v1
//+kubebuilder:object:generate=false

type ReqMutator struct {
	client.Client
}

func (r ReqMutator) Default(_ context.Context, obj runtime.Object) error {
	req, ok := obj.(*Operationrequest)
	if !ok {
		return errors.New("obj convert Operationrequest is error")
	}
	// mutate the request with an owner label
	operationrequestlog.Info("mutate", "name", req.Name)
	req.ObjectMeta = initAnnotationAndLabels(req.ObjectMeta)
	req.Labels[UserLabelOwnerKey] = req.Spec.User
	return nil
}

//+kubebuilder:webhook:path=/validate-user-sealos-io-v1-operationrequest,mutating=false,failurePolicy=fail,sideEffects=None,groups=user.sealos.io,resources=operationrequests,verbs=create;update,versions=v1,name=voperationrequest.kb.io,admissionReviewVersions=v1
//+kubebuilder:object:generate=false

type ReqValidator struct {
	client.Client
}

func (r ReqValidator) ValidateCreate(ctx context.Context, obj runtime.Object) (admission.Warnings, error) {
	req, ok := obj.(*Operationrequest)
	if !ok {
		return admission.Warnings{"obj convert Operationrequest is error"}, errors.New("obj convert Operationrequest is error")
	}

	// todo check request, _ := admission.RequestFromContext(ctx), request.UserInfo.Username if legal

	// list all requests in the same namespace with a same owner
	var reqList OperationrequestList
	err := r.List(ctx, &reqList, client.InNamespace(req.Namespace), client.MatchingLabels{UserLabelOwnerKey: req.Spec.User})
	if client.IgnoreNotFound(err) != nil {
		operationrequestlog.Error(err, "list operationrequest error")
		return admission.Warnings{"list operationrequest error"}, err
	}

	for _, item := range reqList.Items {
		if item.Status.Phase != RequestCompleted {
			operationrequestlog.Info("there is a request not completed, can not create new request", "name", item.Name, "phase", item.Status.Phase)
			return admission.Warnings{"there is a request not completed, can not create new request"}, errors.New("there is a request not completed, can not create new request")
		}
	}
	return admission.Warnings{}, nil
}

func (r ReqValidator) ValidateUpdate(_ context.Context, oldObj, newObj runtime.Object) (admission.Warnings, error) {
	// todo check request, _ := admission.RequestFromContext(ctx), request.UserInfo.Username if legal
	oldReq, ok := oldObj.(*Operationrequest)
	if !ok {
		return admission.Warnings{"obj convert Operationrequest error"}, errors.New("obj convert Operationrequest error")
	}
	newReq, ok := newObj.(*Operationrequest)
	if !ok {
		return admission.Warnings{"obj convert Operationrequest error"}, errors.New("obj convert Operationrequest error")
	}
	if oldReq.Spec != newReq.Spec {
		return admission.Warnings{"operation request spec do not support update"}, errors.New("operation request spec do not support update")
	}
	return admission.Warnings{}, nil
}

func (r ReqValidator) ValidateDelete(_ context.Context, _ runtime.Object) (admission.Warnings, error) {
	return admission.Warnings{}, nil
}
