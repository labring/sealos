// Copyright 2026 labring.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package cache

import (
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"strconv"
	"strings"
	"time"

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/helper/config"
	"github.com/labring/sealos/controllers/user/controllers/helper/hash"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/client-go/tools/clientcmd"
	ctrlcache "sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// RoleBindingSpecHashAnnotation stores the in-memory hash for a RoleBinding
// or ClusterRoleBinding projection. It is never written back to the API.
const RoleBindingSpecHashAnnotation = "user.sealos.io/cache-role-binding-spec-hash"

type roleBindingSpec struct {
	RoleRef  rbacv1.RoleRef
	Subjects []rbacv1.Subject
}

// RoleBindingSpecHash returns the stable hash used by RBAC cache projections.
func RoleBindingSpecHash(roleRef rbacv1.RoleRef, subjects []rbacv1.Subject) string {
	return hash.HashToString(roleBindingSpec{RoleRef: roleRef, Subjects: subjects})
}

// Options keeps only explicitly registered informer data in memory. Large
// fields are removed when controllers only need a smaller object projection.
func Options(syncPeriod *time.Duration) ctrlcache.Options {
	secretMetadata := &metav1.PartialObjectMetadata{}
	secretMetadata.SetGroupVersionKind(corev1.SchemeGroupVersion.WithKind("Secret"))
	return ctrlcache.Options{
		SyncPeriod:                  syncPeriod,
		ReaderFailOnMissingInformer: true,
		DefaultTransform:            ctrlcache.TransformStripManagedFields(),
		ByObject: map[client.Object]ctrlcache.ByObject{
			&corev1.Namespace{}: {
				Transform: transformNamespace,
			},
			&rbacv1.ClusterRoleBinding{}: {
				Field: fields.OneTermEqualSelector(
					"metadata.name",
					config.AdminClusterRoleBindingName,
				),
				// The admin binding is checked from cache during restart, including
				// its subjects and role reference.
				Transform: transformClusterRoleBinding,
			},
			&licensev1.License{}: {
				Transform: transformLicense,
			},
			&userv1.User{}: {
				Transform: transformUser,
			},
			&userv1.DeleteRequest{}: {
				Transform: transformDeleteRequest,
			},
			secretMetadata: {
				Namespaces: map[string]ctrlcache.Config{
					config.GetUserSystemNamespace(): {},
				},
				Transform: transformSecretMetadata,
			},
			&corev1.ServiceAccount{}: {
				Namespaces: map[string]ctrlcache.Config{
					config.GetUserSystemNamespace(): {},
				},
				Transform: transformServiceAccount,
			},
			&userv1.Operationrequest{}: {
				Namespaces: map[string]ctrlcache.Config{
					config.GetUserSystemNamespace(): {},
				},
				Transform: transformOperationrequest,
			},
			&rbacv1.Role{}: {
				Transform: transformRole,
			},
			&rbacv1.RoleBinding{}: {
				Transform: transformRoleBinding,
			},
		},
	}
}

// UncachedObjects returns objects whose reads require complete, current API data.
func UncachedObjects() []client.Object {
	return []client.Object{
		&licensev1.License{},
		&userv1.DeleteRequest{},
		&userv1.Operationrequest{},
		&corev1.Namespace{},
		&corev1.Secret{},
		&corev1.ServiceAccount{},
		&rbacv1.ClusterRoleBinding{},
		&rbacv1.Role{},
		&rbacv1.RoleBinding{},
	}
}

func transformUser(obj any) (any, error) {
	user, ok := obj.(*userv1.User)
	if !ok {
		return obj, nil
	}

	metadata := projectUserObjectMeta(user.ObjectMeta)
	metadata.Finalizers = append([]string(nil), user.Finalizers...)
	metadata.Annotations = copyMapValues(
		user.Annotations,
		userv1.UserAnnotationOwnerKey,
	)
	metadata.Labels = copyMapValues(
		user.Labels,
		"user.sealos.io/status",
		"user.sealos.io/type",
	)
	status := projectUserStatus(user.Status)
	if status.KubeConfigRefreshAt == nil {
		status.KubeConfigRefreshAt = inferKubeConfigRefreshAt(user)
	}
	spec := user.Spec
	if user.Spec.KubeConfigRotateAt != nil {
		rotateAt := *user.Spec.KubeConfigRotateAt
		spec.KubeConfigRotateAt = &rotateAt
	}
	return &userv1.User{
		TypeMeta:   user.TypeMeta,
		ObjectMeta: metadata,
		Spec:       spec,
		Status:     status,
	}, nil
}

// projectUserStatus copies the status fields used by reconciliation and drops
// the persisted kubeconfig before allocating a cache object.
func projectUserStatus(status userv1.UserStatus) userv1.UserStatus {
	projected := userv1.UserStatus{
		Phase:                        status.Phase,
		ObservedCSRExpirationSeconds: status.ObservedCSRExpirationSeconds,
		ObservedKubeConfigSecretUID:  status.ObservedKubeConfigSecretUID,
		ObservedGeneration:           status.ObservedGeneration,
	}
	if status.ObservedKubeConfigRotateAt != nil {
		rotateAt := *status.ObservedKubeConfigRotateAt
		projected.ObservedKubeConfigRotateAt = &rotateAt
	}
	if status.KubeConfigRefreshAt != nil {
		refreshAt := *status.KubeConfigRefreshAt
		projected.KubeConfigRefreshAt = &refreshAt
	}
	if len(status.Conditions) > 0 {
		projected.Conditions = append([]userv1.Condition(nil), status.Conditions...)
	}
	return projected
}

// inferKubeConfigRefreshAt derives the refresh point from legacy JWT-backed
// kubeconfigs while projecting the object. The payload is parsed and dropped;
// the cache never retains the credential itself.
func inferKubeConfigRefreshAt(user *userv1.User) *metav1.Time {
	if user == nil || user.Status.KubeConfig == "" {
		return nil
	}
	config, err := clientcmd.Load([]byte(user.Status.KubeConfig))
	if err != nil {
		return nil
	}
	info, ok := config.AuthInfos[user.Name]
	if !ok || info == nil {
		return inferLegacyRefreshAt(user)
	}
	if info.Token != "" {
		parts := strings.Split(info.Token, ".")
		if len(parts) >= 2 {
			if refreshAt := inferTokenRefreshAt(parts[1]); refreshAt != nil {
				return refreshAt
			}
		}
	}
	if len(info.ClientCertificateData) == 0 {
		return inferLegacyRefreshAt(user)
	}
	block, _ := pem.Decode(info.ClientCertificateData)
	if block == nil {
		return nil
	}
	certificate, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil
	}
	return refreshAtFromIssuedAt(certificate.NotBefore, certificate.NotAfter)
}

