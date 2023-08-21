// Copyright © 2023 sealos.
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

package api

import (
	"context"

	"github.com/labring/sealos/controllers/pkg/crypto"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
)

func RechargeAccount(AccountName, namespace string, amount int64) error {
	account, err := GetAccount(namespace, AccountName)
	if err != nil {
		return err
	}
	account.Status.Balance = amount
	account.Status.EncryptBalance, _ = crypto.EncryptInt64(amount)
	client := baseapi.GetDefaultDynamicClient()
	gvr := accountv1.GroupVersion.WithResource("accounts")
	unstructured2, err := runtime.DefaultUnstructuredConverter.ToUnstructured(account)
	if err != nil {
		return err
	}
	un := &unstructured.Unstructured{Object: unstructured2}
	_, err = client.Resource(gvr).Namespace(namespace).UpdateStatus(context.Background(), un, metav1.UpdateOptions{})
	if err != nil {
		return err
	}
	return nil
}

func DeductionAccount(AccountName, namespace string, amount int64) error {
	account, err := GetAccount(namespace, AccountName)
	if err != nil {
		return err
	}
	account.Status.DeductionBalance = amount
	account.Status.EncryptDeductionBalance, _ = crypto.EncryptInt64(amount)
	client := baseapi.GetDefaultDynamicClient()
	gvr := accountv1.GroupVersion.WithResource("accounts")
	unstructured2, err := runtime.DefaultUnstructuredConverter.ToUnstructured(account)
	if err != nil {
		return err
	}
	un := &unstructured.Unstructured{Object: unstructured2}
	_, err = client.Resource(gvr).Namespace(namespace).UpdateStatus(context.Background(), un, metav1.UpdateOptions{})
	if err != nil {
		return err
	}
	return nil
}

func GetAccount(namespace string, name string) (*accountv1.Account, error) {
	gvr := accountv1.GroupVersion.WithResource("accounts")
	var account accountv1.Account
	if err := baseapi.GetObject(namespace, name, gvr, &account); err != nil {
		return nil, err
	}
	return &account, nil
}
