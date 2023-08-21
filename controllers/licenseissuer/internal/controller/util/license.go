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
	"context"
	"errors"
	"fmt"
	"strconv"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"

	"github.com/go-logr/logr"
	count "github.com/labring/sealos/controllers/common/account"
	issuerv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	"github.com/labring/sealos/controllers/pkg/crypto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type LicenseMonitorRequest struct {
	UID   string `json:"uid"`
	Token string `json:"token"`
}

type LicenseMonitorResponse struct {
	Key string `json:"key"`
}

var logger logr.Logger

func init() {
	logger = ctrl.Log.WithName("License")
}

func LicenseCheckOnExternalNetwork(ctx context.Context, client client.Client, license issuerv1.License) (map[string]interface{}, bool) {
	license.Spec.Key = Key
	payload, ok := crypto.IsLicenseValid(license)
	if ok {
		return payload, ok
	}
	uid, urlMap, err := GetUIDURL(ctx, client)
	res := LicenseMonitorRequest{
		UID:   uid,
		Token: license.Spec.Token,
	}
	if err != nil {
		logger.Error(err, "failed to get uid and url when license check on external network")
		return nil, false
	}
	if !ok {
		var resp LicenseMonitorResponse
		httpBody, err := Pull(urlMap[LicenseMonitorURL], res)
		if err != nil {
			logger.Error(err, "failed to pull license monitor request")
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

func LicenseCheckOnInternalNetwork(license issuerv1.License) (map[string]interface{}, bool) {
	license.Spec.Key = Key
	return crypto.IsLicenseValid(license)
}

func RechargeByLicense(ctx context.Context, client client.Client, account accountv1.Account, payload map[string]interface{}) error {
	if !ContainsFields(payload, "amt") {
		return nil
	}
	amount, err := InterfaceToInt64(payload["amt"])
	if err != nil {
		return errors.New("amount error type")
	}
	charge := amount * count.CurrencyUnit
	account.Status.Balance += charge
	err = crypto.RechargeBalance(account.Status.EncryptBalance, charge)
	if err != nil {
		logger.Error(err, "Failed to crypto the account balance")
		return err
	}
	err = client.Status().Update(ctx, &account)
	if err != nil {
		logger.Error(err, "Recharge Failed, failed to modify the status")
		return err
	}

	return nil
}

func RecordLicense(ctx context.Context, client client.Client, ls issuerv1.License, lsh corev1.ConfigMap) error {
	size := int64(0)
	for _, value := range lsh.Data {
		size += int64(len(value))
	}
	maxSizeThreshold := resource.MustParse(MaxSizeThresholdStr)
	if size >= maxSizeThreshold.Value() {
		lsh.Data = make(map[string]string)
	}
	tmpValue := make(map[string]interface{})
	for k, v := range lsh.Data {
		tmpValue[k] = v
	}
	suffix := GetNextMapKeySuffix(tmpValue, "license")
	newLicenseKeyName := "license-" + strconv.Itoa(suffix)
	if lsh.Data == nil {
		lsh.Data = make(map[string]string)
	}
	lsh.Data[newLicenseKeyName] = ls.Spec.Token
	err := client.Update(ctx, &lsh)
	if err != nil {
		logger.Error(err, "failed to store license")
		return err
	}
	return nil
}

func CheckLicenseExists(configMap *corev1.ConfigMap, token string) bool {
	for _, storedLicense := range configMap.Data {
		if storedLicense == token {
			return true
		}
	}
	return false
}

func GetNextMapKeySuffix(data map[string]interface{}, prefix string) int {
	maxSuffix := 0
	for key := range data {
		var currentSuffix int
		_, err := fmt.Sscanf(key, prefix+"-%d", &currentSuffix)
		if err == nil && currentSuffix > maxSuffix {
			maxSuffix = currentSuffix
		}
	}
	return maxSuffix + 1
}

func ContainsFields(data map[string]interface{}, fields ...string) bool {
	for _, field := range fields {
		_, ok := data[field]
		if !ok {
			return false
		}
	}
	return true
}

func InterfaceToInt64(value interface{}) (int64, error) {
	switch v := value.(type) {
	case int64:
		return v, nil
	case float64:
		return int64(v), nil
	default:
		return 0, errors.New("cannot convert value of type to int64")
	}
}
