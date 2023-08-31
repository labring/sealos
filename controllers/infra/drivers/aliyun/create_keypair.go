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

package aliyun

import (
	"fmt"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/controllers/infra/common"

	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

type ECSCreateKeyPairAPI interface {
	CreateKeyPair(request *ecs.CreateKeyPairRequest) (response *ecs.CreateKeyPairResponse, err error)
}

func CreateKeyPair(api ECSCreateKeyPairAPI, request *ecs.CreateKeyPairRequest) (*ecs.CreateKeyPairResponse, error) {
	return api.CreateKeyPair(request)
}

func (d Driver) createKeyPair(infra *v1.Infra) error {
	if infra.Spec.SSH.PkData != "" {
		return nil
	}
	client := d.ECSClient
	keyPairName := getKeyPairName(infra)
	keyPairTag := getKeyPairTag(infra)
	createKeyPairRequest := &ecs.CreateKeyPairRequest{
		RpcRequest:      ecs.CreateCreateKeyPairRequest().RpcRequest,
		KeyPairName:     keyPairName,
		Tag:             keyPairTag,
		ResourceGroupId: d.ResourceGroupID,
	}

	result, err := CreateKeyPair(client, createKeyPairRequest)
	if err != nil {
		return fmt.Errorf("failed to create keypair %s: %v", infra.UID, err)
	}
	infra.Spec.SSH.PkName = result.KeyPairName
	infra.Spec.SSH.PkData = result.PrivateKeyBody
	logger.Info("Created keypair %s success", keyPairName)
	return nil
}

func getKeyPairName(infra *v1.Infra) string {
	return fmt.Sprintf("%s-%s", common.AliyunKeyPairPrefix, infra.UID)
}

func getKeyPairTag(infra *v1.Infra) *[]ecs.CreateKeyPairTag {
	keypairKey, keypairValue := common.KeyPairUser, infra.GetInstancesAndVolumesTag()
	keyTags := []ecs.CreateKeyPairTag{
		{
			Key:   keypairKey,
			Value: keypairValue,
		},
	}
	return &keyTags
}
