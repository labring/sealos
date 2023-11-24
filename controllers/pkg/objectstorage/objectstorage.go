// Copyright © 2023 sealos.
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

package objectstorage

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/prometheus/client_golang/api"
	v1 "github.com/prometheus/client_golang/api/prometheus/v1"
)

func ListUserObjectStorageBucket(client *minio.Client, username string) ([]string, error) {
	buckets, err := client.ListBuckets(context.Background())
	if err != nil {
		return nil, err
	}

	var expectBuckets []string
	for _, bucket := range buckets {
		if strings.HasPrefix(bucket.Name, username) {
			expectBuckets = append(expectBuckets, bucket.Name)
		}
	}
	return expectBuckets, nil
}

func GetObjectStorageSize(client *minio.Client, bucket string) (int64, int64) {
	objects := client.ListObjects(context.Background(), bucket, minio.ListObjectsOptions{
		Recursive: true,
	})
	var totalSize int64
	var objectsCount int64
	for object := range objects {
		totalSize += object.Size
		objectsCount++
	}
	return totalSize, objectsCount
}

func GetObjectStorageFlow(promURL, bucket string) (int64, error) {
	flow, err := QueryPrometheus(promURL, bucket)
	if err != nil {
		return 0, fmt.Errorf("failed to query prometheus, bucket: %v, err: %v", bucket, err)
	}
	return flow, nil
}

func GetUserObjectStorageSize(client *minio.Client, username string) (int64, int64, error) {
	buckets, err := ListUserObjectStorageBucket(client, username)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to list object storage buckets: %v", err)
	}

	var totalSize int64
	var objectsCount int64
	for _, bucketName := range buckets {
		size, count := GetObjectStorageSize(client, bucketName)
		totalSize += size
		objectsCount += count
	}
	return totalSize, objectsCount, nil
}

func GetUserObjectStorageFlow(client *minio.Client, promURL, username string) (int64, error) {
	buckets, err := ListUserObjectStorageBucket(client, username)
	if err != nil {
		return 0, fmt.Errorf("failed to list object storage buckets: %v", err)
	}

	var totalFlow int64
	for _, bucketName := range buckets {
		flow, err := QueryPrometheus(promURL, bucketName)
		if err != nil {
			return 0, fmt.Errorf("failed to query prometheus, bucket: %v, err: %v", bucketName, err)
		}
		totalFlow += flow
	}

	return totalFlow, nil
}

func QueryPrometheus(host, bucketName string) (int64, error) {
	client, err := api.NewClient(api.Config{
		Address: host,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to new prometheus client, host: %v, err: %v", host, err)
	}

	v1api := v1.NewAPI(client)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rcvdQuery := "sum(minio_bucket_traffic_received_bytes{bucket=\"" + bucketName + "\"})"
	rcvdResult, rcvdWarnings, err := v1api.Query(ctx, rcvdQuery, time.Now(), v1.WithTimeout(5*time.Second))
	if err != nil {
		return 0, fmt.Errorf("failed to query prometheus, query: %v, err: %v", rcvdQuery, err)
	}

	if len(rcvdWarnings) > 0 {
		return 0, fmt.Errorf("there are warnings: %v", rcvdWarnings)
	}

	sentQuery := "sum(minio_bucket_traffic_sent_bytes{bucket=\"" + bucketName + "\"})"
	sentResult, sentWarnings, err := v1api.Query(ctx, sentQuery, time.Now(), v1.WithTimeout(5*time.Second))
	if err != nil {
		return 0, fmt.Errorf("failed to query prometheus, query: %v, err: %v", sentQuery, err)
	}

	if len(sentWarnings) > 0 {
		return 0, fmt.Errorf("there are warnings: %v", sentWarnings)
	}

	re := regexp.MustCompile(`\d+`)
	rcvdStr := re.FindString(rcvdResult.String())
	sentStr := re.FindString(sentResult.String())

	rcvdBytes, err := strconv.ParseInt(rcvdStr, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse rcvdBytes to int64")
	}
	sentBytes, err := strconv.ParseInt(sentStr, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse rcvdBytes to int64")
	}

	fmt.Printf("received bytes: %d, send bytes: %d\n", rcvdBytes, sentBytes)

	return rcvdBytes + sentBytes, nil
}
