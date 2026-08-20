// Copyright © 2026 sealos.
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

package license

// encryptionKey is the key used to decode license token, base64 encoded
var encryptionKey = "ZHd6b2Nyc3NrcXdwZm5lb2twZmV5dGNxa2JnZ3Znem8="

func GetEncryptionKey() string {
	return encryptionKey
}
