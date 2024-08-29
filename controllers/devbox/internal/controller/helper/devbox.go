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
	"fmt"
	corev1 "k8s.io/api/core/v1"

	"encoding/pem"

	"golang.org/x/crypto/ssh"

	devboxv1alpha1 "github.com/labring/sealos/controllers/devbox/api/v1alpha1"
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

func GenerateSSHKeyPair() ([]byte, []byte, error) {
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), cryptorand.Reader)
	if err != nil {
		return []byte(""), []byte(""), err
	}
	public := &privateKey.PublicKey
	derPrivateKey, err := x509.MarshalECPrivateKey(privateKey)
	if err != nil {
		return []byte(""), []byte(""), err
	}
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

func CheckPodConsistency(devbox *devboxv1alpha1.Devbox, pod *corev1.Pod) bool {
	container := pod.Spec.Containers[0]
	//check cpu and memory
	if !container.Resources.Limits.Cpu().Equal(devbox.Spec.Resource["cpu"]) {
		return false
	}
	if !container.Resources.Limits.Memory().Equal(devbox.Spec.Resource["memory"]) {
		return false
	}
	//check ports
	if len(container.Ports) != len(devbox.Spec.NetworkSpec.ExtraPorts)+1 {
		return false
	}
	portMap := make(map[string]int)
	for _, podPort := range container.Ports {
		key := fmt.Sprintf("%d-%s", podPort.ContainerPort, podPort.Protocol)
		portMap[key]++
	}
	for _, devboxPort := range devbox.Spec.NetworkSpec.ExtraPorts {
		key := fmt.Sprintf("%d-%s", devboxPort.ContainerPort, devboxPort.Protocol)
		if _, found := portMap[key]; !found {
			return false
		}
		portMap[key]--
		if portMap[key] == 0 {
			delete(portMap, key)
		}
	}
	if len(portMap) != 1 {
		return false
	}
	return true
}
