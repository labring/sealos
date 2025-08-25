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

package v1

import (
	"testing"

	v1 "k8s.io/api/networking/v1"
)

func TestIcpValidator_Query(t *testing.T) {
	icpValidator := NewIcpValidator(true, "http://v.juhe.cn/siteTools/app/NewDomain/query.php", "")
	for i := 0; i <= 3; i++ {
		rule := &v1.IngressRule{
			Host: "sealos.cn",
		}
		icpResponse, err := icpValidator.Query(rule)
		if err != nil {
			t.Fatalf("Error querying ICP: %v", err)
		}
		t.Logf("ICP Response: %+v", icpResponse)
	}
}
