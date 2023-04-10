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

	"github.com/go-logr/logr"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

const (
	saPrefix             = "system:serviceaccount"
	mastersGroup         = "system:masters"
	kubeSystemNamespace  = "kube-system"
	defaultUserNamespace = "user-system"
)

var logger = logf.Log.WithName("debt-resource")

//+kubebuilder:webhook:path=/validate-v1-sealos-cloud,mutating=true,failurePolicy=ignore,groups="*",resources=*,verbs=create;update,versions=v1,name=debt.sealos.io,admissionReviewVersions=v1,sideEffects=None
// +kubebuilder:object:generate=false

type DebtValidate struct {
	Client client.Client
}

func getUserNamespace() string {
	userNamespace := os.Getenv("USER_NAMESPACE")
	if userNamespace == "" {
		return defaultUserNamespace
	}
	return userNamespace
}

var kubeSystemGroup, userSaGroup string

func init() {
	kubeSystemGroup = fmt.Sprintf("%ss:%s", saPrefix, kubeSystemNamespace)
	userSaGroup = fmt.Sprintf("%ss:%s", saPrefix, getUserNamespace())
}
func (d DebtValidate) Handle(ctx context.Context, req admission.Request) admission.Response {
	logger.V(1).Info("checking user", "userInfo", req.UserInfo, "req.Namespace", req.Namespace, "req.Name", req.Name, "req.gvrk", getGVRK(req))
	for _, g := range req.UserInfo.Groups {
		switch g {
		// if user is kubernetes-admin, pass it
		case mastersGroup:
			logger.V(1).Info("pass for kubernetes-admin")
			return admission.ValidationResponse(true, "")
		case kubeSystemGroup:
			logger.V(1).Info("pass for kube-system")
			return admission.ValidationResponse(true, "")
		case userSaGroup:
			logger.V(1).Info("check for user", "user", req.UserInfo.Username, "ns: ", req.Namespace)
			if isWhiteList(req) {
				return admission.ValidationResponse(true, "")
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

func checkOption(ctx context.Context, logger logr.Logger, c client.Client, nsName string) admission.Response {
	nsList := &corev1.NamespaceList{}
	if err := c.List(ctx, nsList, client.MatchingFields{"name": nsName}); err != nil {
		logger.Error(err, "list ns error", "naName", nsName, "nsList", nsList)
		return admission.ValidationResponse(true, nsName)
	}

	//ns name unique in k8s
	ns := nsList.Items[0]
	// Check if it is a user namespace
	user, ok := ns.Annotations[userv1.UserAnnotationOwnerKey]
	if !ok {
		return admission.ValidationResponse(true, fmt.Sprintf("this namespace is not user namespace %s,or have not create", ns.Name))
	}

	accountList := AccountList{}
	if err := c.List(ctx, &accountList, client.MatchingFields{"name": user}); err != nil {
		logger.Error(err, "get account error", "user", user)
		return admission.ValidationResponse(true, err.Error())
	}

	for _, account := range accountList.Items {
		if account.Status.Balance-account.Status.DeductionBalance < 0 {
			return admission.ValidationResponse(false, fmt.Sprintf("account balance less than 0,now account is %.2f¥", float64(account.Status.Balance-account.Status.DeductionBalance)/10000))
		}
	}
	return admission.ValidationResponse(true, "")
}
