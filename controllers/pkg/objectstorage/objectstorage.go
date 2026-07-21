// Copyright 2023 sealos.
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
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/minio/minio-go/v7"
	"github.com/prometheus/prom2json"
)

func ListUserObjectStorageBucket(client *minio.Client, username string) ([]string, error) {
	buckets, err := client.ListBuckets(context.Background())
	if err != nil {
		return nil, err
	}

	var userBuckets []string
	for _, bucket := range buckets {
		if strings.HasPrefix(bucket.Name, username) {
			userBuckets = append(userBuckets, bucket.Name)
		}
	}
	return userBuckets, nil
}

func ListAllObjectStorageBucket(client *minio.Client) ([]string, error) {
	buckets, err := client.ListBuckets(context.Background())
	if err != nil {
		return nil, err
	}

	allBuckets := make([]string, 0, len(buckets))
	for _, bucket := range buckets {
		allBuckets = append(allBuckets, bucket.Name)
	}
	return allBuckets, nil
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

// GetUserObjectStorageSize remains public for the migrated objectstorage controller.
func GetUserObjectStorageSize(client *minio.Client, username string) (int64, int64, error) {
	buckets, err := ListUserObjectStorageBucket(client, username)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to list object storage buckets: %w", err)
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

type MetricData struct {
	// key: bucket name, value: usage
	Usage map[string]int64
	// key: bucket name, value: traffic sent
	Sent map[string]int64
	// key: bucket name, value: traffic received
	Received map[string]int64
}

type Metrics map[string]MetricData

func QueryUserUsageAndTraffic(client *MetricsClient) (Metrics, error) {
	obMetrics := make(Metrics)
	bucketMetrics, err := client.BucketUsageAndTrafficBytesMetrics(context.TODO())
	if err != nil {
		return nil, fmt.Errorf("failed to get bucket traffic metrics: %w", err)
	}

	bucketSentCounts := make(map[string]int)
	for _, bucketMetric := range bucketMetrics {
		if !isUsageAndTrafficBytesTargetMetric(bucketMetric.Name) {
			continue
		}

		for _, metrics := range bucketMetric.Metrics {
			promMetrics, ok := metrics.(prom2json.Metric)
			if !ok {
				return nil, errors.New("failed to convert metrics to prom2json.Metric")
			}
			floatValue, err := strconv.ParseFloat(promMetrics.Value, 64)
			if err != nil {
				return nil, fmt.Errorf("failed to parse %s to float value", promMetrics.Value)
			}
			intValue := int64(floatValue)
			if bucket := promMetrics.Labels["bucket"]; bucket != "" {
				user := getUserWithBucket(bucket)
				if user == "" {
					continue
				}
				metricData, exists := obMetrics[user]
				if !exists {
					metricData = MetricData{
						Usage:    make(map[string]int64),
						Sent:     make(map[string]int64),
						Received: make(map[string]int64),
					}
				}
				switch bucketMetric.Name {
				case "minio_bucket_usage_total_bytes":
					metricData.Usage[bucket] += intValue
				case "minio_bucket_traffic_sent_bytes":
					metricData.Sent[bucket] += intValue
					bucketSentCounts[bucket]++
				case "minio_bucket_traffic_received_bytes":
					metricData.Received[bucket] += intValue
				}
				obMetrics[user] = metricData
			}
		}
	}

	for user, metricData := range obMetrics {
		for bucket, count := range bucketSentCounts {
			if _, ok := metricData.Sent[bucket]; ok && count < 4 {
				metricData.Sent[bucket] = -1
			}
		}
		obMetrics[user] = metricData
	}

	return obMetrics, nil
}

func isUsageAndTrafficBytesTargetMetric(name string) bool {
	switch name {
	case "minio_bucket_usage_total_bytes",
		"minio_bucket_traffic_sent_bytes",
		"minio_bucket_traffic_received_bytes":
		return true
	default:
		return false
	}
}

func getUserWithBucket(bucket string) string {
	re := regexp.MustCompile(`^([a-zA-Z0-9]{8})-(.*)$`)
	matches := re.FindStringSubmatch(bucket)
	if len(matches) == 3 {
		return matches[1]
	}
	return ""
}
