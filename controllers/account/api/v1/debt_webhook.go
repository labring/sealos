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
	"os"

	"github.com/go-logr/logr"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

// +kubebuilder:webhook:path=/mutate-v1-pod,mutating=true,failurePolicy=fail,groups="",resources=*,verbs=create;update,versions=v1,name=mpod.kb.io,admissionReviewVersions=v1,sideEffects=None
//+kubebuilder:object:generate=false

type PodAnnotator struct {
	Client client.Client
}

var debtlog = logf.Log.WithName("image-resource")

func (a *PodAnnotator) Handle(ctx context.Context, req admission.Request) admission.Response {
	return checkOption(ctx, debtlog, a.Client, req.Namespace)
}

func checkOption(ctx context.Context, logger logr.Logger, c client.Client, nsName string) admission.Response {
	ns := corev1.Namespace{}
	if err := c.Get(ctx, client.ObjectKey{Name: nsName}, &ns); err != nil {
		logger.Error(err, "get namespace error")
		return admission.ValidationResponse(false, nsName)
	}

	// Check if it is a user namespace
	user, ok := ns.Annotations[userv1.UserAnnotationOwnerKey]
	if !ok {
		return admission.ValidationResponse(true, fmt.Sprintf("this namespace is not user namespace %s", ns.Name))
	}

	account := Account{}
	if err := c.Get(ctx, client.ObjectKey{Name: user, Namespace: os.Getenv("ACCOUNT_NAMESPACE")}, &account); err != nil {
		logger.Error(err, "get account error")
		return admission.ValidationResponse(false, err.Error())
	}

	if account.Status.Balance-account.Status.DeductionBalance < 0 {
		return admission.ValidationResponse(false, fmt.Sprintf("account balance less than 0,now account is %d", account.Status.Balance-account.Status.DeductionBalance))
	}

	return admission.ValidationResponse(true, "")
}
