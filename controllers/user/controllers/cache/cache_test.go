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
	"encoding/base64"
	"encoding/pem"
	"reflect"
	"strconv"
	"testing"
	"time"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/helper/config"
	"github.com/labring/sealos/controllers/user/controllers/helper/hash"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
	ctrlcache "sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func transformedAs[T any](t *testing.T, obj any) T {
	t.Helper()
	transformed, ok := obj.(T)
	if !ok {
		t.Fatalf("transformed object type = %T", obj)
	}
	return transformed
}

func TestOptionsLimitsSecretCache(t *testing.T) {
	syncPeriod := time.Hour
	options := Options(&syncPeriod)
	if options.SyncPeriod != &syncPeriod {
		t.Fatal("sync period was not retained")
	}
	if !options.ReaderFailOnMissingInformer {
		t.Fatal("missing informer reads are allowed")
	}
	if options.DefaultTransform == nil {
		t.Fatal("default managed fields transform is nil")
	}

	found := false
	for obj, byObject := range options.ByObject {
		if _, ok := obj.(*metav1.PartialObjectMetadata); !ok {
			continue
		}
		found = true
		if byObject.Transform == nil {
			t.Fatal("secret transform is nil")
		}
		if len(byObject.Namespaces) != 1 {
			t.Fatalf("secret cache namespaces = %d, want 1", len(byObject.Namespaces))
		}
		if _, ok := byObject.Namespaces[config.GetUserSystemNamespace()]; !ok {
			t.Fatal("user system namespace is not cached for secrets")
		}
	}
	if !found {
		t.Fatal("secret cache options not found")
	}
}

func TestOptionsLimitNamespacedMetadataCaches(t *testing.T) {
	options := Options(nil)
	for _, required := range []client.Object{
		&corev1.ServiceAccount{},
		&userv1.Operationrequest{},
	} {
		found := false
		for obj, byObject := range options.ByObject {
			if reflect.TypeOf(obj) != reflect.TypeOf(required) {
				continue
			}
			found = true
			if len(byObject.Namespaces) != 1 {
				t.Fatalf("%T cache namespaces = %d, want 1", required, len(byObject.Namespaces))
			}
			if _, ok := byObject.Namespaces[config.GetUserSystemNamespace()]; !ok {
				t.Fatalf("%T cache is not limited to the user system namespace", required)
			}
		}
		if !found {
			t.Fatalf("%T cache options not found", required)
		}
	}
}

func TestOptionsLimitsClusterRoleBindingCacheToAdminBinding(t *testing.T) {
	options := Options(nil)
	var byObject ctrlcache.ByObject
	for obj, candidate := range options.ByObject {
		if reflect.TypeOf(obj) == reflect.TypeFor[*rbacv1.ClusterRoleBinding]() {
			byObject = candidate
			break
		}
	}
	if byObject.Field == nil {
		t.Fatal("cluster role binding cache options not found")
	}
	if byObject.Field.String() != "metadata.name="+config.AdminClusterRoleBindingName {
		t.Fatalf("cluster role binding field selector = %v", byObject.Field)
	}
}

func TestTransformNamespaceKeepsSecurityAndOwnerMetadata(t *testing.T) {
	namespace := &metav1.PartialObjectMetadata{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "ns-user-a",
			ResourceVersion:   "42",
			UID:               "namespace-a",
			CreationTimestamp: metav1.NewTime(time.Unix(100, 0)),
			Labels: map[string]string{
				config.PodSecurityLabelPrefix + "enforce": "baseline",
				userv1.UserLabelOwnerKey:                  "owner-a",
				"unused.example/label":                    "unused",
			},
			Annotations: map[string]string{
				userv1.UserAnnotationCreatorKey: "user-a",
				userv1.UserAnnotationOwnerKey:   "owner-a",
				"unused.example/annotation":     "unused",
			},
			ManagedFields: []metav1.ManagedFieldsEntry{{Manager: "test"}},
		},
	}

	transformed, err := transformNamespace(namespace)
	if err != nil {
		t.Fatalf("transform namespace: %v", err)
	}
	got, ok := transformed.(*metav1.PartialObjectMetadata)
	if !ok {
		t.Fatalf("transformed type = %T, want *metav1.PartialObjectMetadata", transformed)
	}
	wantLabels := map[string]string{
		config.PodSecurityLabelPrefix + "enforce": "baseline",
		userv1.UserLabelOwnerKey:                  "owner-a",
	}
	if !reflect.DeepEqual(got.Labels, wantLabels) {
		t.Fatalf("labels = %#v, want %#v", got.Labels, wantLabels)
	}
	wantAnnotations := map[string]string{
		userv1.UserAnnotationCreatorKey: "user-a",
		userv1.UserAnnotationOwnerKey:   "owner-a",
	}
	if !reflect.DeepEqual(got.Annotations, wantAnnotations) || len(got.ManagedFields) != 0 {
		t.Fatalf("unused namespace metadata was retained: %#v", got.ObjectMeta)
	}
	if got.UID != namespace.UID ||
		!got.CreationTimestamp.Equal(&namespace.CreationTimestamp) {
		t.Fatalf(
			"required namespace event metadata was not retained: uid=%q creation=%v",
			got.UID,
			got.CreationTimestamp,
		)
	}
}

