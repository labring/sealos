package huawei

import (
	"fmt"

	"github.com/aliyun/alibaba-cloud-sdk-go/sdk/requests"
	"github.com/aliyun/alibaba-cloud-sdk-go/sdk/responses"
	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	"github.com/fanux/sealos/pkg/utils"
	"github.com/fanux/sealos/pkg/utils/logger"
)

func (a *HwProvider) RetryVpcRequest(request requests.AcsRequest, response responses.AcsResponse) error {
	return utils.Retry(TryTimes, TrySleepTime, func() error {
		//err := a.VpcClient.DoAction(request, response)
		//if err != nil {
		//	return err
		//}
		return nil
	})
}

func (a *HwProvider) RetryEcsRequest(request requests.AcsRequest, response responses.AcsResponse) error {
	return a.RetryEcsAction(request, response, TryTimes)
}

func (a *HwProvider) RetryEcsAction(request requests.AcsRequest, response responses.AcsResponse, tryTimes int) error {
	return utils.Retry(tryTimes, TrySleepTime, func() error {
		//err := a.EcsClient.DoAction(request, response)
		//if err != nil {
		//	return err
		//}
		return nil
	})
}

func (a *HwProvider) RetryEcsInstanceType(request requests.AcsRequest, response responses.AcsResponse, instances, instanceRole []string) error {
	for i := 0; i < len(instances); i++ {
		switch req := request.(type) {
		case *ecs.ModifyInstanceSpecRequest:
			req.InstanceType = instances[i]
		case *ecs.RunInstancesRequest:
			req.InstanceType = instances[i]
		}
		err := a.RetryEcsAction(request, response, 4)
		if err == nil {
			logger.Info("use instance type: %s", instances[i])
			j := a.Infra.Status.FindHostsByRoles(instanceRole)
			if j == -1 {
				return fmt.Errorf("failed to get ecs instance type, %v", "not find host status,pelase retry")
			}
			a.Infra.Status.Hosts[j].InstanceType = instances[i]
			break
		} else {
			logger.Warn("failed to get ecs instance type: %s", instances[i])
			if i == len(instances)-1 {
				return fmt.Errorf("failed to get ecs instance type, %v", err)
			}
		}
	}
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
