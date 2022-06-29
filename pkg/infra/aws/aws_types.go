package aws_provider

import (
	"github.com/aws/amazon-ec2-instance-selector/v2/pkg/instancetypes"
	"github.com/aws/amazon-ec2-instance-selector/v2/pkg/selector"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ec2"
	"os"
)

// EC2Svc 是 ec2iface.EC2API 的子集。使用文档：https://docs.aws.amazon.com/sdk-for-go/api/service/ec2
type EC2Svc interface {
	DescribeRegions(input *ec2.DescribeRegionsInput) (*ec2.DescribeRegionsOutput, error)
	DescribeAvailabilityZones(input *ec2.DescribeAvailabilityZonesInput) (*ec2.DescribeAvailabilityZonesOutput, error)
	DescribeLaunchTemplatesPages(input *ec2.DescribeLaunchTemplatesInput, fn func(*ec2.DescribeLaunchTemplatesOutput, bool) bool) error
	DescribeLaunchTemplateVersionsPages(input *ec2.DescribeLaunchTemplateVersionsInput, fn func(*ec2.DescribeLaunchTemplateVersionsOutput, bool) bool) error
	DescribeInstanceTypesPages(input *ec2.DescribeInstanceTypesInput, fn func(*ec2.DescribeInstanceTypesOutput, bool) bool) error
	DescribeImages(input *ec2.DescribeImagesInput) (*ec2.DescribeImagesOutput, error)
	DescribeVpcs(*ec2.DescribeVpcsInput) (*ec2.DescribeVpcsOutput, error)
	DescribeSubnets(*ec2.DescribeSubnetsInput) (*ec2.DescribeSubnetsOutput, error)
	DescribeSecurityGroups(*ec2.DescribeSecurityGroupsInput) (*ec2.DescribeSecurityGroupsOutput, error)
	CreateSecurityGroup(input *ec2.CreateSecurityGroupInput) (*ec2.CreateSecurityGroupOutput, error)
	AuthorizeSecurityGroupIngress(input *ec2.AuthorizeSecurityGroupIngressInput) (*ec2.AuthorizeSecurityGroupIngressOutput, error)
	DescribeInstancesPages(input *ec2.DescribeInstancesInput, fn func(*ec2.DescribeInstancesOutput, bool) bool) error
	CreateTags(input *ec2.CreateTagsInput) (*ec2.CreateTagsOutput, error)
	RunInstances(input *ec2.RunInstancesInput) (*ec2.Reservation, error)
	TerminateInstances(input *ec2.TerminateInstancesInput) (*ec2.TerminateInstancesOutput, error)
	DeleteSecurityGroup(input *ec2.DeleteSecurityGroupInput) (*ec2.DeleteSecurityGroupOutput, error)
	StartInstances(input *ec2.StartInstancesInput) (*ec2.StartInstancesOutput, error)
	ModifyInstanceAttribute(input *ec2.ModifyInstanceAttributeInput) (*ec2.ModifyInstanceAttributeOutput, error)
	CreateVpc(*ec2.CreateVpcInput) (*ec2.CreateVpcOutput, error)
	DeleteVpc(*ec2.DeleteVpcInput) (*ec2.DeleteVpcOutput, error)
	StopInstances(*ec2.StopInstancesInput) (*ec2.StopInstancesOutput, error)
	AllocateAddress(*ec2.AllocateAddressInput) (*ec2.AllocateAddressOutput, error)
	AssociateAddress(*ec2.AssociateAddressInput) (*ec2.AssociateAddressOutput, error)
	DisassociateAddress(*ec2.DisassociateAddressInput) (*ec2.DisassociateAddressOutput, error)
	ReleaseAddress(*ec2.ReleaseAddressInput) (*ec2.ReleaseAddressOutput, error)
}

// Get the appropriate region, put it into the session
func GetDefaultRegion(sess *session.Session) string {
	// If a region is not picked up by the SDK, try to decide a region
	if sess.Config.Region == nil {
		// Try the environment variable
		envRegion := os.Getenv(RegionEnv)
		if envRegion != "" {
			sess.Config.Region = &envRegion
		} else {
			// Fallback to the hardcoded region value
			sess.Config.Region = aws.String(DefaultRegion)
		}
	}

	return *sess.Config.Region
}

type InstanceSelector interface {
	FilterVerbose(filters selector.Filters) ([]*instancetypes.Details, error)
}
