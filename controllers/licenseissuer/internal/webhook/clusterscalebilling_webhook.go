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

package webhook

import (
	"context"

	"github.com/labring/sealos/controllers/licenseissuer/internal/controller/util"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

//+kubebuilder:webhook:path=/validate-infostream-sealos-io-v1-clusterscalebilling,mutating=false,failurePolicy=fail,sideEffects=None,groups="",resources=pods,verbs=create;update,versions=v1,name=vclusterscalebilling.kb.io,admissionReviewVersions=v1

// log is for logging in this package.
var log = logf.Log.WithName("clusterscalebilling-resource")

type podValidator struct {
	Client  client.Client
	decoder *admission.Decoder
}

func NewPodValidator(c client.Client) admission.Handler {
	return &podValidator{Client: c}
}

// podValidator admits a pod if a specific annotation exists.
func (v *podValidator) Handle(ctx context.Context, req admission.Request) admission.Response {
	cs := util.GetClusterStatus()
	log.Info("BillingPolicy", "policy:", cs.BillingPolicy)
	if util.GetValidator().Validate() {
		return admission.Allowed("license is valid, no need to validate")
	}
	return admission.Denied("license is invalid, please update license")
}

// podValidator implements admission.DecoderInjector.
// A decoder will be automatically injected.

// InjectDecoder injects the decoder.
func (v *podValidator) InjectDecoder(d *admission.Decoder) error {
	v.decoder = d
	return nil
}
