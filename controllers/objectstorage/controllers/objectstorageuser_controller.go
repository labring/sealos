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

package controllers

import (
	"bytes"
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/go-logr/logr"
	"github.com/minio/madmin-go/v3"
	"github.com/minio/minio-go/v7"

	myObjectStorage "github.com/labring/sealos/controllers/pkg/objectstorage"
	"github.com/labring/sealos/controllers/pkg/utils/env"

	objectstoragev1 "github/labring/sealos/controllers/objectstorage/api/v1"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/rand"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// OS = object storage, OSU = object storage user

// ObjectStorageUserReconciler reconciles a ObjectStorageUser object
type ObjectStorageUserReconciler struct {
	client.Client
	Scheme            *runtime.Scheme
	Logger            logr.Logger
	OSAdminClient     *madmin.AdminClient
	OSClient          *minio.Client
	OSNamespace       string
	OSAdminSecret     string
	InternalEndpoint  string
	ExternalEndpoint  string
	OSUDetectionCycle time.Duration
	QuotaEnabled      bool
}

const (
	UserNormalGroup       = "userNormal"
	UserDenyWriteGroup    = "userDenyWrite"
	AccessKey             = "CONSOLE_ACCESS_KEY"
	SecretKey             = "CONSOLE_SECRET_KEY"
	OSUDetectionCycleEnv  = "OSUDetectionCycleSeconds"
	OSInternalEndpointEnv = "OSInternalEndpoint"
	OSExternalEndpointEnv = "OSExternalEndpoint"
	OSNamespace           = "OSNamespace"
	OSAdminSecret         = "OSAdminSecret"
	QuotaEnabled          = "QuotaEnabled"

	OSKeySecret          = "object-storage-key"
	OSKeySecretAccessKey = "accessKey"
	OSKeySecretSecretKey = "secretKey"
	OSKeySecretInternal  = "internal"
	OSKeySecretExternal  = "external"
	OSKeySecretBucket    = "bucket"

	ResourceQuotaPrefix       = "quota-"
	ResourceObjectStorageSize = "objectstorage/size"
)

//+kubebuilder:rbac:groups=objectstorage.sealos.io,resources=objectstorageusers,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=objectstorage.sealos.io,resources=objectstorageusers/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=objectstorage.sealos.io,resources=objectstorageusers/finalizers,verbs=update
//+kubebuilder:rbac:groups="",resources=secrets,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=resourcequotas,verbs=get;list;watch;create;update;patch;delete

func (r *ObjectStorageUserReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	username := req.Name
	userNamespace := req.Namespace

	// check object storage user name if correct or not
	if username != strings.Split(userNamespace, "-")[1] {
		r.Logger.V(1).Info("object storage user name is not correspond to the namespace", "name", username, "namespace", userNamespace)
		return ctrl.Result{}, nil
	}

	// new OSAdminClient and OSClient
	if r.OSAdminClient == nil || r.OSClient == nil {
		secret := &corev1.Secret{}
		if err := r.Get(ctx, client.ObjectKey{Name: r.OSAdminSecret, Namespace: r.OSNamespace}, secret); err != nil {
			r.Logger.Error(err, "failed to get secret", "name", r.OSAdminSecret, "namespace", r.OSNamespace)
			return ctrl.Result{}, err
		}

		endpoint := r.InternalEndpoint
		accessKey := string(secret.Data[AccessKey])
		secretKey := string(secret.Data[SecretKey])

		var err error
		if r.OSAdminClient == nil {
			if r.OSAdminClient, err = objectstoragev1.NewOSAdminClient(endpoint, accessKey, secretKey); err != nil {
				r.Logger.Error(err, "failed to new object storage admin client")
				return ctrl.Result{}, err
			}
		}

		if r.OSClient == nil {
			if r.OSClient, err = objectstoragev1.NewOSClient(endpoint, accessKey, secretKey); err != nil {
				r.Logger.Error(err, "failed to new object storage client")
				return ctrl.Result{}, err
			}
		}
	}

	user := &objectstoragev1.ObjectStorageUser{}
	if err := r.Get(ctx, client.ObjectKey{Name: username, Namespace: userNamespace}, user); err != nil {
		if !errors.IsNotFound(err) {
			r.Logger.Error(err, "failed to get object storage user", "name", username, "namespace", userNamespace)
			return ctrl.Result{}, err
		}

		if err := r.deleteObjectStorageUser(ctx, username, userNamespace); err != nil {
			r.Logger.Error(err, "failed to delete object storage user", "name", username, "namespace", userNamespace)
			return ctrl.Result{}, err
		}

		return ctrl.Result{}, nil
	}

	resourceQuota := &corev1.ResourceQuota{}
	if err := r.Get(ctx, client.ObjectKey{Name: ResourceQuotaPrefix + userNamespace, Namespace: userNamespace}, resourceQuota); err != nil {
		r.Logger.Error(err, "failed to get resource quota", "name", ResourceQuotaPrefix+userNamespace, "namespace", userNamespace)
		return ctrl.Result{}, err
	}

	quota := resourceQuota.Spec.Hard.Name(ResourceObjectStorageSize, resource.BinarySI)

	updated := r.initObjectStorageUser(user, username, quota.Value())

	accessKey := user.Status.AccessKey
	secretKey := user.Status.SecretKey

	// get object storage user list
	users, err := r.OSAdminClient.ListUsers(ctx)
	if err != nil {
		r.Logger.Error(err, "failed to list object storage users")
		return ctrl.Result{}, err
	}

	if _, ok := users[user.Name]; !ok {
		if err := r.NewObjectStorageUser(ctx, accessKey, secretKey); err != nil {
			r.Logger.Error(err, "failed to new object storage user", "name", accessKey)
			return ctrl.Result{}, err
		}
	}

	secret := &corev1.Secret{}
	if err := r.Get(ctx, client.ObjectKey{Name: OSKeySecret, Namespace: userNamespace}, secret); err != nil {
		if !errors.IsNotFound(err) {
			r.Logger.Error(err, "failed to get object storage key secret", "name", OSKeySecret, "namespace", userNamespace)
			return ctrl.Result{}, err
		}

		if err := r.newObjectStorageKeySecret(ctx, secret, user, accessKey, secretKey); err != nil {
			r.Logger.Error(err, "failed to new object storage key secret", "name", OSKeySecret, "namespace", userNamespace)
			return ctrl.Result{}, err
		}
	}

	keySecretUpdated := r.initObjectStorageKeySecret(secret, accessKey, secretKey)

	if keySecretUpdated {
		if err := r.Update(ctx, secret); err != nil {
			r.Logger.Error(err, "failed to update object storage key secret", "name", OSKeySecret, "namespace", userNamespace)
		}
	}

	// check whether the space used exceeds the quota
	size, objectsCount, err := myObjectStorage.GetUserObjectStorageSize(r.OSClient, user.Name)
	if err != nil {
		r.Logger.Error(err, "failed to get user space used", "name", username, "namespace", userNamespace)
		return ctrl.Result{}, err
	}

	if user.Status.Size != size {
		user.Status.Size = size
		updated = true
	}

	if user.Status.ObjectsCount != objectsCount {
		user.Status.ObjectsCount = objectsCount
		updated = true
	}

	if updated {
		if err := r.Status().Update(ctx, user); err != nil {
			r.Logger.Error(err, "failed to update status", "name", username, "namespace", userNamespace)
			return ctrl.Result{}, err
		}
	}

	r.Logger.V(1).Info("[user] user info", "name", user.Name, "quota", user.Status.Quota, "size", size, "objectsCount", user.Status.ObjectsCount)

	if r.QuotaEnabled && size > user.Status.Quota {
		if err := r.addUserToGroup(ctx, accessKey, UserDenyWriteGroup); err != nil {
			r.Logger.Error(err, "failed to add user to userDenyWrite group")
			return ctrl.Result{}, err
		}
	} else {
		if err := r.removeUserFromGroup(ctx, accessKey, UserDenyWriteGroup); err != nil {
			r.Logger.Error(err, "failed to remove user from userDenyWrite group")
			return ctrl.Result{}, err
		}
	}

	return ctrl.Result{Requeue: true, RequeueAfter: r.OSUDetectionCycle}, nil
}

func (r *ObjectStorageUserReconciler) NewObjectStorageUser(ctx context.Context, accessKey, secretKey string) error {
	if err := r.OSAdminClient.AddUser(ctx, accessKey, secretKey); err != nil {
		r.Logger.Error(err, "failed to create object storage user")
		return err
	}

	if err := r.addUserToGroup(ctx, accessKey, UserNormalGroup); err != nil {
		r.Logger.Error(err, "failed to add user to userNormal group")
		return err
	}

	return nil
}

func (r *ObjectStorageUserReconciler) newObjectStorageKeySecret(ctx context.Context, secret *corev1.Secret, user *objectstoragev1.ObjectStorageUser, accessKey, secretKey string) error {
	secret.SetName(OSKeySecret)
	secret.SetNamespace(user.Namespace)

	secret.Data = make(map[string][]byte)
	secret.Data[OSKeySecretAccessKey] = []byte(accessKey)
	secret.Data[OSKeySecretSecretKey] = []byte(secretKey)
	secret.Data[OSKeySecretInternal] = []byte(r.InternalEndpoint)
	secret.Data[OSKeySecretExternal] = []byte(r.ExternalEndpoint)

	reference := metav1.OwnerReference{
		APIVersion:         user.APIVersion,
		Kind:               user.Kind,
		Name:               user.Name,
		UID:                user.UID,
		Controller:         nil,
		BlockOwnerDeletion: nil,
	}
	refList := make([]metav1.OwnerReference, 0)
	refList = append(refList, reference)
	secret.SetOwnerReferences(refList)

	return r.Create(ctx, secret)
}

func (r *ObjectStorageUserReconciler) addUserToGroup(ctx context.Context, user string, group string) error {
	newGroupDesc := madmin.GroupAddRemove{}

	groupDesc, err := r.OSAdminClient.GetGroupDescription(ctx, group)
	if err != nil {
		r.Logger.Error(err, "failed to get object storage group description", "group", group)
		return err
	}
	member := []string{user}
	newGroupDesc.Group = groupDesc.Name
	newGroupDesc.Members = member
	newGroupDesc.Status = madmin.GroupStatus(groupDesc.Status)

	var isExist = false
	for _, member := range groupDesc.Members {
		if user == member {
			isExist = true
			break
		}
	}

	if !isExist {
		if err := r.OSAdminClient.UpdateGroupMembers(ctx, newGroupDesc); err != nil {
			r.Logger.Error(err, "failed to add user to group", "user", user, "group", group)
			return err
		}
	}

	return nil
}

func (r *ObjectStorageUserReconciler) removeUserFromGroup(ctx context.Context, user string, group string) error {
	newGroupDesc := madmin.GroupAddRemove{}

	groupDesc, err := r.OSAdminClient.GetGroupDescription(ctx, group)
	if err != nil {
		r.Logger.Error(err, "failed to get object storage group description", "group", group)
		return err
	}

	member := []string{user}
	newGroupDesc.Group = groupDesc.Name
	newGroupDesc.Members = member
	newGroupDesc.Status = madmin.GroupStatus(groupDesc.Status)
	newGroupDesc.IsRemove = true

	if err := r.OSAdminClient.UpdateGroupMembers(ctx, newGroupDesc); err != nil {
		r.Logger.Error(err, "failed to remove user from userDenyWrite group", "user", user)
		return err
	}

	return nil
}

func (r *ObjectStorageUserReconciler) deleteObjectStorageUser(ctx context.Context, username, userNamespace string) error {
	// delete all bucket cr of user
	if err := r.Client.DeleteAllOf(ctx, &objectstoragev1.ObjectStorageBucket{}, client.InNamespace(userNamespace)); client.IgnoreNotFound(err) != nil {
		r.Logger.Error(err, "failed to delete all bucket of user", "name", username, "namespace", userNamespace)
		return err
	}

	users, err := r.OSAdminClient.ListUsers(ctx)
	if err != nil {
		r.Logger.Error(err, "failed to list object storage users")
		return err
	}

	// if user is already remove return nil
	if _, ok := users[username]; !ok {
		return nil
	}

	// remove object storage user
	if err := r.OSAdminClient.RemoveUser(ctx, username); err != nil {
		r.Logger.Error(err, "failed to remove object storage user", "name", username)
		return err
	}

	return nil
}

func (r *ObjectStorageUserReconciler) initObjectStorageUser(user *objectstoragev1.ObjectStorageUser, username string, quota int64) bool {
	var updated = false

	if user.Status.Quota != quota {
		user.Status.Quota = quota
		updated = true
	}

	if user.Status.AccessKey != username {
		user.Status.AccessKey = username
		updated = true
	}

	if user.Status.SecretKey == "" {
		user.Status.SecretKey = rand.String(16)
		updated = true
	}

	if user.Status.Internal != r.InternalEndpoint {
		user.Status.Internal = r.InternalEndpoint
		updated = true
	}

	if user.Status.External != r.ExternalEndpoint {
		user.Status.External = r.ExternalEndpoint
		updated = true
	}

	return updated
}

func (r *ObjectStorageUserReconciler) initObjectStorageKeySecret(secret *corev1.Secret, accessKey, secretKey string) bool {
	var updated = false

	if !bytes.Equal(secret.Data[OSKeySecretAccessKey], []byte(accessKey)) {
		secret.Data[OSKeySecretAccessKey] = []byte(accessKey)
		updated = true
	}

	if !bytes.Equal(secret.Data[OSKeySecretSecretKey], []byte(secretKey)) {
		secret.Data[OSKeySecretSecretKey] = []byte(secretKey)
		updated = true
	}

	if !bytes.Equal(secret.Data[OSKeySecretInternal], []byte(r.InternalEndpoint)) {
		secret.Data[OSKeySecretInternal] = []byte(r.InternalEndpoint)
		updated = true
	}

	if !bytes.Equal(secret.Data[OSKeySecretExternal], []byte(r.ExternalEndpoint)) {
		secret.Data[OSKeySecretExternal] = []byte(r.ExternalEndpoint)
		updated = true
	}

	return updated
}

// SetupWithManager sets up the controller with the Manager.
func (r *ObjectStorageUserReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.Logger = ctrl.Log.WithName("object-storage-user-controller")
	r.Logger.V(1).Info("starting object storage user controller")

	oSUDetectionCycleSecond := env.GetInt64EnvWithDefault(OSUDetectionCycleEnv, 180)
	r.OSUDetectionCycle = time.Duration(oSUDetectionCycleSecond) * time.Second

	internalEndpoint := env.GetEnvWithDefault(OSInternalEndpointEnv, "")
	r.InternalEndpoint = internalEndpoint

	externalEndpoint := env.GetEnvWithDefault(OSExternalEndpointEnv, "")
	r.ExternalEndpoint = externalEndpoint

	oSNamespace := env.GetEnvWithDefault(OSNamespace, "")
	r.OSNamespace = oSNamespace

	oSAdminSecret := env.GetEnvWithDefault(OSAdminSecret, "")
	r.OSAdminSecret = oSAdminSecret

	if internalEndpoint == "" || externalEndpoint == "" || oSNamespace == "" || oSAdminSecret == "" {
		return fmt.Errorf("failed to get the endpoint or namespace or admin secret env of object storage")
	}

	quotaEnabled := env.GetBoolWithDefault(QuotaEnabled, true)
	r.QuotaEnabled = quotaEnabled

	return ctrl.NewControllerManagedBy(mgr).
		For(&objectstoragev1.ObjectStorageUser{}).
		Complete(r)
}