func TestTransformSecretMetadataKeepsOnlyIndexMetadata(t *testing.T) {
	controller := true
	metadata := &metav1.PartialObjectMetadata{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "token-a",
			Namespace:         config.GetUserSystemNamespace(),
			ResourceVersion:   "42",
			CreationTimestamp: metav1.NewTime(time.Unix(100, 0)),
			Annotations: map[string]string{
				corev1.ServiceAccountNameKey: "user-a",
				"unused.example/key":         "large-value",
			},
			OwnerReferences: []metav1.OwnerReference{{
				APIVersion: userv1.GroupVersion.String(),
				Kind:       "User", Name: "user-a", UID: "user-a", Controller: &controller,
			}},
			ManagedFields: []metav1.ManagedFieldsEntry{{Manager: "test"}},
		},
	}
	metadata.SetGroupVersionKind(corev1.SchemeGroupVersion.WithKind("Secret"))

	transformed, err := transformSecretMetadata(metadata)
	if err != nil {
		t.Fatalf("transform secret: %v", err)
	}
	got, ok := transformed.(*metav1.PartialObjectMetadata)
	if !ok {
		t.Fatalf("transformed type = %T, want *metav1.PartialObjectMetadata", transformed)
	}
	if got.Name != metadata.Name ||
		got.Namespace != metadata.Namespace ||
		got.ResourceVersion != "42" ||
		!got.CreationTimestamp.Equal(&metadata.CreationTimestamp) {
		t.Fatalf("required metadata was not retained: %#v", got.ObjectMeta)
	}
	if got.Annotations[corev1.ServiceAccountNameKey] != "user-a" || len(got.Annotations) != 1 {
		t.Fatalf("secret index annotations = %#v", got.Annotations)
	}
	if !reflect.DeepEqual(got.OwnerReferences, metadata.OwnerReferences) ||
		len(got.Labels) != 0 || len(got.ManagedFields) != 0 {
		t.Fatalf("secret metadata projection = %#v", got.ObjectMeta)
	}
}

