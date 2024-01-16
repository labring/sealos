// Copyright © 2024 sealos.
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

package mongo

//import (
//	"context"
//	"os"
//	"testing"
//	"time"
//)
//
//func Test_mongoDB_GetPodTrafficSentBytes(t *testing.T) {
//	dbCTX := context.Background()
//
//	m, err := NewMongoInterface(dbCTX, os.Getenv("MONGO_URL"))
//	if err != nil {
//		t.Errorf("failed to connect mongo: error = %v", err)
//	}
//	defer func() {
//		if err = m.Disconnect(dbCTX); err != nil {
//			t.Errorf("failed to disconnect mongo: error = %v", err)
//		}
//	}()
//
//	//2024-01-10T06:10:24.281+00:00-2024-01-10T06:12:24.281+00:00
//	startTime, _ := time.Parse(time.RFC3339, "2024-01-10T06:10:24.281+00:00")
//	endTime, _ := time.Parse(time.RFC3339, "2024-01-10T07:12:24.281+00:00")
//	t.Logf("startTime = %v, endTime = %v", startTime, endTime)
//	bytes, err := m.GetTrafficSentBytes(startTime, endTime, "ns-8k7qhyy3", 3, "ros-minio-qzqtpjlv")
//	if err != nil {
//		t.Errorf("failed to get pod traffic sent bytes: error = %v", err)
//	}
//	t.Logf("bytes = %v", bytes)
//}
