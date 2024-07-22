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
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/go-logr/logr"
	"github.com/minio/madmin-go/v3"
	"github.com/minio/minio-go/v7"

	"github.com/labring/sealos/controllers/pkg/utils/env"

	objectstoragev1 "github/labring/sealos/controllers/objectstorage/api/v1"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/rand"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// OS = object storage, OSB = object storage bucket

// ObjectStorageBucketReconciler reconciles a ObjectStorageBucket object
type ObjectStorageBucketReconciler struct {
	client.Client
	Scheme            *runtime.Scheme
	Logger            logr.Logger
	OSClient          *minio.Client
	OSAdminClient     *madmin.AdminClient
	OSNamespace       string
	OSAdminSecret     string
	OSBDetectionCycle time.Duration
	InternalEndpoint  string
	ExternalEndpoint  string
}

const (
	OSBDetectionCycleEnv        = "OSBDetectionCycleSeconds"
	DefaultRegion               = "us-east-1"
	DefaultObjectLocking        = false
	PrivateBucketPolicy         = "private"
	PublicReadBucketPolicy      = "publicRead"
	PublicReadwriteBucketPolicy = "publicReadwrite"
	BucketServiceAccountPolicy  = "BucketServiceAccountPolicy"
)

//+kubebuilder:rbac:groups=objectstorage.sealos.io,resources=objectstoragebuckets,verbs=get;list;watch;create;update;patch;delete;deletecollection
//+kubebuilder:rbac:groups=objectstorage.sealos.io,resources=objectstoragebuckets/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=objectstorage.sealos.io,resources=objectstoragebuckets/finalizers,verbs=update

