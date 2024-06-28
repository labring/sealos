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

	"github.com/prometheus/prom2json"

	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/labring/sealos/controllers/pkg/utils/env"

	"github.com/prometheus/common/model"

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

func ListAllObjectStorageBucket(client *minio.Client) ([]string, error) {
	buckets, err := client.ListBuckets(context.Background())
	if err != nil {
		return nil, err
	}
	var allBuckets []string
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

func GetObjectStorageFlow(promURL, bucket, instance string, startTime, endTime time.Time) (int64, error) {
	flow, err := QueryPrometheus(promURL, bucket, instance, startTime, endTime)
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

func GetUserObjectStorageFlow(client *minio.Client, promURL, username, instance string, startTime, endTime time.Time) (int64, error) {
	buckets, err := ListUserObjectStorageBucket(client, username)
	if err != nil {
		return 0, fmt.Errorf("failed to list object storage buckets: %v", err)
	}

	var totalFlow int64
	for _, bucketName := range buckets {
		flow, err := QueryPrometheus(promURL, bucketName, instance, startTime, endTime)
		if err != nil {
			return 0, fmt.Errorf("failed to query prometheus, bucket: %v, err: %v", bucketName, err)
		}
		totalFlow += flow
	}

	return totalFlow, nil
}

var timeoutDuration = time.Duration(env.GetInt64EnvWithDefault(EnvPromQueryObsTimeoutSecEnv, 10)) * time.Second

const (
	EnvPromQueryObsTimeoutSecEnv = "PROM_QUERY_OBS_TIMEOUT_SEC"
	timeFormat                   = "2006-01-02 15:04:05"
)

var (
	bytePattern = regexp.MustCompile(`\d+`)
)

func QueryPrometheus(host, bucketName, instance string, startTime, endTime time.Time) (int64, error) {
	client, err := api.NewClient(api.Config{
		Address: host,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to create Prometheus client: %w", err)
	}

	v1api := v1.NewAPI(client)
	ctx, cancel := context.WithTimeout(context.Background(), timeoutDuration)
	defer cancel()

	rcvdQuery := fmt.Sprintf("sum(minio_bucket_traffic_received_bytes{bucket=\"%s\", instance=\"%s\"})", bucketName, instance)
	rcvdValues, err := queryPrometheus(ctx, v1api, rcvdQuery, startTime, endTime)
	if err != nil {
		return 0, fmt.Errorf("failed to query Prometheus: %w", err)
	}

	sentQuery := fmt.Sprintf("sum(minio_bucket_traffic_sent_bytes{bucket=\"%s\", instance=\"%s\"})", bucketName, instance)
	sentValues, err := queryPrometheus(ctx, v1api, sentQuery, startTime, endTime)
	if err != nil {
		return 0, fmt.Errorf("failed to query Prometheus: %w", err)
	}

	receivedDiff := rcvdValues[1] - rcvdValues[0]
	sentDiff := sentValues[1] - sentValues[0]

	fmt.Printf("bucket: %v, received bytes in duration: %v, sent bytes in duration: %v\n", bucketName, receivedDiff, sentDiff)
	fmt.Printf("received bytes: {startTime: {time: %v, value: %v}, endTime: {time: %v, value: %v}}\n", startTime.Format(timeFormat), rcvdValues[0], endTime.Format(timeFormat), rcvdValues[1])
	fmt.Printf("sent bytes: {startTime: {time: %v, value: %v}, endTime: {time: %v, value: %v}}\n", startTime.Format(timeFormat), sentValues[0], endTime.Format(timeFormat), sentValues[1])

	return rcvdValues[1] + sentValues[1] - rcvdValues[0] - sentValues[0], nil
}

func queryPrometheus(ctx context.Context, api v1.API, query string, startTime, endTime time.Time) ([]int64, error) {
	result1, _, err := api.Query(ctx, query, startTime, v1.WithTimeout(timeoutDuration))
	if err != nil {
		return nil, err
	}

	result2, _, err := api.Query(ctx, query, endTime, v1.WithTimeout(timeoutDuration))
	if err != nil {
		return nil, err
	}

	val1, val2 := extractValues(result1, result2)
	return []int64{val1, val2}, nil
}

func extractValues(result1, result2 model.Value) (int64, int64) {
	rcvdStr1 := bytePattern.FindString(result1.String())
	rcvdStr2 := bytePattern.FindString(result2.String())
	val1, _ := strconv.ParseInt(rcvdStr1, 10, 64)
	val2, _ := strconv.ParseInt(rcvdStr2, 10, 64)
	return val1, val2
}

type MetricData struct {
	// key: bucket name, value: usage
	Usage map[string]int64
}

type Metrics map[string]MetricData

func QueryUserUsage(client *MetricsClient) (Metrics, error) {
	obMetrics := make(Metrics)
	bucketMetrics, err := client.BucketUsageTotalBytesMetrics(context.TODO())
	if err != nil {
		return nil, fmt.Errorf("failed to get bucket metrics: %w", err)
	}
	for _, bucketMetric := range bucketMetrics {
		if !isUsageBytesTargetMetric(bucketMetric.Name) {
			continue
		}
		for _, metrics := range bucketMetric.Metrics {
			promMetrics := metrics.(prom2json.Metric)
			floatValue, err := strconv.ParseFloat(promMetrics.Value, 64)
			if err != nil {
				return nil, fmt.Errorf("failed to parse %s to float value", promMetrics.Value)
			}
			intValue := int64(floatValue)
			if bucket := promMetrics.Labels["bucket"]; bucket != "" {
				user := getUserWithBucket(bucket)
				metricData, exists := obMetrics[user]
				if !exists {
					metricData = MetricData{
						Usage: make(map[string]int64),
					}
				}
				metricData.Usage[bucket] += intValue
				obMetrics[user] = metricData
			}
		}
	}

	return obMetrics, err
}

func isUsageBytesTargetMetric(name string) bool {
	targetMetrics := []string{
		"minio_bucket_usage_total_bytes",
	}
	for _, target := range targetMetrics {
		if name == target {
			return true
		}
	}
	return false
}

func getUserWithBucket(bucket string) string {
	return strings.Split(bucket, "-")[0]
}

/*
/pvc-03392f69-a7b0-4a52-a839-82d9c586d96f/ns-eemtkfj3/halo-faxdridb-pg-bd87bb8c-a128-44cc-b076-6228593b16ee/postgresql/halo-faxdridb-pg-yhxnjm/halo-faxdridb-pg-yhxnjm.tar.gz
	1/pvc-03392f69-a7b0-4a52-a839-82d9c586d96f
		2/pvc-03392f69-a7b0-4a52-a839-82d9c586d96f
		2/ns-eemtkfj3
			3/ns-eemtkfj3
			3/halo-faxdridb-pg-bd87bb8c-a128-44cc-b076-6228593b16ee
				4/halo-faxdridb-pg-bd87bb8c-a128-44cc-b076-6228593b16ee
				4/postgresql
					5/postgresql
					5/halo-faxdridb-pg-yhxnjm
						6/halo-faxdridb-pg-yhxnjm
						6/halo-faxdridb-pg-yhxnjm.tar.gz
*/

func GetUserBakFileSize(client *minio.Client) map[string]int64 {
	bucket := "file-backup"
	userUsageMap := make(map[string]int64)
	objectsCh := client.ListObjects(context.Background(), bucket, minio.ListObjectsOptions{Recursive: true})
	for object := range objectsCh {
		user := extractNamespace(object.Key)
		if user != "" {
			userUsageMap[user] += object.Size
		}
	}

	return userUsageMap
}

func extractNamespace(input string) string {
	re := regexp.MustCompile(`ns-(\w+)`)
	matches := re.FindStringSubmatch(input)
	if len(matches) < 2 {
		return ""
	}
	return matches[1]
}
