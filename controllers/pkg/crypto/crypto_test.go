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

package crypto

import (
	"fmt"
	"testing"
	"time"

	v1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
)

const Token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJTZWFsb3MiLCJpYXQiOjE2OTA0NDU5NjIsImFtdCI6MjAwMH0.ZzZfPRbNiNvRBLMn5FGJeKitRPHmUHZ1qvnGdJUIbIH1L5mQ4yECzvvsa5S8-OTqF6HXmrw9QmFcQOjoz5GpqjqrqXdH2H-JDXFGNNAib2J9UmLFmtV1BVm3zReucfK-bOY5NiWOr5wplEVwkoUKNPHLY5Mw142y9J62vELE-XW-hb3xcmWjLTPVRYgMqk0KEi7Z7cQ_rS0QgJh1Rqb2WS6AKz2ILE5J8XUhhhUva0nCEyLzE-I8oZtV6kugQy8YjWI-SjfneFOLI8-Pg40vry6DZZ-_J_9QmjkUlZx0YNMRiRA5yg2yWeMEzVnam9L310TJgu6Od-bEUijsfOcZyw"
const Key = "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUFvbFBTSzB0UjFKeDZtb25lL2ppeApSWGN6UGlxcU5SSXRmdW1mdWNyNGMxc2dqdlJha0NwcWtDU21lMTR1akJkU0x6QlZzRjkvUWl0UnFNb2NvaEN1CkJ6R25EQ29hWnZXbWVHeE96NEZSejVTeUg1QTlDa3dnbUEzYnFnMWxKSEZTMlZyVjVHVFhFWnphZTZtRmhHOVcKenJMTnpZMlptYTMzOVE1WTNJSDZ6RXIrcTRQbTZDOXBHVGpsSnVodlRvb0dSY2w0bmpZRXc2eHB6ZHZrdi9uSApmZmxsWGZVNDNyRGdQaGkwZDRjWnNuTUJlazUxQkNiRFRuSHlNVFdGT1RoTjc1VVM0bzJxRm9JSEhsM0N0RzE4ClZIZEdRSE1IR0dYcGN3bVhhck1EQndwVWFOSk9kMkhjTTB5dlZEY2xDZzRITkIwVUFWeFNweFlRV3BwNWJzN2gKbHdJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg=="

func TestIsLicenseValid(t *testing.T) {
	fakePublicKey := Key
	fakeLicense := v1.License{
		Spec: v1.LicenseSpec{
			Key:   fakePublicKey,
			Token: Token,
		},
	}
	fmt.Println(time.Now().Unix())
	claims, valid := IsLicenseValid(fakeLicense)

	if valid {
		t.Logf("content after decoding: %v\n", claims)
	} else {
		t.Error("decoded error")
	}
}
