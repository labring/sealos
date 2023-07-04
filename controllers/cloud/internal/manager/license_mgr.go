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
	"net/http"

	"github.com/go-logr/logr"
	cloudv1 "github.com/labring/sealos/controllers/cloud/api/v1"
	"github.com/labring/sealos/controllers/pkg/crypto"
	corev1 "k8s.io/api/core/v1"
)

const MaxSizeThresholdStr = "800Ki"

type LicenseMonitorRequest struct {
	UID   string `json:"uid"`
	Token string `json:"token"`
}

type LicenseMonitorResponse struct {
	Key string `json:"key"`
}

func NewLicenseMonitorRequest(secret corev1.Secret, license cloudv1.License) LicenseMonitorRequest {
	if secret.Name != string(SecretName) || secret.Namespace != string(Namespace) {
		return LicenseMonitorRequest{}
	}
	var lmr LicenseMonitorRequest
	lmr.Token = license.Spec.Token
	lmr.UID = string(secret.Data["uid"])
	return lmr
}

func LicenseCheckOnExternalNetwork(license cloudv1.License, secret corev1.Secret, url string, logger logr.Logger) (map[string]interface{}, bool) {
	payload, ok := crypto.IsLicenseValid(license)
	mr := NewLicenseMonitorRequest(secret, license)
	if !ok {
		var resp LicenseMonitorResponse
		httpBody, err := CommunicateWithCloud("POST", url, mr)
		if err != nil {
			logger.Error(err, "failed to communicate with cloud")
			return nil, false
		}
		if !IsSuccessfulStatusCode(httpBody.StatusCode) {
			logger.Error(err, http.StatusText(httpBody.StatusCode))
			return nil, false
		}
		err = Convert(httpBody.Body, &resp)
		if err != nil {
			logger.Error(err, "failed to convert")
			return nil, false
		}
		license.Spec.Key = resp.Key
		return crypto.IsLicenseValid(license)
	}
	return payload, ok
}

func LicenseCheckOnInternalNetwork(license cloudv1.License) (map[string]interface{}, bool) {
	return crypto.IsLicenseValid(license)
}
