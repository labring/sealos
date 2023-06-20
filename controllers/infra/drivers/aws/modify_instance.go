package aws

import (
	"context"
	"fmt"
	"math"
	"time"

	"golang.org/x/sync/errgroup"

	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/controllers/infra/common"
)

type EC2ModifyInstancesAPI interface {
	ModifyInstanceAttribute(ctx context.Context,
		params *ec2.ModifyInstanceAttributeInput,
		optFns ...func(*ec2.Options)) (*ec2.ModifyInstanceAttributeOutput, error)
	StartInstances(ctx context.Context,
		params *ec2.StartInstancesInput,
		optFns ...func(*ec2.Options)) (*ec2.StartInstancesOutput, error)
}

func ModifyInstances(c context.Context, api EC2ModifyInstancesAPI, input *ec2.ModifyInstanceAttributeInput) (*ec2.ModifyInstanceAttributeOutput, error) {
	return api.ModifyInstanceAttribute(c, input)
}

func StartInstances(c context.Context, api EC2ModifyInstancesAPI, input *ec2.StartInstancesInput) (*ec2.StartInstancesOutput, error) {
	return api.StartInstances(c, input)
}

// modify instances flavor
func (d Driver) modifyInstances(curHost *v1.Hosts, desHost *v1.Hosts) error {
	client := d.Client
	eg, _ := errgroup.WithContext(context.Background())

	instanceID := make([]string, len(curHost.Metadata))
	for i, metadata := range curHost.Metadata {
		instanceID[i] = metadata.ID
	}

	err := d.stopInstances(curHost)
	if err != nil {
		return err
	}
	for i := range instanceID {
		id := instanceID[i]
		flavor := desHost.Flavor
		input := &ec2.ModifyInstanceAttributeInput{
			InstanceId: &id,
			InstanceType: &types.AttributeValue{
				Value: &flavor,
			},
		}
		eg.Go(func() error {
			return retryModifyInstance(common.TryTimes, common.TrySleepTime, client, input)
		})
	}
	if err = eg.Wait(); err != nil {
		return err
	}

	input := &ec2.StartInstancesInput{
		InstanceIds: instanceID,
	}

	_, err = StartInstances(context.TODO(), client, input)
	if err != nil {
		return fmt.Errorf("start instance error:%v", err)
	}

	return nil
}

func retryModifyInstance(tryTimes int, trySleepTime time.Duration, client *ec2.Client, inputModify *ec2.ModifyInstanceAttributeInput) error {
	var err error
	for i := 0; i < tryTimes; i++ {
		_, err = ModifyInstances(context.TODO(), client, inputModify)
		if err == nil {
			return nil
		}
		if i == tryTimes-1 {
			break
		}
		time.Sleep(trySleepTime * time.Duration(math.Pow(2, float64(i))))
	}
	return fmt.Errorf("retry modify instance action timeout:%v,instanceId:%s", err, *inputModify.InstanceId)
}