func (r *ObjectStorageBucketReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	// new OSClient
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

	bucketName := buildBucketName(req.Name, req.Namespace)
	serviceAccountName := buildSAName(bucketName)
	namespace := req.Namespace
	username := strings.Split(namespace, "-")[1]

	bucket := &objectstoragev1.ObjectStorageBucket{}
	if err := r.Get(ctx, client.ObjectKey{Name: req.Name, Namespace: namespace}, bucket); err != nil {
		if !errors.IsNotFound(err) {
			r.Logger.Error(err, "failed to get object storage bucket", "name", req.Name, "namespace", namespace)
			return ctrl.Result{}, err
		}

		// remove service account of bucket
		serviceAccounts, err := r.OSAdminClient.ListServiceAccounts(ctx, username)
		if err != nil {
			r.Logger.Error(err, "failed to list service accounts", "user", username)
			return ctrl.Result{}, err
		}
		for _, serviceAccount := range serviceAccounts.Accounts {
			if serviceAccount.AccessKey == serviceAccountName {
				err := r.OSAdminClient.DeleteServiceAccount(ctx, serviceAccountName)
				if err != nil {
					r.Logger.Error(err, "failed to delete service account", "serviceAccountName", serviceAccountName, "bucketName", bucketName)
					return ctrl.Result{}, err
				}
				break
			}
		}

		exists, err := r.OSClient.BucketExists(ctx, bucketName)
		if err != nil {
			r.Logger.Error(err, "failed to check if bucket exists", "name", bucketName)
			return ctrl.Result{}, err
		}

		if !exists {
			return ctrl.Result{}, nil
		}

		// clear bucket before remove bucket
		objects := r.OSClient.ListObjects(ctx, bucketName, minio.ListObjectsOptions{
			Recursive: true,
		})
		for object := range objects {
			if err := r.OSClient.RemoveObject(ctx, bucketName, object.Key, minio.RemoveObjectOptions{}); err != nil {
				r.Logger.Error(err, "failed to remove object from bucket", "object", object.Key, "bucket", bucketName)
				return ctrl.Result{}, err
			}
		}

		if err := r.OSClient.RemoveBucket(ctx, bucketName); err != nil {
			r.Logger.Error(err, "failed to delete object storage bucket", "name", bucketName)
			return ctrl.Result{}, err
		}

		return ctrl.Result{}, nil
	}

	// check if the user cr exists
	user := &objectstoragev1.ObjectStorageUser{}
	if err := r.Get(ctx, client.ObjectKey{Name: username, Namespace: namespace}, user); err != nil {
		if !errors.IsNotFound(err) {
			r.Logger.Error(err, "failed to get object storage user", "name", username, "namespace", namespace)
			return ctrl.Result{}, err
		}

		// create user cr
		user.Name = username
		user.Namespace = namespace
		if err := r.Create(ctx, user); err != nil {
			r.Logger.Error(err, "failed to create object storage user", "name", username, "namespace", namespace)
			return ctrl.Result{}, err
		}
	}

	// check if the bucket exists
	exists, err := r.OSClient.BucketExists(ctx, bucketName)
	if err != nil {
		r.Logger.Error(err, "failed to check if bucket exist", "name", bucketName)
		return ctrl.Result{}, err
	}

	// new bucket when bucket is not exist
	if !exists {
		if err := r.OSClient.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{Region: DefaultRegion, ObjectLocking: DefaultObjectLocking}); err != nil {
			r.Logger.Error(err, "failed to make bucket", "name", bucketName)
			return ctrl.Result{}, err
		}
	}

	// set bucket policy
	if err := r.OSClient.SetBucketPolicy(ctx, bucketName, buildPolicy(bucket.Spec.Policy, bucketName)); err != nil {
		r.Logger.Error(err, "failed to set policy for bucket", "name", bucketName, "policy", bucket.Spec.Policy)
		return ctrl.Result{}, err
	}

	var update bool

	if bucket.Status.Name != bucketName {
		bucket.Status.Name = bucketName
		update = true
	}

	if update {
		if err := r.Status().Update(ctx, bucket); err != nil {
			r.Logger.Error(err, "failed to update bucket status", "name", bucket.Name, "namespace", bucket.Namespace)
			return ctrl.Result{}, err
		}
	}

	var sa madmin.Credentials
	var saExits bool
	userIsNotFound := "The specified user does not exist. (Specified user does not exist)"

	userInfo, err := r.OSAdminClient.GetUserInfo(ctx, username)
	if err != nil {
		if err.Error() == userIsNotFound {
			r.Logger.V(1).Info("the minio user is being created", "user", username, "namespace", namespace)
			return ctrl.Result{Requeue: true}, nil
		}

		r.Logger.Error(err, "failed to get minio user info", "user", username, "namespace", namespace)
		return ctrl.Result{}, err
	}

	if userInfo.Status == "disabled" {
		r.Logger.V(1).Info("user is disabled", "user", username)
		return ctrl.Result{}, nil
	}

	serviceAccounts, err := r.OSAdminClient.ListServiceAccounts(ctx, username)
	if err != nil {
		r.Logger.Error(err, "failed to list service accounts", "user", username)
		return ctrl.Result{}, err
	}
	for _, serviceAccount := range serviceAccounts.Accounts {
		if serviceAccount.AccessKey == serviceAccountName {
			sa.AccessKey = serviceAccount.AccessKey
			saExits = true
			break
		}
	}

	if !saExits {
		saReq := madmin.AddServiceAccountReq{
			Policy:     []byte(buildPolicy(BucketServiceAccountPolicy, bucketName)),
			TargetUser: username,
			AccessKey:  serviceAccountName,
			SecretKey:  rand.String(16),
		}
		sa, err = r.OSAdminClient.AddServiceAccount(ctx, saReq)
		if err != nil {
			r.Logger.Error(err, "failed to add service account", "serviceAccountName", serviceAccountName, "bucket", bucketName)
			return ctrl.Result{}, err
		}
	}

	accessKey := sa.AccessKey
	secretKey := sa.SecretKey

	secretName := OSKeySecret + "-" + bucketName
	secret := &corev1.Secret{}
	secret.Name = secretName
	secret.Namespace = namespace
	if err := r.Get(ctx, client.ObjectKey{Name: secretName, Namespace: namespace}, secret); err != nil {
		if !errors.IsNotFound(err) {
			r.Logger.Error(err, "failed to get object storage key secret", "name", secretName, "namespace", namespace)
			return ctrl.Result{}, err
		}

		if err := r.newObjectStorageKeySecret(ctx, secret, bucket, accessKey, secretKey); err != nil {
			r.Logger.Error(err, "failed to new object storage key secret", "name", secretName, "namespace", namespace)
			return ctrl.Result{}, err
		}
	}

	keySecretUpdated := r.initObjectStorageKeySecret(secret, accessKey, secretKey, bucketName)

	if keySecretUpdated {
		if err := r.Update(ctx, secret); err != nil {
			r.Logger.Error(err, "failed to update object storage key secret", "name", secretName, "namespace", namespace)
		}
	}

	r.Logger.V(1).Info("[bucket] bucket info", "name", bucket.Status.Name, "size", bucket.Status.Size, "policy", bucket.Spec.Policy)

	return ctrl.Result{Requeue: true, RequeueAfter: r.OSBDetectionCycle}, nil
}

