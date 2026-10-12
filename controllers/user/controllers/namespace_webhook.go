/*
Copyright 2026 sealos.

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
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/labring/sealos/controllers/user/controllers/helper/config"
	"github.com/prometheus/client_golang/prometheus"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	ctrlmetrics "sigs.k8s.io/controller-runtime/pkg/metrics"
	"sigs.k8s.io/controller-runtime/pkg/webhook"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

var (
	namespaceWebhookLog = logf.Log.WithName("namespace-validating-webhook")
	// The metric name is an external contract and intentionally omits the conventional _total suffix.
	namespaceMissingLabels = prometheus.NewCounterVec(
		prometheus.CounterOpts{ //nolint:promlinter
			Name: "sealos_namespace_missing_labels",
			Help: "Number of rejected namespace create or update requests with missing or invalid Pod Security labels.",
		},
		[]string{"namespace", "service_account"},
	)
)

func init() {
	ctrlmetrics.Registry.MustRegister(namespaceMissingLabels)
}

// NamespaceValidator prevents an ns-* namespace from being created or updated
// without the Pod Security labels managed by the user controller.
// +kubebuilder:object:generate=false
type NamespaceValidator struct {
	Disabled                bool
	EnableAdminClusterAdmin bool
}

var _ webhook.CustomValidator = &NamespaceValidator{}

func (v *NamespaceValidator) SetupWebhookWithManager(mgr ctrl.Manager) error {
	return ctrl.NewWebhookManagedBy(mgr).
		For(&corev1.Namespace{}).
		WithValidator(v).
		Complete()
}

// +kubebuilder:webhook:path=/validate--v1-namespace,mutating=false,failurePolicy=fail,sideEffects=None,groups="",resources=namespaces,verbs=create;update,versions=v1,name=vnamespace.user.sealos.io,admissionReviewVersions=v1

func (v *NamespaceValidator) ValidateCreate(
	ctx context.Context,
	obj runtime.Object,
) (admission.Warnings, error) {
	namespace, ok := obj.(*corev1.Namespace)
	if !ok {
		return nil, errors.New("obj convert to Namespace error")
	}
	namespaceWebhookLog.Info("validating create", "name", namespace.Name)
	return nil, v.validate(ctx, namespace)
}

func (v *NamespaceValidator) ValidateUpdate(
	ctx context.Context,
	oldObj, newObj runtime.Object,
) (admission.Warnings, error) {
	if _, ok := oldObj.(*corev1.Namespace); !ok {
		return nil, errors.New("oldObj convert to Namespace error")
	}
	namespace, ok := newObj.(*corev1.Namespace)
	if !ok {
		return nil, errors.New("newObj convert to Namespace error")
	}
	namespaceWebhookLog.Info("validating update", "name", namespace.Name)
	return nil, v.validate(ctx, namespace)
}

func (v *NamespaceValidator) ValidateDelete(
	_ context.Context,
	obj runtime.Object,
) (admission.Warnings, error) {
	if _, ok := obj.(*corev1.Namespace); !ok {
		return nil, errors.New("obj convert to Namespace error")
	}
	return nil, nil
}

func (v *NamespaceValidator) validate(ctx context.Context, namespace *corev1.Namespace) error {
	if v.Disabled || !isUserNamespace(namespace.Name) ||
		(v.EnableAdminClusterAdmin && namespace.Name == config.GetUsersNamespace(adminUserName)) {
		return nil
	}

	missingLabels := missingPodSecurityLabels(namespace.Labels)
	if len(missingLabels) == 0 {
		return nil
	}

	serviceAccount := ""
	if request, err := admission.RequestFromContext(ctx); err == nil {
		serviceAccount = request.UserInfo.Username
	}
	namespaceMissingLabels.WithLabelValues(namespace.Name, serviceAccount).Inc()
	namespaceWebhookLog.Info(
		"rejecting namespace with missing or invalid Pod Security labels",
		"name", namespace.Name,
		"serviceAccount", serviceAccount,
		"requiredLabels", missingLabels,
	)
	return fmt.Errorf(
		"namespace %s must have Pod Security labels: %s",
		namespace.Name,
		strings.Join(missingLabels, ", "),
	)
}

func missingPodSecurityLabels(labels map[string]string) []string {
	requiredLabels := config.SetPodSecurity(make(map[string]string, 6))
	missingLabels := make([]string, 0, len(requiredLabels))
	for key, value := range requiredLabels {
		if labels[key] != value {
			missingLabels = append(missingLabels, key+"="+value)
		}
	}
	sort.Strings(missingLabels)
	return missingLabels
}
