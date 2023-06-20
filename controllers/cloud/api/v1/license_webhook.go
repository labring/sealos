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

package v1

import (
	"context"
	"fmt"

	"github.com/labring/sealos/pkg/utils/logger"
	admissionV1 "k8s.io/api/admission/v1"
	cl "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

// log is for logging in this package.

// TODO(user): EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!

// +kubebuilder:webhook:path=/mutate-cloud-sealos-io-v1-license,mutating=true,failurePolicy=ignore,sideEffects=None,groups="*",resources=configmaps,verbs=create;update,versions=v1,name=mlicense.kb.io,admissionReviewVersions=v1
// +kubebuilder:object:generate=false

// TODO(user): change verbs to "verbs=create;update;delete" if you want to enable deletion validation.
// +kubebuilder:webhook:path=/validate-cloud-sealos-io-v1-license,mutating=false,failurePolicy=ignore,sideEffects=None,groups="*",resources=configmaps,verbs=create;update,versions=v1,name=vlicense.kb.io,admissionReviewVersions=v1
// +kubebuilder:object:generate=false
type WebhookMgr struct {
	cl.Client
	IsExp      bool
	IsOverLoad bool
}

var WH WebhookMgr = WebhookMgr{}

func (wh *WebhookMgr) Handle(ctx context.Context, req admission.Request) admission.Response {
	logger.Info("checking user", "userInfo", req.UserInfo, "req.Namespace", req.Namespace, "req.Name", req.Name, "req.gvrk", getGVRK(req))
	if req.Operation == admissionV1.Delete {
		return admission.Allowed("")
	}
	if wh.IsExp {
		return admission.Denied("License has expired")
	} else if wh.IsOverLoad {
		return admission.Denied("The cluster resource has exceeded the scope of the license")
	} else {
		return admission.Allowed("License normal")
	}
}
func getGVRK(req admission.Request) string {
	if req.Kind.Group == "" {
		return fmt.Sprintf("%s.%s/%s", req.Resource.Resource, req.Kind.Kind, req.Kind.Version)
	}
	return fmt.Sprintf("%s.%s.%s/%s", req.Resource.Resource, req.Kind.Kind, req.Kind.Group, req.Kind.Version)
}