func TestTransformUserDropsOnlyLargeUnusedFields(t *testing.T) {
	rotateAt := metav1.Now()
	user := &userv1.User{
		ObjectMeta: metav1.ObjectMeta{
			Name:            "user-a",
			ResourceVersion: "42",
			Annotations: map[string]string{
				userv1.UserAnnotationOwnerKey: "owner-a",
				"unused.example/annotation":   "unused",
			},
			Labels: map[string]string{
				"user.sealos.io/status": "active",
				"user.sealos.io/type":   "Group",
				"unused.example/label":  "unused",
			},
			Finalizers:    []string{"sealos.io/user.finalizers"},
			ManagedFields: []metav1.ManagedFieldsEntry{{Manager: "test"}},
		},
		Spec: userv1.UserSpec{
			CSRExpirationSeconds: 600,
			KubeConfigRotateAt:   &rotateAt,
		},
		Status: userv1.UserStatus{
			Phase:                        userv1.UserActive,
			KubeConfig:                   "large-kubeconfig",
			ObservedCSRExpirationSeconds: 600,
			ObservedKubeConfigRotateAt:   &rotateAt,
			KubeConfigRefreshAt:          &rotateAt,
			ObservedKubeConfigSecretUID:  "secret-a",
			ObservedGeneration:           7,
			Conditions: []userv1.Condition{{
				Type:   userv1.Ready,
				Status: corev1.ConditionTrue,
			}},
		},
	}

	transformed, err := transformUser(user)
	if err != nil {
		t.Fatalf("transform user: %v", err)
	}
	got, ok := transformed.(*userv1.User)
	if !ok {
		t.Fatalf("transformed type = %T, want *v1.User", transformed)
	}
	if got.Status.KubeConfig != "" {
		t.Fatal("kubeconfig was retained")
	}
	if len(got.ManagedFields) != 0 {
		t.Fatal("managed fields were retained")
	}
	wantAnnotations := map[string]string{userv1.UserAnnotationOwnerKey: "owner-a"}
	wantLabels := map[string]string{
		"user.sealos.io/status": "active",
		"user.sealos.io/type":   "Group",
	}
	if got.Name != user.Name || got.ResourceVersion != user.ResourceVersion ||
		!reflect.DeepEqual(got.Annotations, wantAnnotations) ||
		!reflect.DeepEqual(got.Labels, wantLabels) ||
		!reflect.DeepEqual(got.Finalizers, user.Finalizers) ||
		!reflect.DeepEqual(got.Spec, user.Spec) {
		t.Fatalf("required user fields were not retained: %#v", got)
	}
	wantStatus := user.Status.DeepCopy()
	wantStatus.KubeConfig = ""
	if !reflect.DeepEqual(&got.Status, wantStatus) {
		t.Fatalf("status = %#v, want %#v", got.Status, *wantStatus)
	}
	if user.Status.KubeConfig == "" || len(user.ManagedFields) == 0 {
		t.Fatal("transform mutated the source user")
	}
	got.Spec.KubeConfigRotateAt.Time = got.Spec.KubeConfigRotateAt.Add(time.Hour)
	got.Status.Conditions[0].Message = "changed"
	if user.Spec.KubeConfigRotateAt.Equal(got.Spec.KubeConfigRotateAt) {
		t.Fatal("transform shared the kubeconfig rotate timestamp")
	}
	if user.Status.Conditions[0].Message == "changed" {
		t.Fatal("transform shared the conditions slice")
	}
}

func TestTransformMetadataKeepsOnlyEventFields(t *testing.T) {
	metadata := &metav1.PartialObjectMetadata{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "role-a",
			Namespace:         "ns-a",
			ResourceVersion:   "42",
			CreationTimestamp: metav1.NewTime(time.Unix(100, 0)),
			Annotations:       map[string]string{"unused.example/key": "unused"},
			Labels:            map[string]string{"unused.example/key": "unused"},
			Finalizers:        []string{"unused.example/finalizer"},
			ManagedFields:     []metav1.ManagedFieldsEntry{{Manager: "test"}},
			OwnerReferences:   []metav1.OwnerReference{{Name: "user-a"}},
		},
	}
	metadata.SetGroupVersionKind(corev1.SchemeGroupVersion.WithKind("ServiceAccount"))

	transformed, err := transformLicense(metadata)
	if err != nil {
		t.Fatalf("transform license metadata: %v", err)
	}
	got, ok := transformed.(*metav1.PartialObjectMetadata)
	if !ok {
		t.Fatalf("transformed type = %T, want *metav1.PartialObjectMetadata", transformed)
	}
	if got.GroupVersionKind() != metadata.GroupVersionKind() || got.Name != metadata.Name ||
		got.Namespace != metadata.Namespace || got.ResourceVersion != metadata.ResourceVersion ||
		!got.CreationTimestamp.Equal(&metadata.CreationTimestamp) {
		t.Fatalf("required event metadata was not retained: %#v", got)
	}
	if len(got.OwnerReferences) != 0 ||
		len(got.Annotations) != 0 ||
		len(got.Labels) != 0 ||
		len(got.Finalizers) != 0 ||
		len(got.ManagedFields) != 0 {
		t.Fatalf("unused metadata was retained: %#v", got.ObjectMeta)
	}

	for _, transform := range []func(any) (any, error){
		transformDeleteRequest,
		transformOperationrequest,
	} {
		keyOnly, err := transform(metadata)
		if err != nil {
			t.Fatalf("transform request metadata: %v", err)
		}
		gotKey, ok := keyOnly.(*metav1.PartialObjectMetadata)
		if !ok {
			t.Fatalf("key metadata type = %T, want *metav1.PartialObjectMetadata", keyOnly)
		}
		if len(gotKey.OwnerReferences) != 0 || len(gotKey.Annotations) != 0 {
			t.Fatalf("key-only ownership metadata was retained: %#v", gotKey.ObjectMeta)
		}
		if !gotKey.CreationTimestamp.Equal(&metadata.CreationTimestamp) {
			t.Fatalf("key-only event creation timestamp = %v", gotKey.CreationTimestamp)
		}
	}
}

