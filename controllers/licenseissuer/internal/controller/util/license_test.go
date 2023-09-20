/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package util

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"testing"
)

const saltKey = "bGhjZnUxajR0bzk0cmdjMG5hZnk4dnEyMWs2cm84cjJrczg5aGY3eW5udDRoNXRjbmRrdGszamZ4aTY4eGZ6cQ"

func TestHashCrypto(t *testing.T) {
	hash := sha256.Sum256([]byte(saltKey))
	hashInHex := hex.EncodeToString(hash[:])
	fmt.Println(hashInHex)
}
