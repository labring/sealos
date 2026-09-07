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
	"fmt"
	"os"
	"strconv"
	"testing"
	"time"
)

func TestGetUserObjectStorageFlow(t *testing.T) {
	requireObjectStorageTest(t,
		"MINIO_ENDPOINT",
		"MINIO_ACCESS_KEY",
		"MINIO_SECRET_KEY",
		"PROM_URL",
		"MINIO_USERNAME",
		"MINIO_INSTANCE",
	)
	cli, err := NewOSClient(
		os.Getenv("MINIO_ENDPOINT"),
		os.Getenv("MINIO_ACCESS_KEY"),
		os.Getenv("MINIO_SECRET_KEY"),
	)
	if err != nil {
		t.Fatal(err)
	}
	start := time.Now().Truncate(time.Hour).Add(-time.Hour)
	bytes, err := GetUserObjectStorageFlow(
		cli,
		os.Getenv("PROM_URL"),
		os.Getenv("MINIO_USERNAME"),
		os.Getenv("MINIO_INSTANCE"),
		start,
		start.Add(time.Hour),
	)
	if err != nil {
		t.Fatal(err)
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
	requireObjectStorageTest(t,
		"OBJECTSTORAGE_METRICS_ENDPOINT",
		"OBJECTSTORAGE_METRICS_USERNAME",
		"OBJECTSTORAGE_METRICS_PASSWORD",
	)
	obClient, err := NewMetricsClient(
		os.Getenv("OBJECTSTORAGE_METRICS_ENDPOINT"),
		os.Getenv("OBJECTSTORAGE_METRICS_USERNAME"),
		os.Getenv("OBJECTSTORAGE_METRICS_PASSWORD"),
		false,
	)
	if err != nil {
		t.Fatal(err)
	}
	metrics, err := QueryUserUsage(obClient)
	if err != nil {
		t.Fatal(err)
	}
	for _, metric := range metrics {
		fmt.Println(metric)
	}
}

func TestQueryUserTraffic(t *testing.T) {
	requireObjectStorageTest(t,
		"OBJECTSTORAGE_METRICS_ENDPOINT",
		"OBJECTSTORAGE_METRICS_USERNAME",
		"OBJECTSTORAGE_METRICS_PASSWORD",
	)
	obClient, err := NewMetricsClient(
		os.Getenv("OBJECTSTORAGE_METRICS_ENDPOINT"),
		os.Getenv("OBJECTSTORAGE_METRICS_USERNAME"),
		os.Getenv("OBJECTSTORAGE_METRICS_PASSWORD"),
		false,
	)
	if err != nil {
		t.Fatal(err)
	}
	metrics, err := QueryUserUsageAndTraffic(obClient)
	if err != nil {
		t.Fatal(err)
	}

	for user, metric := range metrics {
		fmt.Println("user:", user)
		fmt.Println("usage:", metric.Usage)
		fmt.Println("sent:", metric.Sent)
		fmt.Println("received:", metric.Received)
	}
}

func requireObjectStorageTest(t *testing.T, envNames ...string) {
	t.Helper()
	if os.Getenv("RUN_OBJECTSTORAGE_TESTS") != "true" {
		t.Skip("set RUN_OBJECTSTORAGE_TESTS=true to run object storage tests")
	}
	for _, name := range envNames {
		if os.Getenv(name) == "" {
			t.Skipf("requires %s", name)
		}
	}
}
