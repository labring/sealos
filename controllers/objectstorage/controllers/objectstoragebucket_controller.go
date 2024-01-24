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
	"fmt"

	"strings"
	"time"

	"github.com/go-logr/logr"
	"github.com/minio/minio-go/v7"

	"github.com/labring/sealos/controllers/pkg/utils/env"

	objectstoragev1 "github/labring/sealos/controllers/objectstorage/api/v1"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
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
	OSNamespace       string
	OSAdminSecret     string
	OSBDetectionCycle time.Duration
	InternalEndpoint  string
}

const (
	OSBDetectionCycleEnv        = "OSBDetectionCycleSeconds"
	DefaultRegion               = "us-east-1"
	DefaultObjectLocking        = false
	PrivateBucketPolicy         = "private"
	PublicReadBucketPolicy      = "publicRead"
	PublicReadwriteBucketPolicy = "publicReadwrite"
)

//+kubebuilder:rbac:groups=objectstorage.sealos.io,resources=objectstoragebuckets,verbs=get;list;watch;create;update;patch;delete;deletecollection
//+kubebuilder:rbac:groups=objectstorage.sealos.io,resources=objectstoragebuckets/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=objectstorage.sealos.io,resources=objectstoragebuckets/finalizers,verbs=update

func (r *ObjectStorageBucketReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	// new OSClient
	if r.OSClient == nil {
		secret := &corev1.Secret{}
		if err := r.Get(ctx, client.ObjectKey{Name: r.OSAdminSecret, Namespace: r.OSNamespace}, secret); err != nil {
			r.Logger.Error(err, "failed to get secret", "name", r.OSAdminSecret, "namespace", r.OSNamespace)
			return ctrl.Result{}, err
		}

		endpoint := r.InternalEndpoint
		accessKey := string(secret.Data[AccessKey])
		secretKey := string(secret.Data[SecretKey])

		var err error
		if r.OSClient, err = objectstoragev1.NewOSClient(endpoint, accessKey, secretKey); err != nil {
			r.Logger.Error(err, "failed to new object storage client")
			return ctrl.Result{}, err
		}
	}

	bucketName := buildBucketName(req.Name, req.Namespace)

	bucket := &objectstoragev1.ObjectStorageBucket{}
	if err := r.Get(ctx, client.ObjectKey{Name: req.Name, Namespace: req.Namespace}, bucket); err != nil {
		if !errors.IsNotFound(err) {
			r.Logger.Error(err, "failed to get object storage bucket", "name", req.Name, "namespace", req.Namespace)
			return ctrl.Result{}, err
		}

		exists, err := r.OSClient.BucketExists(ctx, bucketName)
		if err != nil {
			r.Logger.Error(err, "failed to check if bucket exist", "name", bucketName)
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

	// check if bucket exist
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
	default:
		return ``
	}
}

func buildBucketName(name, namespace string) string {
	return strings.Split(namespace, "-")[1] + "-" + name
}

// SetupWithManager sets up the controller with the Manager.
func (r *ObjectStorageBucketReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.Logger = ctrl.Log.WithName("object-storage-bucket-controller")
	r.Logger.V(1).Info("starting object storage bucket controller")

	oSBDetectionCycleSecond := env.GetInt64EnvWithDefault(OSBDetectionCycleEnv, 600)
	r.OSBDetectionCycle = time.Duration(oSBDetectionCycleSecond) * time.Second

	internalEndpoint := env.GetEnvWithDefault(OSInternalEndpointEnv, "")
	r.InternalEndpoint = internalEndpoint

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
