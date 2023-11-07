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
	"github.com/labring/sealos/controllers/pkg/utils/env"
	"github.com/minio/minio-go/v7"

	miniov1 "github/labring/sealos/controllers/minio/api/v1"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// BucketReconciler reconciles a Bucket object
type BucketReconciler struct {
	client.Client
	Scheme                    *runtime.Scheme
	Logger                    logr.Logger
	MinioClient               *minio.Client
	MinioBucketDetectionCycle time.Duration
	MinioInternalEndpoint     string
}

const (
	MinioBucketDetectionCycleEnv = "MinioBucketDetectionCycleSeconds"
	DefaultRegion                = "us-east-1"
	DefaultObjectLocking         = false
	PrivateBucketPolicy          = "private"
	PublicReadBucketPolicy       = "publicRead"
	PublicReadwriteBucketPolicy  = "publicReadwrite"
)

//+kubebuilder:rbac:groups=minio.sealos.io,resources=buckets,verbs=get;list;watch;create;update;patch;delete;deletecollection
//+kubebuilder:rbac:groups=minio.sealos.io,resources=buckets/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=minio.sealos.io,resources=buckets/finalizers,verbs=update
//+kubebuilder:rbac:groups="",resources=secrets,verbs=get;list;watch;create;update;patch;delete

func (r *BucketReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	// new MinioClient
	if r.MinioClient == nil {
		secret := &corev1.Secret{}
		if err := r.Get(ctx, client.ObjectKey{Name: MinioAdminSecret, Namespace: MinioNamespace}, secret); err != nil {
			r.Logger.Error(err, "failed to get secret", "name", MinioAdminSecret, "namespace", MinioNamespace)
			return ctrl.Result{}, err
		}

		endpoint := r.MinioInternalEndpoint
		accessKey := string(secret.Data[AccessKey])
		secretKey := string(secret.Data[SecretKey])

		var err error
		if r.MinioClient, err = miniov1.NewMinioClient(endpoint, accessKey, secretKey); err != nil {
			r.Logger.Error(err, "failed to new minio client")
			return ctrl.Result{}, err
		}
	}

	bucketName := buildBucketName(req.Name, req.Namespace)

	bucket := &miniov1.Bucket{}
	if err := r.Get(ctx, client.ObjectKey{Name: req.Name, Namespace: req.Namespace}, bucket); err != nil {
		if !errors.IsNotFound(err) {
			r.Logger.Error(err, "failed to get minio bucket", "name", req.Name, "namespace", req.Namespace)
			return ctrl.Result{}, err
		}

		exists, err := r.MinioClient.BucketExists(ctx, bucketName)
		if err != nil {
			r.Logger.Error(err, "failed to check if bucket exist", "name", bucketName)
			return ctrl.Result{}, err
		}

		if !exists {
			return ctrl.Result{}, nil
		}

		// clear bucket before remove bucket
		objects := r.MinioClient.ListObjects(ctx, bucketName, minio.ListObjectsOptions{})
		for object := range objects {
			if err := r.MinioClient.RemoveObject(ctx, bucketName, object.Key, minio.RemoveObjectOptions{}); err != nil {
				r.Logger.Error(err, "failed to remove object from bucket", "object", object.Key, "bucket", bucketName)
				return ctrl.Result{}, err
			}
		}

		if err := r.MinioClient.RemoveBucket(ctx, bucketName); err != nil {
			r.Logger.Error(err, "failed to delete minio bucket", "name", bucketName)
			return ctrl.Result{}, err
		}

		return ctrl.Result{}, nil
	}

	// check if bucket exist
	exists, err := r.MinioClient.BucketExists(ctx, bucketName)
	if err != nil {
		r.Logger.Error(err, "failed to check if bucket exist", "name", bucketName)
		return ctrl.Result{}, err
	}

	// new bucket when bucket is not exist
	if !exists {
		if err := r.MinioClient.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{Region: DefaultRegion, ObjectLocking: DefaultObjectLocking}); err != nil {
			r.Logger.Error(err, "failed to make bucket", "name", bucketName)
			return ctrl.Result{}, err
		}
	}

	// set bucket policy
	if err := r.MinioClient.SetBucketPolicy(ctx, bucketName, buildPolicy(bucket.Spec.Policy, bucketName)); err != nil {
		r.Logger.Error(err, "failed to set policy for bucket", "name", bucketName, "policy", bucket.Spec.Policy)
		return ctrl.Result{}, err
	}

	var totalSize int64
	var update bool

	// list objects in the bucket and calculate the total space used
	objects := r.MinioClient.ListObjects(ctx, bucketName, minio.ListObjectsOptions{
		Recursive: true,
	})

	for object := range objects {
		totalSize += object.Size
	}

	if bucket.Status.Size != totalSize {
		bucket.Status.Size = totalSize
		update = true
	}

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

	//r.Logger.V(1).Info("[bucket] bucket info", "name", bucket.Status.Name, "size", bucket.Status.Size, "policy", bucket.Spec.Policy)

	return ctrl.Result{Requeue: true, RequeueAfter: r.MinioBucketDetectionCycle}, nil
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
func (r *BucketReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.Logger = ctrl.Log.WithName("bucket-controller")
	r.Logger.V(1).Info("starting minio bucket-controller")

	minioBucketDetectionCycleSecond := env.GetInt64EnvWithDefault(MinioBucketDetectionCycleEnv, 600)
	r.MinioBucketDetectionCycle = time.Duration(minioBucketDetectionCycleSecond) * time.Second

	minioInternalEndpoint := env.GetEnvWithDefault(MinioInternalEndpointEnv, "minio.minio-system.svc.cluster.local")
	r.MinioInternalEndpoint = minioInternalEndpoint

	return ctrl.NewControllerManagedBy(mgr).
		For(&miniov1.Bucket{}).
		Complete(r)
}