func buildPolicy(policy, bucketName string) string {
	switch policy {
	case PrivateBucketPolicy:
		return `{"Version":"2012-10-17","Statement":[]}`
	case PublicReadBucketPolicy:
		return `{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetBucketLocation","s3:ListBucket"],"Resource":["arn:aws:s3:::` + bucketName + `"]},
				{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::` + bucketName + `/*"]}]}`
	case PublicReadwriteBucketPolicy:
		return `{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:ListBucketMultipartUploads","s3:GetBucketLocation","s3:ListBucket"],"Resource":["arn:aws:s3:::` + bucketName + `"]},
				{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:PutObject","s3:AbortMultipartUpload","s3:DeleteObject","s3:GetObject","s3:ListMultipartUploadParts"],"Resource":["arn:aws:s3:::` + bucketName + `/*"]}]}`
	case BucketServiceAccountPolicy:
		return `{
 "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:ListBucketMultipartUploads",
        "s3:ListMultipartUploadParts",
        "s3:GetBucketPolicy",
        "s3:GetBucketLocation",
        "s3:GetBucketTagging",
        "s3:PutBucketTagging",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::` + bucketName + `/*"
      ]
    }
  ]
}`
	default:
		return ``
	}
}

func buildBucketName(name, namespace string) string {
	return strings.Split(namespace, "-")[1] + "-" + name
}

func (r *ObjectStorageBucketReconciler) newObjectStorageKeySecret(ctx context.Context, secret *corev1.Secret, bucket *objectstoragev1.ObjectStorageBucket, accessKey, secretKey string) error {
	secret.Data = make(map[string][]byte)
	secret.Data[OSKeySecretAccessKey] = []byte(accessKey)
	secret.Data[OSKeySecretSecretKey] = []byte(secretKey)
	secret.Data[OSKeySecretInternal] = []byte(r.InternalEndpoint)
	secret.Data[OSKeySecretExternal] = []byte(r.ExternalEndpoint)
	secret.Data[OSKeySecretBucket] = []byte(bucket.Status.Name)

	reference := metav1.OwnerReference{
		APIVersion:         bucket.APIVersion,
		Kind:               bucket.Kind,
		Name:               bucket.Name,
		UID:                bucket.UID,
		Controller:         nil,
		BlockOwnerDeletion: nil,
	}
	refList := make([]metav1.OwnerReference, 0)
	refList = append(refList, reference)
	secret.SetOwnerReferences(refList)

	return r.Create(ctx, secret)
}

func (r *ObjectStorageBucketReconciler) initObjectStorageKeySecret(secret *corev1.Secret, accessKey, secretKey, bucketName string) bool {
	var updated = false

	if !bytes.Equal(secret.Data[OSKeySecretAccessKey], []byte(accessKey)) {
		secret.Data[OSKeySecretAccessKey] = []byte(accessKey)
		updated = true
	}

	if secretKey != "" && !bytes.Equal(secret.Data[OSKeySecretSecretKey], []byte(secretKey)) {
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

	if !bytes.Equal(secret.Data[OSKeySecretBucket], []byte(bucketName)) {
		secret.Data[OSKeySecretBucket] = []byte(bucketName)
		updated = true
	}

	return updated
}

func buildSAName(input string) string {
	hashBytes := sha256.Sum256([]byte(input))
	hashHex := hex.EncodeToString(hashBytes[:])
	return hashHex[:16]
}

// SetupWithManager sets up the controller with the Manager.
func (r *ObjectStorageBucketReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.Logger = ctrl.Log.WithName("object-storage-bucket-controller")
	r.Logger.V(1).Info("starting object storage bucket controller")

	oSBDetectionCycleSecond := env.GetInt64EnvWithDefault(OSBDetectionCycleEnv, 300)
	r.OSBDetectionCycle = time.Duration(oSBDetectionCycleSecond) * time.Second

	internalEndpoint := env.GetEnvWithDefault(OSInternalEndpointEnv, "")
	r.InternalEndpoint = internalEndpoint

	externalEndpoint := env.GetEnvWithDefault(OSExternalEndpointEnv, "")
	r.ExternalEndpoint = externalEndpoint

	oSNamespace := env.GetEnvWithDefault(OSNamespace, "")
	r.OSNamespace = oSNamespace

	oSAdminSecret := env.GetEnvWithDefault(OSAdminSecret, "")
	r.OSAdminSecret = oSAdminSecret

	if internalEndpoint == "" || oSNamespace == "" || oSAdminSecret == "" {
		return fmt.Errorf("failed to get the endpoint or namespace or admin secret env of object storage")
	}

	return ctrl.NewControllerManagedBy(mgr).
		For(&objectstoragev1.ObjectStorageBucket{}).
		Complete(r)
}
