package aws

import (
	"context"
	"fmt"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"time"
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

func (d Driver) createAndAttachVolume(host *v1.Hosts, disk *v1.Disk) error {
	if disk.Name == "" {
		return nil
	}
	client := d.Client
	for _, v := range host.Metadata {
		size := int32(disk.Capacity)
		availabilityZone := getVolumeRegion(d.Config.Region)
		input := &ec2.CreateVolumeInput{
			Size:             &size,
			VolumeType:       types.VolumeType(disk.Type),
			AvailabilityZone: &availabilityZone,
		}
		result, err := MakeVolume(context.TODO(), client, input)
		if err != nil {
			return fmt.Errorf("Create volume failed: %v", err)
		}

		//Sleep todo 0.5 1 2 4 6 8 秒都尝试挂载,退避方式挂载。
		time.Sleep(time.Second)
		inputAttach := &ec2.AttachVolumeInput{
			Device:     &disk.Name,
			VolumeId:   result.VolumeId,
			InstanceId: &v.ID,
		}
		_, err = AttachVolume(context.TODO(), client, inputAttach)
		if err != nil {
			return fmt.Errorf("Attach volume failed: %v", err)
		}
	}
	return nil
}

// 待定
func getVolumeRegion(str string) string {
	return str + "a"
}