func TestTransformOwnerObjectsKeepsReconcileFields(t *testing.T) {
	controller := true
	owner := metav1.OwnerReference{
		APIVersion: userv1.GroupVersion.String(),
		Kind:       "User",
		Name:       "alice",
		UID:        "user-a",
		Controller: &controller,
	}
	annotations := map[string]string{
		userv1.UserAnnotationCreatorKey: "alice",
		userv1.UserAnnotationOwnerKey:   "owner-a",
		"unused.example/key":            "unused",
	}

	role, err := transformRole(&rbacv1.Role{
		ObjectMeta: metav1.ObjectMeta{
			Name:            "Owner",
			Namespace:       "ns-alice",
			ResourceVersion: "42",
			Generation:      7,
			CreationTimestamp: metav1.NewTime(
				time.Unix(100, 0),
			),
			Finalizers:      []string{"unused.example/finalizer"},
			Annotations:     annotations,
			OwnerReferences: []metav1.OwnerReference{owner},
		},
		Rules: []rbacv1.PolicyRule{{
			APIGroups: []string{"*"},
			Resources: []string{"pods"},
			Verbs:     []string{"get"},
		}},
	})
	if err != nil {
		t.Fatalf("transform role: %v", err)
	}
	gotRole := transformedAs[*rbacv1.Role](t, role)
	wantRoleHash := hash.HashToString([]rbacv1.PolicyRule{{
		APIGroups: []string{"*"}, Resources: []string{"pods"}, Verbs: []string{"get"},
	}})
	if len(gotRole.Rules) != 0 ||
		gotRole.Annotations[config.RoleRulesHashAnnotation] != wantRoleHash ||
		!reflect.DeepEqual(gotRole.OwnerReferences, []metav1.OwnerReference{owner}) ||
		len(gotRole.Annotations) != 3 {
		t.Fatalf("role reconcile fields were not retained: %#v", gotRole)
	}
	if len(gotRole.Labels) != 0 || len(gotRole.ManagedFields) != 0 {
		t.Fatalf("role unused metadata was retained: %#v", gotRole.ObjectMeta)
	}
	if gotRole.ResourceVersion != "42" || gotRole.Generation != 0 ||
		!gotRole.CreationTimestamp.Equal(&metav1.Time{Time: time.Unix(100, 0)}) ||
		len(gotRole.Finalizers) != 0 {
		t.Fatalf("role non-reconcile metadata was retained: %#v", gotRole.ObjectMeta)
	}

	roleBinding, err := transformRoleBinding(&rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Annotations:     annotations,
			OwnerReferences: []metav1.OwnerReference{owner},
		},
		RoleRef: rbacv1.RoleRef{APIGroup: rbacv1.GroupName, Kind: "Role", Name: "Owner"},
		Subjects: []rbacv1.Subject{
			{Kind: "ServiceAccount", Name: "alice", Namespace: config.GetUserSystemNamespace()},
		},
	})
	if err != nil {
		t.Fatalf("transform role binding: %v", err)
	}
	gotRoleBinding := transformedAs[*rbacv1.RoleBinding](t, roleBinding)
	if gotRoleBinding.RoleRef.Name != "" || len(gotRoleBinding.Subjects) != 0 ||
		gotRoleBinding.Annotations[RoleBindingSpecHashAnnotation] != RoleBindingSpecHash(
			rbacv1.RoleRef{APIGroup: rbacv1.GroupName, Kind: "Role", Name: "Owner"},
			[]rbacv1.Subject{{
				Kind:      "ServiceAccount",
				Name:      "alice",
				Namespace: config.GetUserSystemNamespace(),
			}},
		) || !reflect.DeepEqual(gotRoleBinding.OwnerReferences, []metav1.OwnerReference{owner}) {
		t.Fatalf("role binding projection was not compact: %#v", gotRoleBinding)
	}

	clusterRoleBinding, err := transformClusterRoleBinding(&rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Annotations:     annotations,
			OwnerReferences: []metav1.OwnerReference{owner},
		},
		RoleRef: rbacv1.RoleRef{
			APIGroup: rbacv1.GroupName,
			Kind:     "ClusterRole",
			Name:     "cluster-admin",
		},
		Subjects: []rbacv1.Subject{
			{Kind: "ServiceAccount", Name: "alice", Namespace: config.GetUserSystemNamespace()},
		},
	})
	if err != nil {
		t.Fatalf("transform cluster role binding: %v", err)
	}
	gotClusterRoleBinding := transformedAs[*rbacv1.ClusterRoleBinding](t, clusterRoleBinding)
	if gotClusterRoleBinding.RoleRef.Name != "" || len(gotClusterRoleBinding.Subjects) != 0 ||
		gotClusterRoleBinding.Annotations[RoleBindingSpecHashAnnotation] != RoleBindingSpecHash(
			rbacv1.RoleRef{APIGroup: rbacv1.GroupName, Kind: "ClusterRole", Name: "cluster-admin"},
			[]rbacv1.Subject{{
				Kind:      "ServiceAccount",
				Name:      "alice",
				Namespace: config.GetUserSystemNamespace(),
			}},
		) {
		t.Fatalf("cluster role binding projection was not compact: %#v", gotClusterRoleBinding)
	}

	serviceAccount, err := transformServiceAccount(&corev1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{
			Annotations:     annotations,
			OwnerReferences: []metav1.OwnerReference{owner},
		},
		Secrets: []corev1.ObjectReference{{Name: "token-alice"}},
	})
	if err != nil {
		t.Fatalf("transform service account: %v", err)
	}
	gotServiceAccount := transformedAs[*corev1.ServiceAccount](t, serviceAccount)
	if !reflect.DeepEqual(
		gotServiceAccount.Secrets,
		[]corev1.ObjectReference{{Name: "token-alice"}},
	) {
		t.Fatalf("service account secrets were not retained: %#v", gotServiceAccount.Secrets)
	}
}

