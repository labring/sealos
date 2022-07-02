package aws

import (
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ec2"
	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/stretchr/testify/assert"
	"os"
	"strconv"
	"strings"
	"testing"
)

const (
	EnvAccessKey    = "ECS_AKID"
	EnvAccessSecret = "ECS_AKSK"
)

func loadConfig() (key string, secret string) {
	if ak := os.Getenv(EnvAccessKey); ak != "" {
		key = ak
	}
	if sk := os.Getenv(EnvAccessSecret); sk != "" {
		secret = sk
	}
	return
}

func GetHelper(id, secret string) *EC2Helper {
	options := session.Options{
		Config: aws.Config{
			Credentials: credentials.NewStaticCredentials(id, secret, ""),
			Region:      aws.String("cn-north-1"),
		},
		SharedConfigState: session.SharedConfigEnable,
	}
	sess := session.Must(
		session.NewSessionWithOptions(options))

	return NewEc2Helper(sess)
}

func TestEC2Helper_GetVpcs(t *testing.T) {
	helper := GetHelper(loadConfig())
	vpcs, err := helper.GetVpcs()
	assert.NoError(t, err)
	t.Log(vpcs)
}

func TestEC2Helper_GetDefaultImage(t *testing.T) {
	helper := GetHelper(loadConfig())
	deviceType := ""
	arch := "arm"
	archs := []*string{&arch}
	image, err := helper.GetDefaultImage(&deviceType, archs)
	assert.NoError(t, err)
	t.Log(image)
}

func TestEC2Helper_GetInstanceTypes(t *testing.T) {
	helper := GetHelper(loadConfig())
	input := &ec2.DescribeInstanceTypesInput{
		Filters: []*ec2.Filter{
			//{
			//	Name: aws.String("processor-info.supported-architecture"),
			//	Values: []*string{
			//		aws.String("x86_64"),
			//		aws.String("arm64"),
			//	},
			//},
			//{
			//	Name: aws.String("supported-root-device-type"),
			//	Values: []*string{
			//		aws.String("ebs"),
			//		aws.String("instance-store"),
			//	},
			//},
			{
				Name: aws.String("memory-info.size-in-mib"),
				Values: []*string{
					aws.String(strconv.Itoa(4 * 1024)),
				},
			},
			{
				Name: aws.String("vcpu-info.default-cores"),
				Values: []*string{
					aws.String(strconv.Itoa(2)),
				},
			},
		},
	}
	types, err := helper.GetInstanceTypes(input)
	assert.NoError(t, err)
	t.Log("types", types)
}

func TestEC2Helper_GetCidrByVpcID(t *testing.T) {
	helper := GetHelper(loadConfig())
	id, err := helper.GetCidrByVpcID("vpc-00c065a1d2666ff4e")
	assert.NoError(t, err)
	t.Log("Cidr", id)
}

func TestEC2Helper_GetSubnetsByVpcID(t *testing.T) {
	helper := GetHelper(loadConfig())
	id, err := helper.GetSubnetsByVpc("vpc-00c065a1d2666ff4e")
	assert.NoError(t, err)
	t.Log("subnets", id)
}

func TestEC2Helper_GetOrCreateSubnetsByVpcID(t *testing.T) {
	helper := GetHelper(loadConfig())
	id, err := helper.GetOrCreateSubnetIDByVpcID("vpc-00c065a1d2666ff4e")
	assert.NoError(t, err)
	t.Log("subnets", id)
}

func TestEC2Helper_FindInstanceTypes(t *testing.T) {
	helper := GetHelper(loadConfig())

	testCases := []struct {
		CPU        int
		Memory     int
		Arch       string
		DeviceType string
	}{
		{
			CPU:        2,
			Memory:     4,
			Arch:       string(v1beta1.AMD64),
			DeviceType: "ebs",
		},
		{
			CPU:        2,
			Memory:     4,
			Arch:       string(v1beta1.ARM64),
			DeviceType: "ebs",
		},
		{
			CPU:        2,
			Memory:     4,
			Arch:       string(v1beta1.AMD64),
			DeviceType: "instance-store",
		},
	}

	for _, testCase := range testCases {
		types, err := helper.FindInstanceTypes(testCase.CPU, testCase.Memory, testCase.Arch, testCase.DeviceType)
		assert.NoError(t, err)
		t.Log("instance types", types)
	}

}

func TestEC2Helper_GetLatestImages(t *testing.T) {
	helper := GetHelper(loadConfig())
	deviceType := EBS_ROOT_DEVICE_TYPE
	arch := string(ConvertImageArch(v1beta1.AMD64))

	images, err := helper.GetLatestImages(&deviceType, []*string{&arch})
	assert.NoError(t, err)
	imageIds := make([]string, 0)
	for idx := range images {
		if images[idx].Description == nil {
			continue
		}
		if strings.Contains(strings.ToLower(*images[idx].Description), "docker") ||
			strings.Contains(strings.ToLower(*images[idx].Description), "k8s") {
			continue
		}
		imageIds = append(imageIds, *images[idx].ImageId)

		if strings.Contains(strings.ToLower(*images[idx].Description), "canonical") &&
			strings.Contains(strings.ToLower(*images[idx].Description), "22.04") {
			t.Log("desc", *images[idx].Description)
		}
	}
	t.Log("image ids", imageIds)
}

func TestEC2Helper_BindEgressGatewayToVpc(t *testing.T) {
	helper := GetHelper(loadConfig())
	vpc, err := helper.BindEgressGatewayToVpc("vpc-00c065a1d2666ff4e")
	assert.NoError(t, err)
	t.Log("vpc", vpc)
}

func TestEC2Helper_GetRouteTables(t *testing.T) {
	helper := GetHelper(loadConfig())
	tables, err := helper.GetRouteTables("vpc-00157e2f5c8f0d87d")
	assert.NoError(t, err)
	t.Log("tables", tables)
}

func TestEc2Helper_BindIngressGatewayToVpc(t *testing.T) {
	helper := GetHelper(loadConfig())
	isBind, err := helper.BindIngressGatewayToVpc("vpc-00157e2f5c8f0d87d")
	assert.NoError(t, err)
	t.Log("is_bind", isBind)
}
