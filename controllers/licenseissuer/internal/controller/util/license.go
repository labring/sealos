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
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	issuerv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	"go.mongodb.org/mongo-driver/bson"

	"github.com/go-logr/logr"
	count "github.com/labring/sealos/controllers/common/account"
	"github.com/labring/sealos/controllers/pkg/crypto"
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

func LicenseCheck(meta LicenseMeta) (map[string]interface{}, bool) {
	return crypto.IsLicenseValid(meta.Token, Key)
}

func AuthorizeAccountQuota(ctx context.Context, client client.Client, account accountv1.Account, payload map[string]interface{}) error {
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

func AuthorizeClusterQuota(ctx context.Context, client client.Client, csb *issuerv1.ClusterScaleBilling, payload map[string]interface{}) error {
	amtADD, ok := payload[Amount].(float64)
	if !ok {
		return errors.New("amount error type")
	}

	EncryptQuota := csb.Status.EncryptQuota
	decryptQuota, err := crypto.DecryptInt64WithKey(EncryptQuota, []byte(CryptoKey))
	if err != nil {
		return err
	}
	newQuata := decryptQuota + int64(amtADD)*count.CurrencyUnit
	NewEncryptQuota, err := crypto.EncryptInt64WithKey(newQuata, []byte(CryptoKey))
	if err != nil {
		return err
	}
	csb.Status.EncryptQuota = *NewEncryptQuota
	// Update the quota
	csb.Status.Quota = newQuata
	// Trigger the cluster scale quota
	GetTrigger().TriggerForClusterScaleQuato(newQuata)
	err = client.Status().Update(ctx, csb)
	if err != nil {
		return err
	}
	return nil
}

func SetLicensePolicy(policy string) error {
	switch policy {
	case BillingByScale:
		GetTrigger().TriggerForClusterPolicy(BillingByScale)
		return nil
	default:
		return errors.New("invalid policy")
	}
}

func RecordLicense(handler MongoHandler, license interface{}) error {
	doc, err := BsonMFrom(license)
	if err != nil {
		return err
	}
	err = handler.InsertDoc(doc)
	if err != nil {
		return err
	}
	return nil
}

func CheckLicense(meta LicenseMeta, handler MongoHandler) (string, map[string]interface{}, bool) {
	// Check if the license is already used
	ok := CheckLicenseExists(meta, handler)

	if ok {
		return DuplicateLicenseMessage, nil, false
	}

	// Check if the license is valid
	payload, ok := LicenseCheck(meta)
	if !ok {
		return InvalidLicenseMessage, nil, false
	}
	// CHECK: if the license is free license for trial version
	if ContainsFields(payload, Type) && payload[Type] == Free {
		return "", payload, true
	}

	// Check if the license is used by the correct user
	saltKey := GetOptions().GetEnvOptions().SaltKey
	hashID := HashCrypto(saltKey)
	if str, ok := payload[HashID].(string); !ok || str != hashID {
		return InvalidLicenseMessage, nil, false
	}

	return "", payload, true
}

func CheckLicenseExists(meta LicenseMeta, db MongoHandler) bool {
	// database check
	filter := bson.M{"meta.token": meta.Token}
	ok := db.IsExisted(filter)

	// etcd check
	// ...
	return ok
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

//--------------------- license Data --------------------- //

const DefaultColForLicense = "license"

type LicenseMeta struct {
	Token      string `bson:"token" json:"token"`
	CreateTime string `bson:"createTime" json:"createTime"`
}

type License struct {
	UID     string                 `bson:"uid" json:"uid"`
	Meta    LicenseMeta            `bson:"meta" json:"meta"`
	Payload map[string]interface{} `bson:"payload" json:"payload"`
}

type ClusterLicense struct {
	Meta    LicenseMeta            `bson:"meta" json:"meta"`
	Payload map[string]interface{} `bson:"payload" json:"payload"`
}

type LicenseResult struct {
	License License `bson:"license" json:"license"`
}

func NewLicense(uid string, token string, payload map[string]interface{}) License {
	return License{
		UID:     uid,
		Meta:    LicenseMeta{Token: token, CreateTime: time.Now().Format("2006-01-02")},
		Payload: payload,
	}
}

func HashCrypto(text string) string {
	hash := sha256.Sum256([]byte(text))
	hashInHex := hex.EncodeToString(hash[:])
	return hashInHex
}