func TestTransformOwnerObjectsDropsSpecForUnownedObjects(t *testing.T) {
	role, err := transformRole(&rbacv1.Role{
		ObjectMeta: metav1.ObjectMeta{Name: "unrelated"},
		Rules: []rbacv1.PolicyRule{
			{APIGroups: []string{"*"}, Resources: []string{"secrets"}, Verbs: []string{"*"}},
		},
	})
	if err != nil {
		t.Fatalf("transform unrelated role: %v", err)
	}
	if got := transformedAs[*rbacv1.Role](t, role); len(got.Rules) != 0 {
		t.Fatalf("unowned role rules were retained: %#v", got.Rules)
	}

	roleBinding, err := transformRoleBinding(&rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{Name: "unrelated"},
		RoleRef:    rbacv1.RoleRef{APIGroup: rbacv1.GroupName, Kind: "Role", Name: "admin"},
		Subjects:   []rbacv1.Subject{{Kind: "Group", Name: "admins"}},
	})
	if err != nil {
		t.Fatalf("transform unrelated role binding: %v", err)
	}
	gotRoleBinding := transformedAs[*rbacv1.RoleBinding](t, roleBinding)
	if gotRoleBinding.RoleRef.Name != "" || len(gotRoleBinding.Subjects) != 0 {
		t.Fatalf("unowned role binding spec was retained: %#v", gotRoleBinding)
	}

	legacyRoleBinding, err := transformRoleBinding(&rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Annotations: map[string]string{
				userv1.UserAnnotationOwnerKey: "alice",
				"unused.example/key":          "unused",
			},
		},
		Subjects: []rbacv1.Subject{{Kind: "User", Name: "alice"}},
	})
	if err != nil {
		t.Fatalf("transform legacy role binding: %v", err)
	}
	gotLegacyRoleBinding := transformedAs[*rbacv1.RoleBinding](t, legacyRoleBinding)
	if gotLegacyRoleBinding.Annotations[userv1.UserAnnotationOwnerKey] != "alice" ||
		len(gotLegacyRoleBinding.Annotations) != 1 ||
		len(gotLegacyRoleBinding.Subjects) != 0 {
		t.Fatalf("legacy role binding projection lost adapter metadata: %#v", gotLegacyRoleBinding)
	}
}

