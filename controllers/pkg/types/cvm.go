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

package types

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CVMBilling represents the billing information of a CloudVirtualMachine instance
type CVMBilling struct {
	ID           primitive.ObjectID `json:"_id" bson:"_id"`
	InstanceName string             `json:"instanceName"`
	//Namespace    string             `json:"namespace"`
	//VirtualMachinePackageId string           `json:"virtualMachinePackageId"`
	StartAt time.Time `json:"startAt"`
	EndAt   time.Time `json:"endAt"`
	//CloudProvider           CvmCloudProvider `json:"cloudProvider"`
	//SealosUserID       string  `json:"sealosUserId"`
	SealosUserUID      string  `json:"sealosUserUid"`
	SealosRegionUID    string  `json:"sealosRegionUid"`
	SealosRegionDomain string  `json:"sealosRegionDomain"`
	Amount             float64 `json:"amount"`
	Detail             struct {
		Instance float64 `json:"instance"`
		Network  float64 `json:"network"`
		Disk     float64 `json:"disk"`
	}
	State CvmBillingStatus `json:"state"`
}

const (
	CVMBillingStatePending = "Pending"
	CVMBillingStateDone    = "Done"

	CVMCloudProviderTencent = "tencent"
)

type (
	CvmBillingStatus string
	CvmCloudProvider string
)
