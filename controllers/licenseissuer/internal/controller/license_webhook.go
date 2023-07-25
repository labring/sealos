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
	"fmt"
	"strings"

	cloud "github.com/labring/sealos/controllers/licenseissuer/internal/manager"
	admissionV1 "k8s.io/api/admission/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

// log is for logging in this package.

type ScaleWebhook struct {
	client.Client
}

var scalelog = logf.Log.WithName("scale-resource")

const (
	PodAllowedNamePrefix = "terminal"
)

//+kubebuilder:webhook:path=/validate-infostream-sealos-io-v1-license,mutating=false,failurePolicy=ignore,sideEffects=None,groups="*",resources=pods,verbs=create;update,versions=v1,name=vlicense.kb.io,admissionReviewVersions=v1

func (sw *ScaleWebhook) Handle(_ context.Context, req admission.Request) admission.Response {
	scalelog.Info("enter webhook of scale webhook:", "userInfo", req.UserInfo, "req.Namespace", req.Namespace, "req.Name", req.Name, "req.Operation", req.Operation)

	if req.Operation == admissionV1.Delete {
		return admission.Allowed("")
	}
	if strings.HasPrefix(req.Name, PodAllowedNamePrefix) {
		return admission.Allowed("")
	}

	if cloud.IsCommunityEdition() {
		return admission.Allowed("")
	}

	if !isAllowed() {
		scalelog.Info("The current cluster scale exceeds the specified limit.")
		return admission.Denied(fmt.Sprintf("ns %s request %s %s permission denied. %s", req.Namespace, req.Kind.Kind, req.Operation, "The current cluster scale exceeds the specified limit."))
	}
	return admission.Allowed("")
}

func isAllowed() bool {
	return cloud.ExpectScale.CPULimit < cloud.ActualScale.CPULimit &&
		cloud.ExpectScale.NodeLimit < cloud.ActualScale.NodeLimit
}