func TestTransformUserInfersLegacyKubeConfigRefresh(t *testing.T) {
	expiresAt := time.Now().Add(time.Hour).Unix()
	payload := base64.RawURLEncoding.EncodeToString(
		[]byte(`{"exp":` + strconv.FormatInt(expiresAt, 10) + `}`),
	)
	data, err := clientcmd.Write(clientcmdapi.Config{AuthInfos: map[string]*clientcmdapi.AuthInfo{
		"alice": {Token: "header." + payload + ".signature"},
	}})
	if err != nil {
		t.Fatalf("write legacy kubeconfig: %v", err)
	}
	user := &userv1.User{ObjectMeta: metav1.ObjectMeta{Name: "alice"}, Status: userv1.UserStatus{
		KubeConfig: string(data),
	}}
	transformed, err := transformUser(user)
	if err != nil {
		t.Fatalf("transform legacy user: %v", err)
	}
	refreshAt := transformedAs[*userv1.User](t, transformed).Status.KubeConfigRefreshAt
	if refreshAt == nil || refreshAt.Time.Before(time.Now().Add(40*time.Minute)) ||
		refreshAt.After(time.Now().Add(50*time.Minute)) {
		t.Fatalf("legacy refresh time = %v, want about 48 minutes from now", refreshAt)
	}
}

func TestTransformUserUsesTokenNotBeforeForStableRefresh(t *testing.T) {
	issuedAt := time.Now().Add(-10 * time.Minute).Truncate(time.Second)
	expiresAt := issuedAt.Add(time.Hour)
	payload := base64.RawURLEncoding.EncodeToString(
		[]byte(`{"exp":` + strconv.FormatInt(expiresAt.Unix(), 10) +
			`,"nbf":` + strconv.FormatInt(issuedAt.Unix(), 10) + `}`),
	)
	data, err := clientcmd.Write(clientcmdapi.Config{AuthInfos: map[string]*clientcmdapi.AuthInfo{
		"alice": {Token: "header." + payload + ".signature"},
	}})
	if err != nil {
		t.Fatalf("write legacy kubeconfig: %v", err)
	}
	user := &userv1.User{ObjectMeta: metav1.ObjectMeta{Name: "alice"}, Status: userv1.UserStatus{
		KubeConfig: string(data),
	}}
	transformed, err := transformUser(user)
	if err != nil {
		t.Fatalf("transform legacy user: %v", err)
	}
	refreshAt := transformedAs[*userv1.User](t, transformed).Status.KubeConfigRefreshAt
	want := metav1.NewTime(issuedAt.Add(48 * time.Minute))
	if refreshAt == nil || !refreshAt.Equal(&want) {
		t.Fatalf("legacy refresh time = %v, want %v", refreshAt, want)
	}
}

func TestTransformUserInfersLegacyRefreshFromObservedRotation(t *testing.T) {
	rotation := metav1.NewTime(time.Now().Add(-time.Hour))
	data, err := clientcmd.Write(clientcmdapi.Config{AuthInfos: map[string]*clientcmdapi.AuthInfo{
		"alice": {Token: "legacy-token"},
	}})
	if err != nil {
		t.Fatalf("write legacy kubeconfig: %v", err)
	}
	user := &userv1.User{ObjectMeta: metav1.ObjectMeta{Name: "alice"}, Spec: userv1.UserSpec{
		CSRExpirationSeconds: 10 * 60,
	}, Status: userv1.UserStatus{
		KubeConfig:                   string(data),
		ObservedCSRExpirationSeconds: 10 * 60,
		ObservedKubeConfigRotateAt:   &rotation,
	}}
	transformed, err := transformUser(user)
	if err != nil {
		t.Fatalf("transform legacy user: %v", err)
	}
	refreshAt := transformedAs[*userv1.User](t, transformed).Status.KubeConfigRefreshAt
	want := metav1.NewTime(
		rotation.Add(time.Duration(userv1.DefaultCSRExpirationSeconds) * time.Second * 8 / 10),
	)
	if refreshAt == nil || !refreshAt.Equal(&want) {
		t.Fatalf("legacy fallback refresh time = %v, want %v", refreshAt, want)
	}
}

func TestTransformUserInfersLegacyRefreshWithDefaultExpiration(t *testing.T) {
	rotation := metav1.NewTime(time.Now().Add(-time.Hour))
	data, err := clientcmd.Write(clientcmdapi.Config{AuthInfos: map[string]*clientcmdapi.AuthInfo{
		"alice": {Token: "legacy-token"},
	}})
	if err != nil {
		t.Fatalf("write legacy kubeconfig: %v", err)
	}
	user := &userv1.User{ObjectMeta: metav1.ObjectMeta{Name: "alice"}, Status: userv1.UserStatus{
		KubeConfig:                 string(data),
		ObservedKubeConfigRotateAt: &rotation,
	}}
	transformed, err := transformUser(user)
	if err != nil {
		t.Fatalf("transform legacy user: %v", err)
	}
	refreshAt := transformedAs[*userv1.User](t, transformed).Status.KubeConfigRefreshAt
	want := metav1.NewTime(
		rotation.Add(time.Duration(userv1.DefaultCSRExpirationSeconds) * time.Second * 8 / 10),
	)
	if refreshAt == nil || !refreshAt.Equal(&want) {
		t.Fatalf("legacy refresh time = %v, want %v", refreshAt, want)
	}
}

