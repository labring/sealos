package huawei

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/def"

	"github.com/aliyun/alibaba-cloud-sdk-go/sdk/requests"
	"github.com/aliyun/alibaba-cloud-sdk-go/sdk/responses"
	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	"github.com/fanux/sealos/pkg/utils"
)

func (a *HwProvider) RetryVpcRequest(request interface{}, def *def.HttpRequestDef) (interface{}, error) {
	var respInterface interface{}
	var err error
	allErr := utils.Retry(TryTimes, TrySleepTime, func() error {
		respInterface, err = a.VpcClient.HcClient.Sync(request, def)
		if err != nil {
			return err
		}
		return nil
	})
	return respInterface, allErr
}

func (a *HwProvider) RetryEcsRequest(request interface{}, def *def.HttpRequestDef) (interface{}, error) {
	return a.RetryEcsAction(request, def, TryTimes)
}

func (a *HwProvider) RetryEcsAction(request interface{}, def *def.HttpRequestDef, tryTimes int) (interface{}, error) {
	var respInterface interface{}
	var err error
	allErr := utils.Retry(tryTimes, TrySleepTime, func() error {
		respInterface, err = a.EcsClient.HcClient.Sync(request, def)
		if err != nil {
			return err
		}
		return nil
	})
	return respInterface, allErr
}

func (a *HwProvider) RetryEcsInstanceType(request requests.AcsRequest, response responses.AcsResponse, instances, instanceRole []string) error {
	//for i := 0; i < len(instances); i++ {
	//	switch req := request.(type) {
	//	case *ecs.ModifyInstanceSpecRequest:
	//		req.InstanceType = instances[i]
	//	case *ecs.RunInstancesRequest:
	//		req.InstanceType = instances[i]
	//	}
	//	err := a.RetryEcsAction(request, response, 4)
	//	if err == nil {
	//		logger.Info("use instance type: %s", instances[i])
	//		j := a.Infra.Status.FindHostsByRoles(instanceRole)
	//		if j == -1 {
	//			return fmt.Errorf("failed to get ecs instance type, %v", "not find host status,pelase retry")
	//		}
	//		a.Infra.Status.Hosts[j].InstanceType = instances[i]
	//		break
	//	} else {
	//		logger.Warn("failed to get ecs instance type: %s", instances[i])
	//		if i == len(instances)-1 {
	//			return fmt.Errorf("failed to get ecs instance type, %v", err)
	//		}
	//	}
	//}
	return nil
}

func (a *HwProvider) TryGetInstance(request *ecs.DescribeInstancesRequest, response *ecs.DescribeInstancesResponse, expectCount int) error {
	return utils.Retry(TryTimes, TrySleepTime, func() error {
		//err := a.EcsClient.DoAction(request, response)
		//var ipList []string
		//if err != nil {
		//	return err
		//}
		//instances := response.Instances.Instance
		//if expectCount == -1 {
		//	return nil
		//}
		//
		//if len(instances) != expectCount {
		//	return errors.New("the number of instances is not as expected")
		//}
		//for _, instance := range instances {
		//	if instance.NetworkInterfaces.NetworkInterface[0].PrimaryIpAddress == "" {
		//		return errors.New("PrimaryIpAddress cannt nob be nil")
		//	}
		//	if len(ipList) != 0 && !utils.NotIn(instance.NetworkInterfaces.NetworkInterface[0].PrimaryIpAddress, ipList) {
		//		return errors.New("PrimaryIpAddress cannt nob be same")
		//	}
		//
		//	ipList = append(ipList, instance.NetworkInterfaces.NetworkInterface[0].PrimaryIpAddress)
		//}

		return nil
	})
}
