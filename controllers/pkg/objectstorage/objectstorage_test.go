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
	"testing"
)

func TestQueryUserTraffic(t *testing.T) {
	obClient, err := NewMetricsClient(
		"objectstorageapi.192.168.0.55.nip.io",
		"username",
		"passw0rd",
		false,
	)
	if err != nil {
		t.Error(err)
	}
	metrics, err := QueryUserUsageAndTraffic(obClient)
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
