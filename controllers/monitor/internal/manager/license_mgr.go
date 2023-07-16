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
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-logr/logr"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	cloudv1 "github.com/labring/sealos/controllers/monitor/api/v1"
	"github.com/labring/sealos/controllers/pkg/crypto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const MaxSizeThresholdStr = "800Ki"

const Field1 = "nod"
const Field2 = "cpu"
const Field3 = "tte"
const Field4 = "adn"
const Field5 = "adc"

type LicenseMonitorRequest struct {
	UID   string `json:"uid"`
	Token string `json:"token"`
}

type LicenseMonitorResponse struct {
	Key string `json:"key"`
}

func NewLicenseMonitorRequest(secret corev1.Secret, license cloudv1.License) LicenseMonitorRequest {
	if secret.Name != string(UidSecretName) || secret.Namespace != string(Namespace) {
		return LicenseMonitorRequest{}
	}
	var lmr LicenseMonitorRequest
	lmr.Token = license.Spec.Token
	lmr.UID = string(secret.Data["uid"])
	return lmr
}

func LicenseCheckOnExternalNetwork(license cloudv1.License, secret corev1.Secret, url string, logger logr.Logger) (map[string]interface{}, bool) {
	license.Spec.Key = Key
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
	license.Spec.Key = Key
	return crypto.IsLicenseValid(license)
}

type ClusterExpectScale struct {
	NodeLimit int64 `json:"nodeLimit"`
	CpuLimit  int64 `json:"cpuLimit"`
	Expire    int64 `json:"expire"`
}

func NewClusterExpectScale(nods, cpus, days int64) ClusterExpectScale {
	return ClusterExpectScale{
		NodeLimit: nods,
		CpuLimit:  cpus,
		Expire:    time.Now().Add(time.Hour * 24 * time.Duration(days)).Unix(),
	}
}

func ExpandClusterScale(current *ClusterExpectScale, nods, cpus, days int64) ClusterExpectScale {
	return ClusterExpectScale{
		NodeLimit: current.NodeLimit + nods,
		CpuLimit:  current.CpuLimit + cpus,
		Expire:    time.Now().Add(time.Hour * 24 * time.Duration(days)).Unix(),
	}
}

/******************************************************/

func ParseScaleData(secretData map[string][]byte) (map[string]ClusterExpectScale, error) {
	result := make(map[string]ClusterExpectScale)

	for key, value := range secretData {
		var scaleData ClusterExpectScale
		err := json.Unmarshal(value, &scaleData)
		if err != nil {
			return nil, fmt.Errorf("failed to parse JSON data for key %s: %v", key, err)
		}
		result[key] = scaleData
	}

	return result, nil
}

func DeleteExpireScales(data map[string]ClusterExpectScale) {
	current := time.Now().Unix()
	for key, val := range data {
		if val.Expire < current {
			delete(data, key)
		}
	}
}

type GetScaleByCondition func(data map[string]ClusterExpectScale) (string, ClusterExpectScale)

func GetScaleOfMaxNodes(data map[string]ClusterExpectScale) (string, ClusterExpectScale) {
	var clusterExpectScale ClusterExpectScale
	CmpNodes := func(value *ClusterExpectScale) bool {
		if value.NodeLimit > clusterExpectScale.NodeLimit {
			clusterExpectScale = *value
			return true
		}
		return false
	}
	var key string
	for k, v := range data {
		if CmpNodes(&v) {
			key = k
		}
	}
	return key, clusterExpectScale
}

func GetScaleOfMaxCpu(data map[string]ClusterExpectScale) (string, ClusterExpectScale) {
	var clusterExpectScale ClusterExpectScale
	CmpCpus := func(value *ClusterExpectScale) bool {
		if value.CpuLimit > clusterExpectScale.CpuLimit {
			clusterExpectScale = *value
			return true
		}
		return false
	}
	var key string
	for k, v := range data {
		if CmpCpus(&v) {
			key = k
		}
	}
	return key, clusterExpectScale
}

