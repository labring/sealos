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

package controller

import (
	"context"

	"github.com/go-logr/logr"

	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"sigs.k8s.io/controller-runtime/pkg/client"

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	"github.com/labring/sealos/controllers/license/internal/util/claims"
	"github.com/labring/sealos/controllers/license/internal/util/cluster"
	licenseutil "github.com/labring/sealos/controllers/license/internal/util/license"
)

type LicenseValidator struct {
	client.Client
	Logger    logr.Logger
	ClusterID string
}

func (v *LicenseValidator) Validate(license *licensev1.License) (licensev1.ValidationCode, error) {
	nodeList := &v1.NodeList{}
	if err := v.Client.List(context.Background(), nodeList); err != nil {
		return licensev1.ValidationError, err
	}
	nodeCount := len(nodeList.Items)
	totalCPU := resource.NewQuantity(0, resource.DecimalSI)
	totalMemory := resource.NewQuantity(0, resource.BinarySI)

	for _, node := range nodeList.Items {
		allocatable := node.Status.Allocatable
		totalCPU.Add(*allocatable.Cpu())
		totalMemory.Add(*allocatable.Memory())
	}

	clusterInfo := &cluster.Info{
		ClusterID: v.ClusterID,
		ClusterClaimData: claims.ClusterClaimData{
			NodeCount:   nodeCount,
			TotalCPU:    int(totalCPU.MilliValue() / 1000),
			TotalMemory: int(totalMemory.Value() / (1024 * 1024 * 1024)),
		},
	}
	v.Logger.Info("Validating license", "cluster info", clusterInfo, "license token", license.Spec.Token)
	return licenseutil.IsLicenseValid(license, clusterInfo, v.ClusterID)
}