func inferLegacyRefreshAt(user *userv1.User) *metav1.Time {
	if user == nil {
		return nil
	}
	issuedAt := user.Status.ObservedKubeConfigRotateAt
	if issuedAt == nil || issuedAt.IsZero() {
		issuedAt = &user.CreationTimestamp
	}
	expirationSeconds := user.Status.ObservedCSRExpirationSeconds
	if expirationSeconds == 0 {
		expirationSeconds = user.Spec.CSRExpirationSeconds
	}
	if expirationSeconds == 0 {
		// Older User objects may predate both expiration fields. The legacy
		// kubeconfig issuer used this same default when the spec was zero.
		expirationSeconds = userv1.DefaultCSRExpirationSeconds
	}
	if issuedAt == nil || issuedAt.IsZero() {
		return nil
	}
	expirationSeconds = userv1.NormalizeCSRExpirationSeconds(expirationSeconds)
	return refreshAtFromIssuedAt(
		issuedAt.Time,
		issuedAt.Add(time.Duration(expirationSeconds)*time.Second),
	)
}

func inferTokenRefreshAt(encodedPayload string) *metav1.Time {
	payload, err := base64.RawURLEncoding.DecodeString(encodedPayload)
	if err != nil {
		payload, err = base64.URLEncoding.DecodeString(encodedPayload)
		if err != nil {
			return nil
		}
	}
	claims := map[string]json.RawMessage{}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil
	}
	var expiration json.Number
	if err := json.Unmarshal(claims["exp"], &expiration); err != nil {
		return nil
	}
	expirationUnix, err := strconv.ParseInt(string(expiration), 10, 64)
	if err != nil {
		return nil
	}
	expirationTime := time.Unix(expirationUnix, 0)
	var issuedAt time.Time
	// Kubernetes service-account tokens normally carry iat and nbf. Use nbf
	// as a fallback so the inferred deadline remains stable across cache events.
	for _, claimName := range []string{"iat", "nbf"} {
		issued, ok := claims[claimName]
		if !ok {
			continue
		}
		var issuedNumber json.Number
		if err := json.Unmarshal(issued, &issuedNumber); err != nil {
			continue
		}
		issuedAtUnix, err := strconv.ParseInt(string(issuedNumber), 10, 64)
		if err == nil {
			issuedAt = time.Unix(issuedAtUnix, 0)
			break
		}
	}
	if !issuedAt.IsZero() && expirationTime.After(issuedAt) {
		return refreshAtFromIssuedAt(issuedAt, expirationTime)
	}
	return refreshAtFromExpiration(expirationTime)
}

func refreshAtFromExpiration(expiration time.Time) *metav1.Time {
	refreshAt := time.Now().Add(time.Until(expiration) * 8 / 10)
	return &metav1.Time{Time: refreshAt}
}

