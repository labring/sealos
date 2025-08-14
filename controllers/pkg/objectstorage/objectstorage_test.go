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

package objectstorage_test

import (
	"fmt"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/labring/sealos/controllers/pkg/objectstorage"
	objectstoragev1 "github/labring/sealos/controllers/objectstorage/api/v1"
)

func TestGetUserObjectStorageFlow(t *testing.T) {
	cli, err := objectstoragev1.NewOSClient(
		os.Getenv("MINIO_ENDPOINT"),
		os.Getenv("MINIO_ACCESS_KEY"),
		os.Getenv("MINIO_SECRET_KEY"),
	)
	if err != nil {
		t.Error(err)
	}
	start := time.Now().Truncate(time.Hour).Add(-time.Hour)
	bytes, err := objectstorage.GetUserObjectStorageFlow(
		cli,
		os.Getenv("PROM_URL"),
		os.Getenv("MINIO_USERNAME"),
		os.Getenv("MINIO_INSTANCE"),
		start,
		start.Add(time.Hour),
	)
	if err != nil {
		t.Error(err)
	}
	t.Log(ConvertBytes(bytes))
}

func ConvertBytes(bytes int64) string {
	switch {
	case bytes < 1024:
		return strconv.FormatInt(bytes, 10) + "B"
	case bytes < 1024*1024:
		return strconv.FormatFloat(float64(bytes)/1024, 'f', 2, 64) + "KB"
	case bytes < 1024*1024*1024:
		return strconv.FormatFloat(float64(bytes)/1024/1024, 'f', 2, 64) + "MB"
	default:
		return strconv.FormatFloat(float64(bytes)/1024/1024/1024, 'f', 2, 64) + "GB"
	}
}

func TestQueryUserUsage(t *testing.T) {
	obClient, err := objectstorage.NewMetricsClient(
		"objectstorageapi.192.168.0.55.nip.io",
		"username",
		"passw0rd",
		false,
	)
	if err != nil {
		t.Error(err)
	}
	metrics, err := objectstorage.QueryUserUsage(obClient)
	if err != nil {
		t.Error(err)
	}
	for _, metric := range metrics {
		fmt.Println(metric)
	}
}

func TestQueryUserTraffic(t *testing.T) {
	obClient, err := objectstorage.NewMetricsClient(
		"objectstorageapi.192.168.0.55.nip.io",
		"username",
		"passw0rd",
		false,
	)
	if err != nil {
		t.Error(err)
	}
	metrics, err := objectstorage.QueryUserUsageAndTraffic(obClient)
	if err != nil {
		t.Error(err)
	}

	for user, metric := range metrics {
		fmt.Println("user:", user)
		fmt.Println("usage:", metric.Usage)
		fmt.Println("sent:", metric.Sent)
		fmt.Println("received:", metric.Received)
	}
}
