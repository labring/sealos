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

package helper

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	cryptorand "crypto/rand"
	"crypto/x509"
	"encoding/pem"
	devboxv1alpha1 "github.com/labring/sealos/controllers/devbox/api/v1alpha1"
	"golang.org/x/crypto/ssh"
)

func GetLastSuccessCommitHistory(devbox *devboxv1alpha1.Devbox) *devboxv1alpha1.CommitHistory {
	if devbox.Status.CommitHistory == nil {
		return nil
	}
	for i := len(devbox.Status.CommitHistory) - 1; i >= 0; i-- {
		if devbox.Status.CommitHistory[i].Status == devboxv1alpha1.CommitStatusSuccess {
			return devbox.Status.CommitHistory[i].DeepCopy()
		}
	}
	return nil
}

func GeneratePublicAndPrivateKey() ([]byte, []byte, error) {
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), cryptorand.Reader)
	if err != nil {
		return []byte(""), []byte(""), err
	}
	public := &privateKey.PublicKey
	derPrivateKey, err := x509.MarshalECPrivateKey(privateKey)
	privateKeyPem := pem.EncodeToMemory(&pem.Block{
		Type:  "PRIVATE KEY",
		Bytes: derPrivateKey,
	})
	publicKey, err := ssh.NewPublicKey(public)
	if err != nil {
		return []byte(""), []byte(""), err
	}
	sshPublicKey := ssh.MarshalAuthorizedKey(publicKey)
	return sshPublicKey, privateKeyPem, nil
}
