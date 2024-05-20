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

package controllers

import (
	"context"
	"os"
	"testing"

	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/database/mongo"

	"github.com/labring/sealos/controllers/pkg/types"
)

//func Test_giveGift(t *testing.T) {
//	type args struct {
//		amount int64
//	}
//	const BaseUnit = 1_000_000
//	tests := []struct {
//		name string
//		args args
//		want int64
//	}{
//		// [1-298] -> 0%, [299-598] -> 10%, [599-1998] -> 15%, [1999-4998] -> 20%, [4999-19998] -> 25%, [19999+] -> 30%
//		{name: "0% less than 299", args: args{amount: 100 * BaseUnit}, want: 0 + 100*BaseUnit},
//		{name: "10% between 299 and 599", args: args{amount: 299 * BaseUnit}, want: 29_900_000 + 299*BaseUnit},
//		{name: "10% between 299 and 599", args: args{amount: 300 * BaseUnit}, want: 30_000_000 + 300*BaseUnit},
//		{name: "15% between 599 and 1999", args: args{amount: 599 * BaseUnit}, want: 89_850_000 + 599*BaseUnit},
//		{name: "15% between 599 and 1999", args: args{amount: 600 * BaseUnit}, want: 90_000_000 + 600*BaseUnit},
//		{name: "20% between 1999 and 4999", args: args{amount: 1999 * BaseUnit}, want: 399_800_000 + 1999*BaseUnit},
//		{name: "20% between 1999 and 4999", args: args{amount: 2000 * BaseUnit}, want: 400_000_000 + 2000*BaseUnit},
//		{name: "25% between 4999 and 19999", args: args{amount: 4999 * BaseUnit}, want: 1249_750_000 + 4999*BaseUnit},
//		{name: "25% between 4999 and 19999", args: args{amount: 5000 * BaseUnit}, want: 1250_000_000 + 5000*BaseUnit},
//		{name: "30% more than 19999", args: args{amount: 19999 * BaseUnit}, want: 5999_700_000 + 19999*BaseUnit},
//		{name: "30% more than 19999", args: args{amount: 20000 * BaseUnit}, want: 6000_000_000 + 20000*BaseUnit},
//		{name: "30% more than 19999", args: args{amount: 99999 * BaseUnit}, want: 29999_700_000 + 99999*BaseUnit},
//		{"0% less than 299", args{amount: 1 * BaseUnit}, 1 * BaseUnit},
//	}
//
//	configMap := &corev1.ConfigMap{}
//	configMap.Data = make(map[string]string)
//	configMap.Data["steps"] = "299,599,1999,4999,19999"
//	configMap.Data["ratios"] = "10.0,15.0,20.0,25.0,30.0"
//
//	for _, tt := range tests {
//		t.Run(tt.name, func(t *testing.T) {
//			if got, _ := giveGift(tt.args.amount, configMap); got != tt.want {
//				t.Errorf("giveGift() = %v, want %v", got, tt.want)
//			}
//		})
//	}
//}

func Test_getAmountWithDiscount(t *testing.T) {
	type args struct {
		amount   int64
		discount types.RechargeDiscount
	}
	tests := []struct {
		name string
		args args
		want int64
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := getAmountWithDiscount(tt.args.amount, tt.args.discount); got != tt.want {
				t.Errorf("getAmountWithDiscount() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestAccountReconciler_BillingCVM(t *testing.T) {
	dbCtx := context.Background()
	cvmDBClient, err := mongo.NewMongoInterface(dbCtx, os.Getenv(database.CVMMongoURI))
	if err != nil {
		t.Fatalf("unable to connect to mongo: %v", err)
	}
	defer func() {
		if cvmDBClient != nil {
			err := cvmDBClient.Disconnect(dbCtx)
			if err != nil {
				t.Errorf("unable to disconnect from mongo: %v", err)
			}
		}
	}()
	v2Account, err := cockroach.NewCockRoach(os.Getenv(database.GlobalCockroachURI), os.Getenv(database.LocalCockroachURI))
	if err != nil {
		t.Fatalf("unable to connect to cockroach: %v", err)
	}
	defer func() {
		err := v2Account.Close()
		if err != nil {
			t.Errorf("unable to disconnect from cockroach: %v", err)
		}
	}()
	DBClient, err := mongo.NewMongoInterface(dbCtx, os.Getenv(database.MongoURI))
	if err != nil {
		t.Fatalf("unable to connect to mongo: %v", err)
	}
	defer func() {
		err := DBClient.Disconnect(dbCtx)
		if err != nil {
			t.Errorf("unable to disconnect from mongo: %v", err)
		}
	}()

	r := &AccountReconciler{
		AccountV2:   v2Account,
		DBClient:    DBClient,
		CVMDBClient: cvmDBClient,
		Logger:      ctrl.Log.WithName("controllers").WithName("AccountReconciler"),
	}
	if err := r.BillingCVM(); err != nil {
		t.Errorf("AccountReconciler.BillingCVM() error = %v", err)
	}
}