func refreshAtFromIssuedAt(issuedAt, expiration time.Time) *metav1.Time {
	return &metav1.Time{Time: issuedAt.Add(expiration.Sub(issuedAt) * 8 / 10)}
}

func transformLicense(obj any) (any, error) {
	metadata, ok := obj.(*metav1.PartialObjectMetadata)
	if !ok {
		return obj, nil
	}
	projected := projectEventObjectMeta(metadata.ObjectMeta)
	projected.CreationTimestamp = metadata.CreationTimestamp
	return &metav1.PartialObjectMetadata{
		TypeMeta:   metadata.TypeMeta,
		ObjectMeta: projected,
	}, nil
}

func transformDeleteRequest(obj any) (any, error) {
	metadata, ok := obj.(*metav1.PartialObjectMetadata)
	if !ok {
		return obj, nil
	}
	return &metav1.PartialObjectMetadata{
		TypeMeta:   metadata.TypeMeta,
		ObjectMeta: projectEventObjectMeta(metadata.ObjectMeta),
	}, nil
}

func transformOperationrequest(obj any) (any, error) {
	metadata, ok := obj.(*metav1.PartialObjectMetadata)
	if !ok {
		return obj, nil
	}
	return &metav1.PartialObjectMetadata{
		TypeMeta:   metadata.TypeMeta,
		ObjectMeta: projectEventObjectMeta(metadata.ObjectMeta),
	}, nil
}

func transformServiceAccount(obj any) (any, error) {
	serviceAccount, ok := obj.(*corev1.ServiceAccount)
	if !ok {
		return obj, nil
	}
	projected := &corev1.ServiceAccount{
		TypeMeta:   serviceAccount.TypeMeta,
		ObjectMeta: projectOwnerObjectMeta(serviceAccount.ObjectMeta),
	}
	if hasUserController(projected.OwnerReferences) && len(serviceAccount.Secrets) > 0 {
		projected.Secrets = []corev1.ObjectReference{{Name: serviceAccount.Secrets[0].Name}}
	}
	return projected, nil
}

func transformRole(obj any) (any, error) {
	role, ok := obj.(*rbacv1.Role)
	if !ok {
		return obj, nil
	}
	projected := &rbacv1.Role{
		TypeMeta:   role.TypeMeta,
		ObjectMeta: projectOwnerObjectMeta(role.ObjectMeta),
	}
	if hasUserController(projected.OwnerReferences) {
		if projected.Annotations == nil {
			projected.Annotations = make(map[string]string, 1)
		}
		projected.Annotations[config.RoleRulesHashAnnotation] = hash.HashToString(role.Rules)
	}
	return projected, nil
}

func transformRoleBinding(obj any) (any, error) {
	roleBinding, ok := obj.(*rbacv1.RoleBinding)
	if !ok {
		return obj, nil
	}
	projected := &rbacv1.RoleBinding{
		TypeMeta:   roleBinding.TypeMeta,
		ObjectMeta: projectOwnerObjectMeta(roleBinding.ObjectMeta),
	}
	if hasUserController(projected.OwnerReferences) {
		if projected.Annotations == nil {
			projected.Annotations = make(map[string]string, 1)
		}
		projected.Annotations[RoleBindingSpecHashAnnotation] = RoleBindingSpecHash(
			roleBinding.RoleRef,
			roleBinding.Subjects,
		)
	} else {
		// The legacy RoleBinding adapter uses the owner annotation to identify
		// workspace bindings before it performs its uncached read.
		projected.Annotations = copyMapValues(
			roleBinding.Annotations,
			userv1.UserAnnotationCreatorKey,
			userv1.UserAnnotationOwnerKey,
		)
	}
	return projected, nil
}

func transformClusterRoleBinding(obj any) (any, error) {
	roleBinding, ok := obj.(*rbacv1.ClusterRoleBinding)
	if !ok {
		return obj, nil
	}
	projected := &rbacv1.ClusterRoleBinding{
		TypeMeta:   roleBinding.TypeMeta,
		ObjectMeta: projectOwnerObjectMeta(roleBinding.ObjectMeta),
	}
	if hasUserController(projected.OwnerReferences) {
		if projected.Annotations == nil {
			projected.Annotations = make(map[string]string, 1)
		}
		projected.Annotations[RoleBindingSpecHashAnnotation] = RoleBindingSpecHash(
			roleBinding.RoleRef,
			roleBinding.Subjects,
		)
	}
	return projected, nil
}

func hasUserController(references []metav1.OwnerReference) bool {
	for _, reference := range references {
		if reference.Controller != nil && *reference.Controller &&
			reference.APIVersion == userv1.GroupVersion.String() && reference.Kind == "User" {
			return true
		}
	}
	return false
}

