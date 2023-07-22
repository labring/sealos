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
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-logr/logr"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	issuerv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	"github.com/labring/sealos/controllers/pkg/crypto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const MaxSizeThresholdStr = "800Ki"

const LicenseLifetime = time.Hour * 24 // 24 hours

const (
	CreatTimeField = "iat"
	NodeField      = "nod"
	CPUField       = "cpu"
	DurationField  = "tte"
	AddNodeField   = "and"
	AddCPUField    = "adc"
)

const retryInterval = time.Second * 5 // Retry every 5 seconds
const timeout = time.Minute * 3       // Stop retrying after 3 minutes

type Operation interface {
	Execute() error
}

type ReadOperationList struct {
	readOperations []Operation
}

type WriteOperationList struct {
	writeOperations []Operation
}

type ReWriteOperationList struct {
	reWriteOperations []Operation
}

func (list *ReadOperationList) Execute() error {
	for _, op := range list.readOperations {
		err := op.Execute()
		if err != nil {
			return err
		}
	}
	return nil
}

func (list *WriteOperationList) Execute() error {
	reWriteList := &ReWriteOperationList{}

	for _, op := range list.writeOperations {
		err := op.Execute()
		if err != nil {
			reWriteList.AddToList(op)
		}
	}

	if len(reWriteList.reWriteOperations) > 0 {
		err := reWriteList.Execute()
		if err != nil {
			return fmt.Errorf("an error occurred, some operations still failed after retries: %v", err)
		}
	}

	return nil
}

func (list *ReWriteOperationList) AddToList(op Operation) {
	list.reWriteOperations = append(list.reWriteOperations, op)
}

func (list *ReWriteOperationList) Execute() error {
	startTime := time.Now()
	for {
		remainingOps := []Operation{}

		for _, op := range list.reWriteOperations {
			err := op.Execute()
			if err != nil {
				remainingOps = append(remainingOps, op)
			}
		}

		if len(remainingOps) == 0 {
			break
		}

		// Update the list of reWriteOperations with the remaining operations
		list.reWriteOperations = remainingOps

		// Check if the timeout has been reached
		if time.Since(startTime) >= timeout {
			return fmt.Errorf("timeout reached, some operations still failed")
		}

		// Wait for the retry interval before trying again
		time.Sleep(retryInterval)
	}

	return nil
}

type ReadEventBuilder struct {
	obj      client.Object
	ctx      context.Context
	client   client.Client
	tag      types.NamespacedName
	callback WriteFunc
}

type WriteEventBuilder struct {
	callback WriteFunc
}

type WriteFunc func() error

func (reb *ReadEventBuilder) WithClient(client client.Client) *ReadEventBuilder {
	reb.client = client
	return reb
}

func (reb *ReadEventBuilder) WithContext(ctx context.Context) *ReadEventBuilder {
	reb.ctx = ctx
	return reb
}

func (reb *ReadEventBuilder) WithObject(obj client.Object) *ReadEventBuilder {
	reb.obj = obj
	return reb
}
func (reb *ReadEventBuilder) WithCallback(callback WriteFunc) *ReadEventBuilder {
	reb.callback = callback
	return reb
}

func (reb *ReadEventBuilder) WithTag(tag types.NamespacedName) *ReadEventBuilder {
	reb.tag = tag
	return reb
}

func (reb *ReadEventBuilder) Read() error {
	err := reb.client.Get(reb.ctx, reb.tag, reb.obj)
	if err != nil && reb.callback != nil {
		return reb.callback()
	}
	return err
}

func (reb *ReadEventBuilder) AddToList(list *ReadOperationList) *ReadOperationList {
	list.readOperations = append(list.readOperations, reb)
	return list
}

func (reb *ReadEventBuilder) Execute() error {
	if reb != nil {
		return reb.Read()
	}
	return fmt.Errorf("ReadEventBuilder excute error: %s", "value can't be nil")
}

func (web *WriteEventBuilder) WithCallback(callback WriteFunc) *WriteEventBuilder {
	web.callback = callback
	return web
}

func (web *WriteEventBuilder) Write() error {
	if web.callback == nil {
		return nil
	}
	return web.callback()
}

func (web *WriteEventBuilder) Execute() error {
	if web != nil {
		return web.Write()
	}
	return fmt.Errorf("WriteEventBuilder excute error: %s", "value can't be nil")
}

func (web *WriteEventBuilder) AddToList(list *WriteOperationList) *WriteOperationList {
	list.writeOperations = append(list.writeOperations, web)
	return list
}

type LicenseMonitorRequest struct {
	UID   string `json:"uid"`
	Token string `json:"token"`
}

type LicenseMonitorResponse struct {
	Key string `json:"key"`
}

func NewLicenseMonitorRequest(secret corev1.Secret, license issuerv1.License) LicenseMonitorRequest {
	if secret.Name != string(UIDSecretName) || secret.Namespace != string(Namespace) {
		return LicenseMonitorRequest{}
	}
	var lmr LicenseMonitorRequest
	lmr.Token = license.Spec.Token
	lmr.UID = string(secret.Data["uid"])
	return lmr
}

func LicenseCheckOnExternalNetwork(license issuerv1.License, secret corev1.Secret, url string, logger logr.Logger) (map[string]interface{}, bool) {
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

func LicenseCheckOnInternalNetwork(license issuerv1.License) (map[string]interface{}, bool) {
	license.Spec.Key = Key
	return crypto.IsLicenseValid(license)
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

func RecordLicense(ctx context.Context, client client.Client, logger logr.Logger, ls issuerv1.License, lsh corev1.ConfigMap) error {
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

func CheckLicenseExists(configMap *corev1.ConfigMap, license string) bool {
	for _, storedLicense := range configMap.Data {
		if storedLicense == license {
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
