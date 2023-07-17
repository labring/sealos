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
	"fmt"

	cloud "github.com/labring/sealos/controllers/monitor/internal/manager"
	admissionV1 "k8s.io/api/admission/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

// log is for logging in this package.

type ScaleWebhook struct {
	client.Client
}

var scalelog = logf.Log.WithName("scale-resource")

// TODO(user): EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!

func (sw ScaleWebhook) Handle(ctx context.Context, req admission.Request) admission.Response {
	scalelog.Info("enter webhook of scale webhook:", "userInfo", req.UserInfo, "req.Namespace", req.Namespace, "req.Name", req.Name, "req.Operation", req.Operation)
	if req.Operation == admissionV1.Delete {
		return admission.Allowed("")
	}
	var current corev1.Secret
	var except cloud.ClusterScale
	err := sw.Get(context.Background(),
		types.NamespacedName{
			Namespace: string(cloud.Namespace),
			Name:      string(cloud.ExpectScaleSecretName),
		},
		&current,
	)
	if err != nil {
		return admission.Allowed("")
	}
	err = json.Unmarshal(current.Data[string(cloud.ExpectScaleSecretKey)], &except)
	if err != nil {
		return admission.Denied(fmt.Sprintf("ns %s request %s %s permission denied", req.Namespace, req.Kind.Kind, req.Operation))
	}
	// cmp logic
	scalelog.Info("do something for compare")
	return admission.Allowed("")
}

//+kubebuilder:webhook:path=/mutate-cloud-sealos-io-v1-license,mutating=true,failurePolicy=fail,sideEffects=None,groups=cloud.sealos.io,resources=licenses,verbs=create;update,versions=v1,name=mlicense.kb.io,admissionReviewVersions=v1

// Default implements webhook.Defaulter so a webhook will be registered for the type

// TODO(user): change verbs to "verbs=create;update;delete" if you want to enable deletion validation.
//+kubebuilder:webhook:path=/validate-cloud-sealos-io-v1-license,mutating=false,failurePolicy=fail,sideEffects=None,groups=cloud.sealos.io,resources=licenses,verbs=create;update,versions=v1,name=vlicense.kb.io,admissionReviewVersions=v1

//var _ webhook.Validator = &License{}

// // ValidateCreate implements webhook.Validator so a webhook will be registered for the type
// func (r *License) ValidateCreate() (admission.Warnings, error) {
// 	licenselog.Info("validate create", "name", r.Name)

// 	// TODO(user): fill in your validation logic upon object creation.
// 	return nil, nil
// }

// // ValidateUpdate implements webhook.Validator so a webhook will be registered for the type
// func (r *License) ValidateUpdate(old runtime.Object) (admission.Warnings, error) {
// 	licenselog.Info("validate update", "name", r.Name)

// 	// TODO(user): fill in your validation logic upon object update.
// 	return nil, nil
// }

// // ValidateDelete implements webhook.Validator so a webhook will be registered for the type
// func (r *License) ValidateDelete() (admission.Warnings, error) {
// 	licenselog.Info("validate delete", "name", r.Name)

// 	// TODO(user): fill in your validation logic upon object deletion.
// 	return nil, nil
// }
