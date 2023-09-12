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
	"sync"

	"github.com/apache/apisix-ingress-controller/pkg/log"
	issuerv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	"github.com/labring/sealos/controllers/pkg/crypto"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// used to update the expected status and actual status
type Monitor interface {
	Metering(ctx context.Context, client client.Client) error
}

// used to validate status is expected or not
type Validator interface {
	Validate() bool
}

// Trigger is a interface to update the expected status immediately when license applied
type Trigger interface {
	TriggerForClusterScaleQuato(quota int64)
}

func GetValidator() Validator {
	return GetClusterStatus()
}

func GetTrigger() Trigger {
	return GetClusterStatus()
}

func GetMonitor() Monitor {
	return GetClusterStatus()
}

type ClusterStatus struct {
	lock          sync.Mutex
	BillingPolicy string                    `json:"licensePolicy"`
	CSBS          ClusterScaleBillingStatus `json:"csbs"`
}

var _ Monitor = &ClusterStatus{}
var _ Validator = &ClusterStatus{}
var _ Trigger = &ClusterStatus{}

type ClusterScaleBillingStatus struct {
	Used  int64 `json:"used"`
	Quota int64 `json:"quata"`
}

// singleton
var clusterStatus *ClusterStatus

func GetClusterStatus() *ClusterStatus {
	if clusterStatus == nil {
		clusterStatus = &ClusterStatus{
			lock:          sync.Mutex{},
			BillingPolicy: GetOptions().GetEnvOptions().BillingPolicy,
		}
	}
	return clusterStatus
}

func (cv *ClusterStatus) Metering(ctx context.Context, client client.Client) error {
	cv.lock.Lock()
	defer cv.lock.Unlock()
	switch cv.BillingPolicy {
	case BillingByScale:
		return cv.meteringForClusterScaleBilling(ctx, client)
	default:
		return nil
	}
}

func (cv *ClusterStatus) meteringForClusterScaleBilling(ctx context.Context, client client.Client) error {
	csb := &issuerv1.ClusterScaleBilling{}
	id := types.NamespacedName{
		Name:      ScaleBilling,
		Namespace: GetOptions().GetEnvOptions().Namespace,
	}
	if err := client.Get(ctx, id, csb); err != nil {
		cv.CSBS.Quota = 0
		log.Infof("Failed to get cluster scale billing: %v", err)
		return err
	}
	quota, err := crypto.DecryptInt64WithKey(csb.Status.EncryptQuota, []byte(CryptoKey))
	if err != nil {
		cv.CSBS.Quota = 0
	} else {
		cv.CSBS.Quota = quota
	}
	used, err := crypto.DecryptInt64WithKey(csb.Status.EncryptUsed, []byte(CryptoKey))
	if err != nil {
		cv.CSBS.Used = quota + 1
	} else {
		cv.CSBS.Used = used
	}
	return nil
}

func (cv *ClusterStatus) Validate() bool {
	cv.lock.Lock()
	defer cv.lock.Unlock()
	switch cv.BillingPolicy {
	case BillingByScale:
		return cv.validateForClusterScaleBilling()
	default:
		return true
	}
}

func (cv *ClusterStatus) validateForClusterScaleBilling() bool {
	if cv.CSBS.Used > cv.CSBS.Quota {
		return false
	}
	return true
}

func (cv *ClusterStatus) TriggerForClusterScaleQuato(quota int64) {
	cv.lock.Lock()
	defer cv.lock.Unlock()
	cv.CSBS.Quota = quota
}
