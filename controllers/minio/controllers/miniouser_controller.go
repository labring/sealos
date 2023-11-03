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
	"context"
	"strings"
	"time"

	"github.com/go-logr/logr"
	myminio "github.com/labring/sealos/controllers/pkg/minio"
	"github.com/labring/sealos/controllers/pkg/utils/env"
	"github.com/labring/sealos/pkg/utils/rand"
	"github.com/minio/madmin-go/v3"
	"github.com/minio/minio-go/v7"

	miniov1 "github/labring/sealos/controllers/minio/api/v1"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// MinioUserReconciler reconciles a MinioUser object
type MinioUserReconciler struct {
	client.Client
	Scheme                  *runtime.Scheme
	Logger                  logr.Logger
	MinioAdminClient        *madmin.AdminClient
	MinioClient             *minio.Client
	MinioUserDetectionCycle time.Duration
	MinioInternalEndpoint   string
	MinioExternalEndpoint   string
}

const (
	MinioAdminSecret           = "minio-sealos-user-0"
	MinioNamespace             = "minio-system"
	MinioUserSecret            = "minio-sealos-user-secret"
	UserNormalGroup            = "userNormal"
	UserDenyWriteGroup         = "userDenyWrite"
	AccessKey                  = "CONSOLE_ACCESS_KEY"
	SecretKey                  = "CONSOLE_SECRET_KEY"
	MinioUserDetectionCycleEnv = "MinioUserDetectionCycleSeconds"
	MinioInternalEndpointEnv   = "MinioInternalEndpoint"
	MinioExternalEndpointEnv   = "MinioExternalEndpoint"
)

//+kubebuilder:rbac:groups=minio.sealos.io,resources=miniousers,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=minio.sealos.io,resources=miniousers/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=minio.sealos.io,resources=miniousers/finalizers,verbs=update
//+kubebuilder:rbac:groups="",resources=secrets,verbs=get;list;watch;create;update;patch;delete

