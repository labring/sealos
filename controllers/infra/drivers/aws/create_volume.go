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

type EC2CreateVolumeAPI interface {
	CreateVolume(ctx context.Context,
		params *ec2.CreateVolumeInput,
		optFns ...func(*ec2.Options)) (*ec2.CreateVolumeOutput, error)

	AttachVolume(ctx context.Context,
		params *ec2.AttachVolumeInput,
		optFns ...func(*ec2.Options)) (*ec2.AttachVolumeOutput, error)
}

func MakeVolume(c context.Context, api EC2CreateVolumeAPI, input *ec2.CreateVolumeInput) (*ec2.CreateVolumeOutput, error) {
	return api.CreateVolume(c, input)
}

func AttachVolume(c context.Context, api EC2CreateVolumeAPI, input *ec2.AttachVolumeInput) (*ec2.AttachVolumeOutput, error) {
	return api.AttachVolume(c, input)
}

// create and attach volume for all instance in host.
func (d Driver) createAndAttachVolumes(infra *v1.Infra, host *v1.Hosts, disks []v1.Disk) error {
	eg, _ := errgroup.WithContext(context.Background())
	for i := range disks {
		disk := disks[i]
		eg.Go(func() error {
			return d.createAndAttachVolume(infra, host, &disk)
		})
	}
	if err := eg.Wait(); err != nil {
		return err
	}
	return nil
}

func (d Driver) createAndAttachVolume(infra *v1.Infra, host *v1.Hosts, disk *v1.Disk) error {
	if disk.Name == "" {
		return nil
	}
	client := d.Client
	availabilityZone := infra.Spec.AvailabilityZone
	if availabilityZone == "" {
		return fmt.Errorf("no availabilityZone for volume")
	}
	eg, _ := errgroup.WithContext(context.Background())

	for _, v := range host.Metadata {
		//Volume_tag: [role:true,Data:true,name:namespace+name]
		tags := rolesToTags(host.Roles)
		nameKey, fullName := common.InfraVolumesLabel, infra.GetInstancesAndVolumesTag()
		dataLable, value := common.DataVolumeLabel, common.TRUELable
		tags = append(tags, []types.Tag{
			{
				Key:   &nameKey,
				Value: &fullName,
			},
			{
				Key:   &dataLable,
				Value: &value,
			},
		}...,
		)
		size := int32(disk.Capacity)
		input := &ec2.CreateVolumeInput{
			Size:             &size,
			VolumeType:       types.VolumeType(disk.Type),
			AvailabilityZone: &availabilityZone,
			TagSpecifications: []types.TagSpecification{
				{
					ResourceType: types.ResourceTypeVolume,
					Tags:         tags,
				},
			},
		}
		result, err := MakeVolume(context.TODO(), client, input)
		if err != nil {
			return fmt.Errorf("create volume failed: %v", err)
		}
		id := v.ID
		inputAttach := &ec2.AttachVolumeInput{
			Device:     &disk.Name,
			VolumeId:   result.VolumeId,
			InstanceId: &id,
		}

		//retry 1s,2s,4,8,16,32,64. 8times
		eg.Go(func() error {
			return retryAttachVolume(common.TryTimes, common.TrySleepTime, client, inputAttach)
		})
	}
	if err := eg.Wait(); err != nil {
		return err
	}
	return nil
}

func retryAttachVolume(tryTimes int, trySleepTime time.Duration, client *ec2.Client, inputAttach *ec2.AttachVolumeInput) error {
	var err error
	for i := 0; i < tryTimes; i++ {
		_, err = AttachVolume(context.TODO(), client, inputAttach)
		if err == nil {
			return nil
		}
		if i == tryTimes-1 {
			break
		}
		time.Sleep(trySleepTime * time.Duration(math.Pow(2, float64(i))))
	}
	return fmt.Errorf("retry attach volume action timeout:%v,instanceId:%s,DeviceName:%s,VolumeId:%s", err, *inputAttach.InstanceId, *inputAttach.Device, *inputAttach.VolumeId)
}