func transformNamespace(obj any) (any, error) {
	metadata, ok := obj.(*metav1.PartialObjectMetadata)
	if !ok {
		return obj, nil
	}

	projected := projectEventObjectMeta(metadata.ObjectMeta)
	if !isUserNamespaceName(metadata.Name) {
		return &metav1.PartialObjectMetadata{
			TypeMeta:   metadata.TypeMeta,
			ObjectMeta: projected,
		}, nil
	}
	projected.Annotations = copyMapValues(
		metadata.Annotations,
		userv1.UserAnnotationCreatorKey,
		userv1.UserAnnotationOwnerKey,
	)
	projected.Labels = copyMapValues(
		metadata.Labels,
		userv1.UserLabelOwnerKey,
	)
	for key, value := range metadata.Labels {
		if config.IsPodSecurityLabel(key) {
			if projected.Labels == nil {
				projected.Labels = make(map[string]string)
			}
			projected.Labels[key] = value
		}
	}
	projected.OwnerReferences = projectControllerOwnerReferences(metadata.OwnerReferences)
	return &metav1.PartialObjectMetadata{
		TypeMeta:   metadata.TypeMeta,
		ObjectMeta: projected,
	}, nil
}

func projectOwnerObjectMeta(in metav1.ObjectMeta) metav1.ObjectMeta {
	projected := projectEventObjectMeta(in)
	projected.CreationTimestamp = in.CreationTimestamp
	projected.OwnerReferences = projectControllerOwnerReferences(in.OwnerReferences)
	if len(projected.OwnerReferences) == 0 {
		return projected
	}
	projected.Annotations = copyMapValues(
		in.Annotations,
		userv1.UserAnnotationCreatorKey,
		userv1.UserAnnotationOwnerKey,
	)
	return projected
}

func projectUserObjectMeta(in metav1.ObjectMeta) metav1.ObjectMeta {
	out := metav1.ObjectMeta{
		Name:              in.Name,
		Namespace:         in.Namespace,
		UID:               in.UID,
		ResourceVersion:   in.ResourceVersion,
		Generation:        in.Generation,
		CreationTimestamp: in.CreationTimestamp,
	}
	if in.DeletionTimestamp != nil {
		out.DeletionTimestamp = in.DeletionTimestamp.DeepCopy()
	}
	if in.DeletionGracePeriodSeconds != nil {
		gracePeriod := *in.DeletionGracePeriodSeconds
		out.DeletionGracePeriodSeconds = &gracePeriod
	}
	return out
}

func projectEventObjectMeta(in metav1.ObjectMeta) metav1.ObjectMeta {
	return metav1.ObjectMeta{
		Name:              in.Name,
		Namespace:         in.Namespace,
		UID:               in.UID,
		ResourceVersion:   in.ResourceVersion,
		CreationTimestamp: in.CreationTimestamp,
	}
}

func projectControllerOwnerReferences(in []metav1.OwnerReference) []metav1.OwnerReference {
	for _, reference := range in {
		if reference.Controller == nil || !*reference.Controller ||
			reference.APIVersion != userv1.GroupVersion.String() || reference.Kind != "User" {
			continue
		}
		controller := *reference.Controller
		reference.Controller = &controller
		if reference.BlockOwnerDeletion != nil {
			blockOwnerDeletion := *reference.BlockOwnerDeletion
			reference.BlockOwnerDeletion = &blockOwnerDeletion
		}
		return []metav1.OwnerReference{reference}
	}
	return nil
}

func isUserNamespaceName(name string) bool {
	return strings.HasPrefix(name, "ns-") && len(name) > len("ns-")
}

func copyMapValues(source map[string]string, keys ...string) map[string]string {
	count := 0
	for _, key := range keys {
		if _, ok := source[key]; ok {
			count++
		}
	}
	if count == 0 {
		return nil
	}
	result := make(map[string]string, count)
	for _, key := range keys {
		if value, ok := source[key]; ok {
			result[key] = value
		}
	}
	return result
}

func transformSecretMetadata(obj any) (any, error) {
	metadata, ok := obj.(*metav1.PartialObjectMetadata)
	if !ok {
		return obj, nil
	}
	projected := &metav1.PartialObjectMetadata{
		TypeMeta:   metadata.TypeMeta,
		ObjectMeta: projectEventObjectMeta(metadata.ObjectMeta),
	}
	projected.CreationTimestamp = metadata.CreationTimestamp
	projected.OwnerReferences = projectControllerOwnerReferences(metadata.OwnerReferences)
	// Legacy token cleanup indexes all Secrets by this annotation, including
	// Secrets that predate User owner references.
	projected.Annotations = copyMapValues(metadata.Annotations, corev1.ServiceAccountNameKey)
	return projected, nil
}
