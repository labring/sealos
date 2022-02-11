// Copyright © 2021 sealos.
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

package join

import (
	"encoding/hex"
	cryptoutil "github.com/fanux/sealos/pkg/utils/kubernetes/crypto"
)

const (
	CertificateKeySize = 32
)

//CreateCertificateKey returns a cryptographically secure random key
func CreateCertificateKey() (string, error) {
	randBytes, err := cryptoutil.CreateRandBytes(CertificateKeySize)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(randBytes), nil
}