func TestTransformUserInfersLegacyRefreshWhenAuthInfoIsUnrecognized(t *testing.T) {
	rotation := metav1.NewTime(time.Now().Add(-time.Hour))
	data, err := clientcmd.Write(clientcmdapi.Config{AuthInfos: map[string]*clientcmdapi.AuthInfo{
		"webhook-user": {},
	}})
	if err != nil {
		t.Fatalf("write legacy kubeconfig: %v", err)
	}
	user := &userv1.User{ObjectMeta: metav1.ObjectMeta{Name: "alice"}, Spec: userv1.UserSpec{
		CSRExpirationSeconds: 10 * 60,
	}, Status: userv1.UserStatus{
		KubeConfig:                   string(data),
		ObservedCSRExpirationSeconds: 10 * 60,
		ObservedKubeConfigRotateAt:   &rotation,
	}}
	transformed, err := transformUser(user)
	if err != nil {
		t.Fatalf("transform legacy user: %v", err)
	}
	refreshAt := transformedAs[*userv1.User](t, transformed).Status.KubeConfigRefreshAt
	want := metav1.NewTime(
		rotation.Add(time.Duration(userv1.DefaultCSRExpirationSeconds) * time.Second * 8 / 10),
	)
	if refreshAt == nil || !refreshAt.Equal(&want) {
		t.Fatalf("legacy refresh time = %v, want %v", refreshAt, want)
	}
}

func TestTransformUserDoesNotInferRefreshFromMalformedKubeConfig(t *testing.T) {
	rotation := metav1.NewTime(time.Now().Add(-time.Hour))
	for _, kubeConfig := range []string{
		"not: [valid",
		string(mustWriteKubeConfig(t, &clientcmdapi.AuthInfo{
			ClientCertificateData: []byte("not a certificate"),
		})),
		string(mustWriteKubeConfig(t, &clientcmdapi.AuthInfo{
			ClientCertificateData: pem.EncodeToMemory(&pem.Block{
				Type: "CERTIFICATE", Bytes: []byte("not certificate DER"),
			}),
		})),
	} {
		user := &userv1.User{
			ObjectMeta: metav1.ObjectMeta{Name: "alice"},
			Status: userv1.UserStatus{
				KubeConfig:                 kubeConfig,
				ObservedKubeConfigRotateAt: &rotation,
			},
		}
		transformed, err := transformUser(user)
		if err != nil {
			t.Fatalf("transform malformed user: %v", err)
		}
		transformedUser := transformedAs[*userv1.User](t, transformed)
		if refreshAt := transformedUser.Status.KubeConfigRefreshAt; refreshAt != nil {
			t.Fatalf("malformed kubeconfig refresh time = %v, want nil", refreshAt)
		}
	}
}

func mustWriteKubeConfig(t *testing.T, authInfo *clientcmdapi.AuthInfo) []byte {
	t.Helper()
	data, err := clientcmd.Write(clientcmdapi.Config{AuthInfos: map[string]*clientcmdapi.AuthInfo{
		"alice": authInfo,
	}})
	if err != nil {
		t.Fatalf("write kubeconfig: %v", err)
	}
	return data
}

func TestUncachedObjects(t *testing.T) {
	types := make(map[reflect.Type]struct{})
	for _, obj := range UncachedObjects() {
		types[reflect.TypeOf(obj)] = struct{}{}
	}
	for _, required := range []client.Object{
		&corev1.Namespace{},
		&corev1.Secret{},
		&corev1.ServiceAccount{},
	} {
		if _, ok := types[reflect.TypeOf(required)]; !ok {
			t.Fatalf("%T reads are still cache-backed", required)
		}
	}
	if _, ok := types[reflect.TypeFor[*userv1.User]()]; ok {
		t.Fatal("user reads bypass the projected cache")
	}
}
