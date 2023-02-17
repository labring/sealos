package aliyun

import (
	"fmt"

	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

type ECSDeleteKeyPairAPI interface {
	DeleteKeyPairs(request *ecs.DeleteKeyPairsRequest) (response *ecs.DeleteKeyPairsResponse, err error)
}

func DeleteKeyPairs(api ECSDeleteKeyPairAPI, request *ecs.DeleteKeyPairsRequest) (*ecs.DeleteKeyPairsResponse, error) {
	return api.DeleteKeyPairs(request)
}

func (d Driver) deleteKeyPair(infra *v1.Infra) error {
	client := d.Client
	deleteKeyPairRequest := &ecs.DeleteKeyPairsRequest{
		RpcRequest:   ecs.CreateDeleteKeyPairsRequest().RpcRequest,
		KeyPairNames: "[\"" + infra.Spec.SSH.PkName + "\"]",
	}

	_, err := DeleteKeyPairs(client, deleteKeyPairRequest)
	if err != nil {
		return fmt.Errorf("failed to delete keypair %s: %v", infra.UID, err)
	}

	return nil
}
