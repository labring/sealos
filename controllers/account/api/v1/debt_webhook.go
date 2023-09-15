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
	"strings"

	"github.com/labring/sealos/controllers/pkg/code"

	userV1 "github.com/labring/sealos/controllers/user/api/v1"

	account2 "github.com/labring/sealos/controllers/pkg/account"

	admissionV1 "k8s.io/api/admission/v1"
	"k8s.io/apimachinery/pkg/types"

	"github.com/go-logr/logr"
	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

const (
	saPrefix                   = "system:serviceaccounts"
	mastersGroup               = "system:masters"
	kubeSystemNamespace        = "kube-system"
	defaultUserSystemNamespace = "user-system"
)

const (
	DebtSchedulerName     = "sealos-debt-scheduler"
	PreviousSchedulerName = "sealos-debt/previousScheduler"
	PodPhaseSuspended     = "Suspended"
)

var logger = logf.Log.WithName("debt-resource")

//+kubebuilder:webhook:path=/validate-v1-sealos-cloud,mutating=true,failurePolicy=ignore,groups="*",resources=*,verbs=create;update;delete,versions=v1,name=debt.sealos.io,admissionReviewVersions=v1,sideEffects=None
// +kubebuilder:object:generate=false

type DebtValidate struct {
	Client client.Client
}

var kubeSystemGroup string

func init() {
	kubeSystemGroup = fmt.Sprintf("%s:%s", saPrefix, kubeSystemNamespace)
}
func (d DebtValidate) Handle(ctx context.Context, req admission.Request) admission.Response {
	logger.V(1).Info("checking user", "userInfo", req.UserInfo, "req.Namespace", req.Namespace, "req.Name", req.Name, "req.gvrk", getGVRK(req), "req.Operation", req.Operation)
	// skip delete request (删除quota资源除外)
	if req.Operation == admissionV1.Delete && !strings.Contains(getGVRK(req), "quotas") {
		if req.Kind.Kind == "Namespace" {
			return admission.Denied(fmt.Sprintf("ns %s request %s %s permission denied", req.Namespace, req.Kind.Kind, req.Operation))
		}
		return admission.Allowed("")
	}

	for _, g := range req.UserInfo.Groups {
		switch g {
		// if user is kubernetes-admin, pass it
		case mastersGroup:
			logger.V(1).Info("pass for kubernetes-admin")
			return admission.ValidationResponse(true, "")
		case kubeSystemGroup:
			logger.V(1).Info("pass for kube-system")
			return admission.ValidationResponse(true, "")
		case fmt.Sprintf("%s:%s", saPrefix, req.Namespace):
			if !isUserNamespace(req.Namespace) || isWhiteList(req) {
				return admission.ValidationResponse(true, "")
			}
			logger.V(1).Info("check for user", "user", req.UserInfo.Username, "ns: ", req.Namespace, "name", req.Name, "Operation", req.Operation)
			// Check if the request is for resourcequota resource
			if req.Kind.Kind == "ResourceQuota" {
				// Check if the operation is UPDATE or DELETE
				switch req.Name {
				case getDefaultQuotaName(req.Namespace), debtLimit0QuotaName:
					return admission.Denied(fmt.Sprintf("ns %s request %s %s permission denied", req.Namespace, req.Kind.Kind, req.Operation))
				}
			}
			if req.Kind.Kind == "Namespace" && req.Name == req.Namespace {
				return admission.Denied(fmt.Sprintf("ns %s request %s %s permission denied", req.Namespace, req.Kind.Kind, req.Operation))
			}
			if req.Kind.Kind == "Payment" && req.Operation == admissionV1.Update {
				return admission.Denied(fmt.Sprintf("ns %s request %s %s permission denied", req.Namespace, req.Kind.Kind, req.Operation))
			}
			return checkOption(ctx, logger, d.Client, req.Namespace)
		default:
			// continue to check other groups
			continue
		}
	}

	logger.V(1).Info("pass ", "req.Namespace", req.Namespace)
	return admission.ValidationResponse(true, "")
}

func getGVRK(req admission.Request) string {
	if req.Kind.Group == "" {
		return fmt.Sprintf("%s.%s/%s", req.Resource.Resource, req.Kind.Kind, req.Kind.Version)
	}
	return fmt.Sprintf("%s.%s.%s/%s", req.Resource.Resource, req.Kind.Kind, req.Kind.Group, req.Kind.Version)
}

func isWhiteList(req admission.Request) bool {
	// check if it is in whitelist
	// default: "terminals.Terminal.terminal.sealos.io/v1,payments.Payment.account.sealos.io/v1,billingrecordqueries.BillingRecordQuery.account.sealos.io/v1,pricequeries.PriceQuery.account.sealos.io/v1"
	whitelists := os.Getenv("WHITELIST")
	if whitelists == "" {
		return false
	}
	whitelist := strings.Split(whitelists, ",")
	reqGVK := getGVRK(req)
	for _, w := range whitelist {
		if reqGVK == w {
			logger.V(1).Info("pass for whitelists", "gck", req.Kind.String(), "name", req.Name, "namespace", req.Namespace, "userinfo", req.UserInfo)
			return true
		}
	}

	return false
}

func isUserNamespace(namespace string) bool {
	return strings.HasPrefix(namespace, "ns-")
}

func checkOption(ctx context.Context, logger logr.Logger, c client.Client, nsName string) admission.Response {
	//nsList := &corev1.NamespaceList{}
	//if err := c.List(ctx, nsList, client.MatchingFields{"name": nsName}); err != nil {
	//	logger.Error(err, "list ns error", "naName", nsName, "nsList", nsList)
	//	return admission.ValidationResponse(true, nsName)
	//}
	// skip check if nsName is empty or equal to user system namespace
	if nsName == "" {
		return admission.Allowed("")
	}
	ns := &corev1.Namespace{}
	if err := c.Get(ctx, types.NamespacedName{Name: nsName, Namespace: nsName}, ns); err != nil {
		return admission.Allowed("namespace not found")
	}
	// Check if it is a user namespace
	user, ok := ns.Labels[userV1.UserLabelOwnerKey]
	if !ok {
		return admission.ValidationResponse(true, fmt.Sprintf("this namespace is not user namespace %s,or have not create", ns.Name))
	}
	logger.V(1).Info("check user namespace", "ns", ns.Name, "user", user)
	accountList := AccountList{}
	if err := c.List(ctx, &accountList, client.MatchingFields{Name: user}); err != nil {
		logger.Error(err, "get account error", "user", user)
		return admission.ValidationResponse(true, err.Error())
	}

	for _, account := range accountList.Items {
		if account.Status.Balance < account.Status.DeductionBalance {
			return admission.ValidationResponse(false, fmt.Sprintf(code.MessageFormat, code.CodeInsufficientBalance, fmt.Sprintf("account balance less than 0,now account is %.2f¥. Please recharge the user %s.", GetAccountDebtBalance(account), user)))
		}
	}
	return admission.Allowed(fmt.Sprintf("pass user %s , namespace %s", user, ns.Name))
}

func getDefaultQuotaName(namespace string) string {
	return fmt.Sprintf("quota-%s", namespace)
}

func GetAccountDebtBalance(account Account) float64 {
	return account2.GetCurrencyBalance(account.Status.Balance - account.Status.DeductionBalance)
}

const debtLimit0QuotaName = "debt-limit0"
