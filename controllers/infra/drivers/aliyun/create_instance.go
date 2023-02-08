package aliyun

import (
	"fmt"
	"strconv"

	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/controllers/infra/common"
)

var userData = `#!/bin/bash
sudo cp /home/ec2-user/.ssh/authorized_keys /root/.ssh/authorized_keys
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin yes/g' /etc/ssh/sshd_config
sudo sed -ie "s/no-port-for.*exit 142\" //g" /root/.ssh/authorized_keys
`

type ECSCreateInstancesAPI interface {
	RunInstances(request *ecs.DescribeInstancesRequest) (response *ecs.DescribeInstancesResponse, err error)
}

func (d Driver) createInstances(hosts *v1.Hosts, infra *v1.Infra) error {
	//client := d.Client
	//if hosts.Count == 0 {
	//	return nil
	//}
	//tags := d.GetTags(hosts, infra)
	//roleTags := rolesToTags(hosts.Roles)
	//keyName := infra.Spec.SSH.PkName
	//availabilityZone := infra.Spec.AvailabilityZone
	//
	//// encode userdata to base64
	//userData := base64.StdEncoding.EncodeToString([]byte(userData))
	//
	//// get root device name
	//rootDeviceName, err := d.getRootDeviceNameByImageID(hosts.Image)
	//if err != nil {
	//	return err
	//}
	//instanceRequest := &ecs.RunInstancesRequest{
	//	ZoneId:             availabilityZone,
	//	ImageId:            hosts.Image,
	//	InstanceType:       hosts.Flavor,
	//	Amount:             requests.Integer(strconv.Itoa(hosts.Count)),
	//	Tag:                &tags,
	//	KeyPairName:        keyName,
	//	InstanceChargeType: "PostPaid",
	//	SecurityGroupId:    "sg-bp17m0pc0xpv67hie96f",
	//	UserData:           userData,
	//}
	return nil
}

func rolesToTags(roles []string) (tags []ecs.RunInstancesTag) {
	t := common.TRUELable

	for _, r := range roles {
		tag := ecs.RunInstancesTag{
			Key:   r,
			Value: t,
		}

		tags = append(tags, tag)
	}
	return tags
}

// GetTags get tags
func (d Driver) GetTags(hosts *v1.Hosts, infra *v1.Infra) []ecs.RunInstancesTag {
	// Tag name and tag value
	// Set role tag
	tags := rolesToTags(hosts.Roles)
	// Set label tag
	labelKey := common.InfraInstancesLabel
	labelValue := infra.GetInstancesAndVolumesTag()
	uidKey := common.InfraInstancesUUID
	uidValue := string(infra.GetUID())
	tags = append(tags, ecs.RunInstancesTag{
		Key:   labelKey,
		Value: labelValue,
	}, ecs.RunInstancesTag{
		Key:   uidKey,
		Value: uidValue,
	})
	// Set index tag
	indexKey := common.InfraInstancesIndex
	indexValue := strconv.Itoa(hosts.Index)
	tags = append(tags, ecs.RunInstancesTag{
		Key:   indexKey,
		Value: indexValue,
	})
	// Set name tag
	nameKey := "Name"
	nameValue := fmt.Sprintf("%s-%d", labelValue, hosts.Index)
	tags = append(tags, ecs.RunInstancesTag{
		Key:   nameKey,
		Value: nameValue,
	})
	return tags
}
