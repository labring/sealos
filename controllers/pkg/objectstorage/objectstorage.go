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

	rcvdValues, err := parseBytesStr(rcvdStr1, rcvdStr2)
	if err != nil {
		fmt.Printf("failed to parse rcvd strings: %v\n", err)
		return 0, err
	}

	sentValues, err := parseBytesStr(sentStr1, sentStr2)
	if err != nil {
		fmt.Printf("failed to parse sent strings: %v\n", err)
		return 0, err
	}

	fmt.Printf("bucket: %v, received bytes in duration: %v, sent bytes in duration: %v\n", bucketName, rcvdValues[1]-rcvdValues[0], sentValues[1]-sentValues[0])
	fmt.Printf("received bytes: {startTime: {time: %v, value: %v}, endTime: {time: %v, value: %v}}\n", startTime.Format("2006-01-02 15:04:05"), rcvdValues[0], endTime.Format("2006-01-02 15:04:05"), rcvdValues[1])
	fmt.Printf("sent bytes: {startTime: {time: %v, value: %v}, endTime: {time: %v, value: %v}}\n", startTime.Format("2006-01-02 15:04:05"), sentValues[0], endTime.Format("2006-01-02 15:04:05"), sentValues[1])

	return rcvdValues[1] + sentValues[1] - rcvdValues[0] - sentValues[0], nil
}

func parseBytesStr(bytesStrs ...string) ([]int64, error) {
	var bytes []int64
	for _, str := range bytesStrs {
		if str != "" {
			byteVal, err := strconv.ParseInt(str, 10, 64)
			if err != nil {
				return nil, fmt.Errorf("failed to parse string %s to int64: %v", str, err)
			}
			bytes = append(bytes, byteVal)
		} else {
			bytes = append(bytes, 0)
		}
	}
	return bytes, nil
}