func GetCurrentScale(data map[string]ClusterExpectScale,
	maxNodeCondition GetScaleByCondition,
	maxCpuCondition GetScaleByCondition) ClusterExpectScale {
	key1, value1 := maxCpuCondition(data)
	key2, value2 := maxNodeCondition(data)
	if key1 == key2 {
		return value1
	}
	getMaxValue := func(a int64, b int64) int64 {
		if a > b {
			return a
		}
		return b
	}
	getMinValue := func(a int64, b int64) int64 {
		if a < b {
			return a
		}
		return b
	}
	var currentScale ClusterExpectScale
	currentScale.CpuLimit = getMaxValue(value1.CpuLimit, value2.CpuLimit)
	currentScale.NodeLimit = getMaxValue(value1.NodeLimit, value2.NodeLimit)
	currentScale.Expire = getMinValue(value1.Expire, value2.Expire)

	return currentScale
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

func ContainsFields(data map[string]interface{}, fields ...string) bool {
	for _, field := range fields {
		_, ok := data[field]
		if !ok {
			return false
		}
	}
	return true
}

func RechargeByLicense(ctx context.Context, client client.Client, logger logr.Logger, account accountv1.Account, payload map[string]interface{}) error {
	if !ContainsFields(payload, "amt") {
		return nil
	}
	amount, err := InterfaceToInt64(payload["amt"])
	if err != nil {
		return errors.New("amount error type")
	}
	charge := amount * BaseCount
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

func RecordLicense(ctx context.Context, client client.Client, logger logr.Logger, ls cloudv1.License, lsh corev1.ConfigMap) error {
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

func AdjustScaleOfCluster(ctx context.Context, client client.Client, logger logr.Logger, ls cloudv1.License, css corev1.Secret, payload map[string]interface{}) error {
	if !ContainsFields(payload, Field1, Field2, Field3) {
		return nil
	}
	nodes, err := InterfaceToInt64(payload[Field1])
	if err != nil {
		return err
	}
	cpus, err := InterfaceToInt64(payload[Field2])
	if err != nil {
		return err
	}
	days, err := InterfaceToInt64(payload[Field3])
	if err != nil {
		return err
	}
	newClusterScale := NewClusterExpectScale(nodes, cpus, days)
	err = updateSecret(newClusterScale, &css)
	if err != nil {
		return fmt.Errorf("failed to update secret: %w", err)
	}
	return client.Update(ctx, &css)
}

func ExpandScaleOfClusterTemp(ctx context.Context, client client.Client, logger logr.Logger, ls cloudv1.License, css corev1.Secret, payload map[string]interface{}) error {
	if !ContainsFields(payload, Field3, Field4, Field5) {
		return nil
	}
	addNodes, err := InterfaceToInt64(payload[Field4])
	if err != nil {
		logger.Error(err, "failed to convert interface to int64")
		return err
	}
	addCpus, err := InterfaceToInt64(payload[Field5])
	if err != nil {
		logger.Error(err, "failed to convert interface to int64")
		return err
	}
	days, err := InterfaceToInt64(payload[Field3])
	if err != nil {
		logger.Error(err, "failed to convert interface to int64")
		return err
	}

	mapClusterScale, err := ParseScaleData(css.Data)
	if err != nil {
		logger.Error(err, "failed to parse scale data")
		return err
	}
	currentClusterScale := GetCurrentScale(mapClusterScale, GetScaleOfMaxNodes, GetScaleOfMaxCpu)

	newClusterScale := ExpandClusterScale(&currentClusterScale, addNodes, addCpus, days)

	err = updateSecret(newClusterScale, &css)
	if err != nil {
		logger.Error(err, "failed to update secret")
		return fmt.Errorf("failed to update secret: %w", err)
	}
	return client.Update(ctx, &css)
}

func updateSecret(ces ClusterExpectScale, css *corev1.Secret) error {
	newClusterScaleString, err := json.Marshal(ces)
	if err != nil {
		return fmt.Errorf("failed to parse cluster limit: %w", err)
	}
	if css.Data == nil {
		css.Data = make(map[string][]byte)
	}
	tmpValue := make(map[string]interface{})
	for k, v := range css.Data {
		tmpValue[k] = v
	}
	suffix := GetNextMapKeySuffix(tmpValue, "cluster-scale")
	newKeyName := "cluster-scale-" + strconv.Itoa(suffix)
	css.Data[newKeyName] = []byte(newClusterScaleString)
	return nil
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

func CheckLicenseExists(configMap *corev1.ConfigMap, license string) bool {
	for _, storedLicense := range configMap.Data {
		if storedLicense == license {
			return true
		}
	}

	return false
}
