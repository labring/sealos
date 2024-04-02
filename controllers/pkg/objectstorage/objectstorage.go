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

func QueryPrometheus(host, bucketName, instance string, startTime, endTime time.Time) (int64, error) {
	client, err := api.NewClient(api.Config{
		Address: host,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to new prometheus client, host: %v, err: %v", host, err)
	}

	v1api := v1.NewAPI(client)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rcvdQuery := "sum(minio_bucket_traffic_received_bytes{bucket=\"" + bucketName + "\", instance=\"" + instance + "\"})"
	rcvdResult1, rcvdWarnings1, err := v1api.Query(ctx, rcvdQuery, startTime, v1.WithTimeout(5*time.Second))
	if err != nil {
		return 0, fmt.Errorf("failed to query prometheus, query: %v, err: %v", rcvdQuery, err)
	}
	rcvdResult2, rcvdWarnings2, err := v1api.Query(ctx, rcvdQuery, endTime, v1.WithTimeout(5*time.Second))
	if err != nil {
		return 0, fmt.Errorf("failed to query prometheus, query: %v, err: %v", rcvdQuery, err)
	}

	if len(rcvdWarnings1) > 0 || len(rcvdWarnings2) > 0 {
		return 0, fmt.Errorf("there are warnings, warning1: %v, warning2: %v", rcvdWarnings1, rcvdWarnings2)
	}

	sentQuery := "sum(minio_bucket_traffic_sent_bytes{bucket=\"" + bucketName + "\", instance=\"" + instance + "\"})"
	sentResult1, sentWarnings1, err := v1api.Query(ctx, sentQuery, startTime, v1.WithTimeout(5*time.Second))
	if err != nil {
		return 0, fmt.Errorf("failed to query prometheus, query: %v, err: %v", sentQuery, err)
	}
	sentResult2, sentWarnings2, err := v1api.Query(ctx, sentQuery, endTime, v1.WithTimeout(5*time.Second))
	if err != nil {
		return 0, fmt.Errorf("failed to query prometheus, query: %v, err: %v", sentQuery, err)
	}

	if len(sentWarnings1) > 0 || len(sentWarnings2) > 0 {
		return 0, fmt.Errorf("there are warnings, warning1: %v, warning2: %v", sentWarnings1, sentWarnings2)
	}

	re := regexp.MustCompile(`\d+`)
	rcvdStr1 := re.FindString(rcvdResult1.String())
	rcvdStr2 := re.FindString(rcvdResult2.String())
	sentStr1 := re.FindString(sentResult1.String())
	sentStr2 := re.FindString(sentResult2.String())

	var rcvdBytes1 int64 = 0
	if rcvdStr1 != "" {
		rcvdBytes1, err = strconv.ParseInt(rcvdStr1, 10, 64)
		if err != nil {
			return 0, fmt.Errorf("failed to parse rcvdStr1 %s to int64: %v", rcvdStr1, err)
		}
	}
	var rcvdBytes2 int64 = 0
	if rcvdStr2 != "" {
		rcvdBytes2, err = strconv.ParseInt(rcvdStr2, 10, 64)
		if err != nil {
			return 0, fmt.Errorf("failed to parse rcvdStr2 %s to int64: %v", rcvdStr2, err)
		}
	}
	var sentBytes1 int64 = 0
	if sentStr1 != "" {
		sentBytes1, err = strconv.ParseInt(sentStr1, 10, 64)
		if err != nil {
			return 0, fmt.Errorf("failed to parse sentStr1 %s to int64: %v", rcvdStr1, err)
		}
	}
	var sentBytes2 int64 = 0
	if sentStr2 != "" {
		sentBytes2, err = strconv.ParseInt(sentStr2, 10, 64)
		if err != nil {
			return 0, fmt.Errorf("failed to parse sentStr2 %s to int64: %v", rcvdStr1, err)
		}
	}

	//rcvdBytes1, err = strconv.ParseInt(rcvdStr1, 10, 64)
	//if err != nil {
	//	rcvdBytes1 = 0
	//	//return 0, fmt.Errorf("failed to parse rcvdStr %s to int64: %v", rcvdStr1, err)
	//}
	//rcvdBytes2, err := strconv.ParseInt(rcvdStr2, 10, 64)
	//if err != nil {
	//	rcvdBytes2 = 0
	//	//return 0, fmt.Errorf("failed to parse rcvdStr %s to int64: %v", rcvdStr1, err)
	//}
	//sentBytes1, err := strconv.ParseInt(sentStr1, 10, 64)
	//if err != nil {
	//	sentBytes1 = 0
	//	//return 0, fmt.Errorf("failed to parse sentStr %s to int64: %v", sentStr1, err)
	//}
	//sentBytes2, err := strconv.ParseInt(sentStr2, 10, 64)
	//if err != nil {
	//	sentBytes2 = 0
	//	//return 0, fmt.Errorf("failed to parse sentStr %s to int64: %v", sentStr2, err)
	//}
	// user info	{"name": "1yjdiv74", "quota": 1073741824, "size": 0, "objectsCount": 0}

	fmt.Printf("bucket: %v, received bytes in duration: %v, sent bytes in duration: %v\n", bucketName, rcvdBytes2-rcvdBytes1, sentBytes2-sentBytes1)
	fmt.Printf("received bytes: {startTime: {time: %v, value: %v}, endTime: {time: %v, value: %v}}\n", startTime.Format("2006-01-02 15:04:05"), rcvdBytes1, endTime.Format("2006-01-02 15:04:05"), rcvdBytes2)
	fmt.Printf("sent bytes: {startTime: {time: %v, value: %v}, endTime: {time: %v, value: %v}}\n", startTime.Format("2006-01-02 15:04:05"), sentBytes1, endTime.Format("2006-01-02 15:04:05"), sentBytes2)

	return rcvdBytes2 + sentBytes2 - rcvdBytes1 - sentBytes1, nil
}