func (r *MinioUserReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	username := req.Name
	userNamespace := req.Namespace

	// check minio username if correct or not
	if username != strings.Split(userNamespace, "-")[1] {
		r.Logger.V(1).Info("minio username is not correspond to the namespace", "name", username, "namespace", userNamespace)
		return ctrl.Result{}, nil
	}

	// new MinioAdminClient and MinioClient
	if r.MinioAdminClient == nil || r.MinioClient == nil {
		secret := &corev1.Secret{}
		if err := r.Get(ctx, client.ObjectKey{Name: MinioAdminSecret, Namespace: MinioNamespace}, secret); err != nil {
			r.Logger.Error(err, "failed to get secret", "name", MinioAdminSecret, "namespace", MinioNamespace)
			return ctrl.Result{}, err
		}

		endpoint := r.MinioInternalEndpoint
		accessKey := string(secret.Data[AccessKey])
		secretKey := string(secret.Data[SecretKey])

		var err error
		if r.MinioAdminClient == nil {
			if r.MinioAdminClient, err = miniov1.NewMinioAdminClient(endpoint, accessKey, secretKey); err != nil {
				r.Logger.Error(err, "failed to new minio admin client")
				return ctrl.Result{}, err
			}
		}

		if r.MinioClient == nil {
			if r.MinioClient, err = miniov1.NewMinioClient(endpoint, accessKey, secretKey); err != nil {
				r.Logger.Error(err, "failed to new minio client")
				return ctrl.Result{}, err
			}
		}
	}

	minioUser := &miniov1.MinioUser{}
	if err := r.Get(ctx, client.ObjectKey{Name: username, Namespace: userNamespace}, minioUser); err != nil {
		if !errors.IsNotFound(err) {
			r.Logger.Error(err, "failed to get minio user", "name", username, "namespace", userNamespace)
			return ctrl.Result{}, err
		}

		if err := r.deleteMinioUser(ctx, username, userNamespace); err != nil {
			r.Logger.Error(err, "failed to delete minio user", "name", username)
			return ctrl.Result{}, err
		}

		return ctrl.Result{}, nil
	}

	updated := r.initMinioUser(minioUser, username)

	accessKey := minioUser.Status.AccessKey
	secretKey := minioUser.Status.SecretKey

	// get minio user list
	users, err := r.MinioAdminClient.ListUsers(ctx)
	if err != nil {
		r.Logger.Error(err, "failed to list minio users")
		return ctrl.Result{}, err
	}

	if _, ok := users[minioUser.Name]; !ok {
		if err := r.NewMinioUser(ctx, accessKey, secretKey); err != nil {
			r.Logger.Error(err, "failed to new minio user", "name", accessKey)
			return ctrl.Result{}, err
		}
		// if the minio user is newly created, just return
		return ctrl.Result{Requeue: true, RequeueAfter: r.MinioUserDetectionCycle}, nil
	}

	// check whether the space used exceeds the quota
	size, objectsCount, err := myminio.GetUserStorageSize(r.MinioClient, minioUser.Name)
	if err != nil {
		r.Logger.Error(err, "failed to get user space used", "name", username, "namespace", userNamespace)
		return ctrl.Result{}, err
	}

	if minioUser.Status.Size != size {
		minioUser.Status.Size = size
		updated = true
	}

	if minioUser.Status.ObjectsCount != objectsCount {
		minioUser.Status.ObjectsCount = objectsCount
		updated = true
	}

	if updated {
		if err := r.Status().Update(ctx, minioUser); err != nil {
			r.Logger.Error(err, "failed to update status", "name", username, "namespace", userNamespace)
			return ctrl.Result{}, err
		}
	}

	//r.Logger.V(1).Info("[user] user info", "name", minioUser.Name, "quota", minioUser.Status.Quota, "size", size)

	if size > minioUser.Status.Quota {
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

	return ctrl.Result{Requeue: true, RequeueAfter: r.MinioUserDetectionCycle}, nil
}

func (r *MinioUserReconciler) NewMinioUser(ctx context.Context, accessKey, secretKey string) error {
	if err := r.MinioAdminClient.AddUser(ctx, accessKey, secretKey); err != nil {
		r.Logger.Error(err, "failed to create minio user")
		return err
	}

	if err := r.addUserToGroup(ctx, accessKey, UserNormalGroup); err != nil {
		r.Logger.Error(err, "failed to add user to userNormal group")
		return err
	}

	return nil
}

func (r *MinioUserReconciler) addUserToGroup(ctx context.Context, user string, group string) error {
	newGroupDesc := madmin.GroupAddRemove{}

	groupDesc, err := r.MinioAdminClient.GetGroupDescription(ctx, group)
	if err != nil {
		r.Logger.Error(err, "failed to get minio group description", "group", group)
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
		if err := r.MinioAdminClient.UpdateGroupMembers(ctx, newGroupDesc); err != nil {
			r.Logger.Error(err, "failed to add user to group", "user", user, "group", group)
			return err
		}
	}

	return nil
}

func (r *MinioUserReconciler) removeUserFromGroup(ctx context.Context, user string, group string) error {
	newGroupDesc := madmin.GroupAddRemove{}

	groupDesc, err := r.MinioAdminClient.GetGroupDescription(ctx, group)
	if err != nil {
		r.Logger.Error(err, "failed to get minio group description", "group", group)
		return err
	}

	member := []string{user}
	newGroupDesc.Group = groupDesc.Name
	newGroupDesc.Members = member
	newGroupDesc.Status = madmin.GroupStatus(groupDesc.Status)
	newGroupDesc.IsRemove = true

	if err := r.MinioAdminClient.UpdateGroupMembers(ctx, newGroupDesc); err != nil {
		r.Logger.Error(err, "failed to remove user from userDenyWrite group", "user", user)
		return err
	}

	return nil
}

func (r *MinioUserReconciler) deleteMinioUser(ctx context.Context, username, userNamespace string) error {
	// delete minio secret
	secret := &corev1.Secret{}
	secret.Name = MinioUserSecret
	secret.Namespace = userNamespace
	if err := r.Delete(ctx, secret); client.IgnoreNotFound(err) != nil {
		r.Logger.Error(err, "failed to delete minio secret", "name", MinioUserSecret, "namespace", userNamespace)
		return err
	}

	// delete all minio bucket cr of user
	if err := r.Client.DeleteAllOf(ctx, &miniov1.Bucket{}, client.InNamespace(userNamespace)); client.IgnoreNotFound(err) != nil {
		r.Logger.Error(err, "failed to delete all bucket of user", "name", username, "namespace", userNamespace)
		return err
	}

	users, err := r.MinioAdminClient.ListUsers(ctx)
	if err != nil {
		r.Logger.Error(err, "failed to list minio users")
		return err
	}

	// if user is already remove return nil
	if _, ok := users[username]; !ok {
		return nil
	}

	// remove minio user
	if err := r.MinioAdminClient.RemoveUser(ctx, username); err != nil {
		r.Logger.Error(err, "failed to remove minio user", "name", username)
		return err
	}

	return nil
}

func (r *MinioUserReconciler) initMinioUser(minioUser *miniov1.MinioUser, username string) bool {
	var updated = false

	if minioUser.Status.Quota == 0 {
		// 1073741824Byte = 1G
		minioUser.Status.Quota = 1073741824
		updated = true
	}

	if minioUser.Status.AccessKey == "" {
		minioUser.Status.AccessKey = username
		updated = true
	}

	if minioUser.Status.SecretKey == "" {
		minioUser.Status.SecretKey = rand.Generator(32)
		updated = true
	}

	if minioUser.Status.Internal == "" {
		minioUser.Status.Internal = r.MinioInternalEndpoint
		updated = true
	}

	if minioUser.Status.External == "" {
		minioUser.Status.External = r.MinioExternalEndpoint
		updated = true
	}

	return updated
}

// SetupWithManager sets up the controller with the Manager.
func (r *MinioUserReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.Logger = ctrl.Log.WithName("user-controller  ")
	r.Logger.V(1).Info("starting minio user-controller")

	minioUserDetectionCycleSecond := env.GetInt64EnvWithDefault(MinioUserDetectionCycleEnv, 180)
	r.MinioUserDetectionCycle = time.Duration(minioUserDetectionCycleSecond) * time.Second

	minioInternalEndpoint := env.GetEnvWithDefault(MinioInternalEndpointEnv, "minio.minio-system.svc.cluster.local")
	r.MinioInternalEndpoint = minioInternalEndpoint

	minioExternalEndpoint := env.GetEnvWithDefault(MinioExternalEndpointEnv, "minioapi.dev.sealos.top")
	r.MinioExternalEndpoint = minioExternalEndpoint

	return ctrl.NewControllerManagedBy(mgr).
		For(&miniov1.MinioUser{}).
		Complete(r)
}
