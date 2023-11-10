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

package minio

import (
	"context"
	"fmt"
	"strings"

	"github.com/minio/minio-go/v7"
)

func GetUserStorageSize(client *minio.Client, username string) (int64, int64, error) {
	buckets, err := client.ListBuckets(context.Background())
	if err != nil {
		return 0, 0, fmt.Errorf("list buckets failed: %v", err)
	}

	var expectBuckets []string
	for _, bucket := range buckets {
		if strings.HasPrefix(bucket.Name, username) {
			expectBuckets = append(expectBuckets, bucket.Name)
		}
	}

	var totalSize int64
	var objectsCount int64
	for _, bucketName := range expectBuckets {
		objects := client.ListObjects(context.Background(), bucketName, minio.ListObjectsOptions{
			Recursive: true,
		})
		for object := range objects {
			totalSize += object.Size
			objectsCount++
		}
	}

	return totalSize, objectsCount, nil
}
