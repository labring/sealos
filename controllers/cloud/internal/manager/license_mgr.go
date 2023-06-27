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

package manager

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	cl "sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	Keep       PolicyAction = "KEEP"
	Override   PolicyAction = "OVERRIDE"
	Invalidate PolicyAction = "INVALIDATE"
)

type LicenseMonitorRequest struct {
	UID   string `json:"uid"`
	Token string `json:"token"`
	Key   string `json:"key"`
}

type LicenseMonitorResult struct {
	LicensePolicy PolicyAction `json:"licensePolicy,omitempty"`
	PublicKey     string       `json:"publicKey"`
	Token         string       `json:"token"`
	Description   string       `json:"description,omitempty"`
}

func NewLicenseMonitorRequest(secret corev1.Secret) (LicenseMonitorRequest, *ErrorMgr) {
	if secret.Name != SecretName || secret.Namespace != Namespace {
		return LicenseMonitorRequest{}, NewErrorMgr("NewLicenseMonitorRequest", "error secret")
	}

	var lmr LicenseMonitorRequest
	lmr.Key = string(secret.Data["key"])
	lmr.Token = string(secret.Data["token"])
	lmr.UID = string(secret.Data["uid"])
	return lmr, nil
}

func LicenseRestrict(ctx context.Context, client cl.Client) error {
	// 投递一个cr，通知account，将余额清零
	return nil
}
