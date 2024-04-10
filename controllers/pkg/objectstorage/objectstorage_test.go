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
	objectstoragev1 "github/labring/sealos/controllers/objectstorage/api/v1"
	"os"
	"strconv"
	"testing"
	"time"
)

func TestGetUserObjectStorageFlow(t *testing.T) {
	cli, err := objectstoragev1.NewOSClient(os.Getenv("MINIO_ENDPOINT"), os.Getenv("MINIO_ACCESS_KEY"), os.Getenv("MINIO_SECRET_KEY"))
	if err != nil {
		t.Error(err)
	}
	start := time.Now().Truncate(time.Hour).Add(-time.Hour)
	bytes, err := GetUserObjectStorageFlow(cli, os.Getenv("PROM_URL"), os.Getenv("MINIO_USERNAME"), os.Getenv("MINIO_INSTANCE"), start, start.Add(time.Hour))
	if err != nil {
		t.Error(err)
	}
	t.Log(ConvertBytes(bytes))
}

func ConvertBytes(bytes int64) string {
	if bytes < 1024 {
		return strconv.FormatInt(bytes, 10) + "B"
	} else if bytes < 1024*1024 {
		return strconv.FormatFloat(float64(bytes)/1024, 'f', 2, 64) + "KB"
	} else if bytes < 1024*1024*1024 {
		return strconv.FormatFloat(float64(bytes)/1024/1024, 'f', 2, 64) + "MB"
	} else {
		return strconv.FormatFloat(float64(bytes)/1024/1024/1024, 'f', 2, 64) + "GB"
	}
}
