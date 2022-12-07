package aws

import (
	"context"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"

	"github.com/aws/aws-sdk-go-v2/service/ec2"
)

type EC2ModifyVolumeAPI interface {
	ModifyVolume(ctx context.Context,
		params *ec2.ModifyVolumeInput,
		optFns ...func(*ec2.Options)) (*ec2.ModifyVolumeOutput, error)
}

func ModifyVolume(c context.Context, api EC2ModifyVolumeAPI, input *ec2.ModifyVolumeInput) (*ec2.ModifyVolumeOutput, error) {
	return api.ModifyVolume(c, input)
}

// can't modify type when disk being used. can't smaller size when disk being used.
func (d Driver) modifyVolume(curDisk *v1.Disk, desDisk *v1.Disk) error {
	//	// no modification required
	//	if curDisk.Capacity == desDisk.Capacity && curDisk.Type == desDisk.Type {
	//		return nil
	//	}
	//	client := d.Client
	//	volumeType := types.VolumeType(desDisk.Type)
	//	for i := range curDisk.ID {
	//		id := curDisk.ID[i]
	//		size := int32(desDisk.Capacity)
	//		input := &ec2.ModifyVolumeInput{
	//			VolumeId:   &id,
	//			Size:       &size,
	//			VolumeType: volumeType,
	//		}
	//		if _, err := ModifyVolume(context.TODO(), client, input); err != nil {
	//			return fmt.Errorf("modify volume id:%s error:%v", id, err)
	//		}
	//	}
	//
	return nil
}
