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
	"encoding/base64"
	"errors"
	"reflect"
	"time"

	"github.com/golang-jwt/jwt/v4"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/go-logr/logr"
	issuerv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	count "github.com/labring/sealos/controllers/pkg/account"
	"github.com/labring/sealos/controllers/pkg/crypto"
	"github.com/labring/sealos/controllers/pkg/database"
	mongoOptions "go.mongodb.org/mongo-driver/mongo/options"
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
	payload, ok := IsLicenseValid(license)
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
		return IsLicenseValid(license)
	}
	return payload, ok
}

func LicenseCheckOnInternalNetwork(license issuerv1.License) (map[string]interface{}, bool) {
	license.Spec.Key = Key
	return IsLicenseValid(license)
}

func IsLicenseValid(license issuerv1.License) (map[string]interface{}, bool) {
	decodeKey, err := base64.StdEncoding.DecodeString(license.Spec.Key)
	if err != nil {
		return nil, false
	}
	publicKey, err := crypto.ParseRSAPublicKeyFromPEM(string(decodeKey))
	//fmt.Println(string(decodeKey))
	if err != nil {
		return nil, false
	}
	keyFunc := func(token *jwt.Token) (interface{}, error) {
		return publicKey, nil
	}
	parsedToken, err := jwt.Parse(license.Spec.Token, keyFunc)
	if err != nil {
		return nil, false
	}

	claims, ok := parsedToken.Claims.(jwt.MapClaims)
	if ok && parsedToken.Valid {
		return claims, ok
	}
	return nil, false
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

func RecordLicense(dbCol LicenseDB, license License) error {
	err := dbCol.Record(license)
	if err != nil {
		logger.Error(err, "failed to record license")
		return err
	}
	return nil
}

func CheckLicenseExists(dbCol LicenseDB, uid string, token string) (bool, error) {
	ok, err := dbCol.IsExisted(uid, token)
	if err != nil {
		logger.Info("failed to check license exists")
		return false, err
	}

	return ok, nil
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

type LicenseDB interface {
	Record(license License) error
	QueryByUID(ns string, st int64, ed int64) ([]LicenseResult, error)

	IsExisted(uid string, token string) (bool, error)
	Disconnect() error
}

const DefaultColForLicense = "license"

type licenseDB struct {
	URI     string
	Client  *mongo.Client
	DBName  string
	COLName string
}

type License struct {
	UID        string                 `bson:"uid"`
	Token      string                 `bson:"token"`
	CreateTime string                 `bson:"createTime"`
	Payload    map[string]interface{} `bson:"payload"`
}

type LicenseResult struct {
	License License `bson:"license"`
}

func NewLicense(uid string, token string, payload map[string]interface{}) License {
	return License{
		UID:        uid,
		Token:      token,
		CreateTime: time.Now().Format("2006-01-02 15:04:05"),
		Payload:    payload,
	}
}

var _ LicenseDB = &licenseDB{}

func (db *licenseDB) IsExisted(uid string, token string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	filter := bson.M{"uid": uid, "license": bson.M{"$elemMatch": bson.M{"token": token}}}
	res := db.Client.Database(db.DBName).Collection(db.COLName).FindOne(ctx, filter)
	if res.Err() != nil {
		if res.Err().Error() == mongo.ErrNoDocuments.Error() {
			// not found
			return false, nil
		}
		return false, res.Err()
	}
	// found
	return true, nil
}

func (db *licenseDB) QueryByUID(uid string, st int64, ed int64) ([]LicenseResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	pipeline := []bson.M{
		{"$match": bson.M{"uid": uid}},
		{"$unwind": "$license"},
		{"$project": bson.M{"license": 1}},
		{"$project": bson.M{"_id": 0}},
		{"$match": bson.M{"license.token": bson.M{"$ne": ""}}},
		{"$sort": bson.M{"license.createTime": -1}},
		{"$skip": st},
		{"$limit": ed - st + 1},
	}

	cursor, err := db.Client.Database(db.DBName).Collection(db.COLName).Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}

	var res []LicenseResult
	err = cursor.All(ctx, &res)
	if err != nil {
		return nil, err
	}
	return res, nil
}

func (db *licenseDB) Record(license License) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	filter := bson.M{"uid": license.UID}
	update := bson.M{"$push": bson.M{"license": license}}
	updateOptions := mongoOptions.Update().SetUpsert(true)
	_, err := db.Client.Database(db.DBName).Collection(db.COLName).UpdateOne(ctx, filter, update, updateOptions)
	return err
}

func (db *licenseDB) Disconnect() error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	return db.Client.Disconnect(ctx)
}

func NewLicenseDB(uri string) (LicenseDB, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	clientOptions := mongoOptions.Client().ApplyURI(uri)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return &licenseDB{}, err
	}
	return &licenseDB{
		URI:     uri,
		Client:  client,
		DBName:  database.DefaultDBName,
		COLName: DefaultColForLicense,
	}, nil
}

type Map[T any] interface {
	Find(T) bool
	Add(T)
	Remove()
}

type HashMap[T comparable] struct {
	m map[T]int64
}

func NewHashMap[T comparable]() Map[T] {
	return &HashMap[T]{
		m: make(map[T]int64),
	}
}

func (hs *HashMap[T]) Find(item T) bool {
	_, ok := hs.m[item]
	return ok
}

func (hs *HashMap[T]) Add(item T) {
	hs.m[item] = time.Now().Unix()
}

func (hs *HashMap[T]) Remove() {
	// lifetime of item is 24 hours
	for k, v := range hs.m {
		if v+24*60*60*3 < time.Now().Unix() {
			delete(hs.m, k)
		}
	}
}

var singleton Map[string]

func GetHashMap() Map[string] {
	if singleton == nil {
		singleton = NewHashMap[string]()
	}
	return singleton
}

type Memory[T any] interface {
	Remove()
}

type MemoryClean struct {
	MM1 Memory[string]
}

func NewMemoryCleaner() *MemoryClean {
	return &MemoryClean{
		MM1: GetHashMap(),
	}
}

func (mc *MemoryClean) cleanWork(_ *TaskInstance) error {
	// range field
	v := reflect.ValueOf(mc)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}

	for i := 0; i < v.NumField(); i++ {
		value := v.Field(i)
		method := value.MethodByName("Remove")
		if method.IsValid() {
			method.Call(nil)
		}
	}
	return nil
}
