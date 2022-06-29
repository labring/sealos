package aws_provider

import (
	"encoding/base64"
	"fmt"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ec2"
	"github.com/pkg/errors"
	"io/ioutil"
	"sort"
	"strings"
)

type EC2Helper struct {
	Svc  EC2Svc
	Sess *session.Session
}

// GetLatestImages 根据条件获取最新的images列表
func (h *EC2Helper) GetLatestImages(rootDeviceType *string, architectures []*string) (*map[string]*ec2.Image, error) {
	var inputs *map[string]ec2.DescribeImagesInput
	if rootDeviceType == nil {
		inputs = getDescribeImagesInputs("ebs", architectures)
	} else {
		inputs = getDescribeImagesInputs(*rootDeviceType, architectures)
	}

	images := map[string]*ec2.Image{}
	for osName, input := range *inputs {
		output, err := h.Svc.DescribeImages(&input)
		if err != nil {
			return nil, err
		}
		if len(output.Images) <= 0 {
			continue
		}

		// Sort the images and get the latest one
		sort.Sort(byCreationDate(output.Images))
		images[osName] = output.Images[len(output.Images)-1]
	}
	if len(images) <= 0 {
		return nil, nil
	}

	return &images, nil
}

func (h *EC2Helper) GetVpcs() (vpcs []*ec2.Vpc, err error) {
	input := &ec2.DescribeVpcsInput{
		Filters: []*ec2.Filter{},
	}

	vpcs = make([]*ec2.Vpc, 0)

	vpcOutput, err := h.Svc.DescribeVpcs(input)
	if err != nil {
		return
	}
	if len(vpcOutput.Vpcs) == 0 {
		err = errors.New("Not found vpc list.")
		return
	}
	vpcs = append(vpcs, vpcOutput.Vpcs...)
	return
}

// Get the instance types based on input, with all pages concatenated
func (h *EC2Helper) GetInstanceTypes(input *ec2.DescribeInstanceTypesInput) ([]*ec2.InstanceTypeInfo, error) {

	allInstanceTypes := []*ec2.InstanceTypeInfo{}

	err := h.Svc.DescribeInstanceTypesPages(input, func(page *ec2.DescribeInstanceTypesOutput, lastPage bool) bool {
		allInstanceTypes = append(allInstanceTypes, page.InstanceTypes...)
		return !lastPage
	})

	return allInstanceTypes, err
}

/*
Get the specified instance type info given an instance type name.
Empty result is not allowed.
*/
func (h *EC2Helper) GetInstanceType(instanceType string) (*ec2.InstanceTypeInfo, error) {
	input := &ec2.DescribeInstanceTypesInput{
		InstanceTypes: []*string{
			aws.String(instanceType),
		},
	}

	instanceTypes, err := h.GetInstanceTypes(input)
	if err != nil {
		return nil, err
	}
	if len(instanceTypes) <= 0 {
		return nil, errors.New("Instance type " + instanceType + " is not available")
	}

	return instanceTypes[0], err
}

// Sort interface for images
type byCreationDate []*ec2.Image

func (a byCreationDate) Len() int           { return len(a) }
func (a byCreationDate) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }
func (a byCreationDate) Less(i, j int) bool { return *a[i].CreationDate < *a[j].CreationDate }

// Get the appropriate input for describing images
func getDescribeImagesInputs(rootDeviceType string, architectures []*string) *map[string]ec2.DescribeImagesInput {
	// Construct all the inputs
	imageInputs := map[string]ec2.DescribeImagesInput{}
	for osName, rootDeviceTypes := range osDescs {

		// Only add inputs if the corresponding root device type is applicabl e for the specified os
		desc, found := rootDeviceTypes[rootDeviceType]
		if found {
			imageInputs[osName] = ec2.DescribeImagesInput{
				Filters: []*ec2.Filter{
					{
						Name: aws.String("name"),
						Values: []*string{
							aws.String(desc),
						},
					},
					{
						Name: aws.String("state"),
						Values: []*string{
							aws.String("available"),
						},
					},
					{
						Name: aws.String("root-device-type"),
						Values: []*string{
							aws.String(rootDeviceType),
						},
					},
					{
						Name:   aws.String("architecture"),
						Values: architectures,
					},
				},
			}
		}
	}

	return &imageInputs
}

// HasEbsVolume todo
func HasEbsVolume(image *ec2.Image) bool {
	return false
}

// IsLinux todo
func IsLinux(platform string) bool {
	return true
}

/*
Get a default instance type, which is a free-tier eligible type.
Empty result is allowed.
*/
func (h *EC2Helper) GetDefaultFreeTierInstanceType() (*ec2.InstanceTypeInfo, error) {
	input := &ec2.DescribeInstanceTypesInput{
		Filters: []*ec2.Filter{
			{
				Name: aws.String("free-tier-eligible"),
				Values: []*string{
					aws.String("true"),
				},
			},
		},
	}

	instanceTypes, err := h.GetInstanceTypes(input)
	if err != nil {
		return nil, err
	}
	if len(instanceTypes) <= 0 {
		return nil, nil
	}

	// Simply return the first available free instance type
	return (instanceTypes)[0], nil
}

// GetDefaultImage find default linux os
func (h *EC2Helper) GetDefaultImage(deviceType *string, supportedArchitectures []*string) (image *ec2.Image, err error) {
	images, err := h.GetLatestImages(deviceType, supportedArchitectures)
	if err != nil {
		return
	}
	for osName := range *images {
		if strings.Contains(osName, "Linux") || strings.Contains(osName, "Ubuntu") ||
			strings.Contains(osName, "Red Hat") {
			return (*images)[osName], nil
		}
	}
	return nil, errors.New("Not found default image")
}

func (h *EC2Helper) getDefaultVpc() (*ec2.Vpc, error) {
	vpcs, err := h.GetVpcs()
	if err != nil {
		return nil, err
	}
	return vpcs[0], nil
}

func (h *EC2Helper) GetSubnetsByVpc(vpcID string) (subnets []*ec2.Subnet, err error) {
	input := &ec2.DescribeSubnetsInput{
		Filters: []*ec2.Filter{
			{
				Name: aws.String("vpc-id"),
				Values: []*string{
					aws.String(vpcID),
				},
			},
		},
	}
	subnetsOutput, err := h.Svc.DescribeSubnets(input)
	if err != nil {
		return
	}
	if len(subnetsOutput.Subnets) == 0 {
		err = errors.New("Not find subnets by vpcID: " + vpcID)
	}
	subnets = subnetsOutput.Subnets
	return
}

// getDefaultSecurityGroup https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-security-groups.html
func (h *EC2Helper) getDefaultSecurityGroup(vpcID string) (ds *ec2.SecurityGroup, err error) {
	input := &ec2.DescribeSecurityGroupsInput{
		Filters: []*ec2.Filter{
			{
				Name: aws.String("vpc-id"),
				Values: []*string{
					aws.String(vpcID),
				},
			},
		},
	}
	dsOutput, err := h.Svc.DescribeSecurityGroups(input)
	if err != nil {
		return
	}
	if len(dsOutput.SecurityGroups) == 0 {
		err = errors.New("Not find security group in vpcID: " + vpcID)
		return
	}
	return dsOutput.SecurityGroups[0], nil
}

// createNetworkConfiguration ?
func (h *EC2Helper) createNetworkConfiguration(sc *SimpleInfo, ri *ec2.RunInstancesInput) error {

	return nil
}

// Get the default string config
func (h *EC2Helper) GetDefaultSimpleConfig() (*SimpleInfo, error) {
	simpleConfig := NewSimpleInfo()
	simpleConfig.Region = *h.Sess.Config.Region

	// get info about the instance type
	simpleConfig.InstanceType = "t4g.medium"
	defaultInstanceType, err := h.GetDefaultFreeTierInstanceType()
	if err != nil {
		return nil, err
	}
	if defaultInstanceType != nil {
		simpleConfig.InstanceType = *defaultInstanceType.InstanceType
	}

	instanceTypeInfo, err := h.GetInstanceType(simpleConfig.InstanceType)
	if err != nil {
		return nil, err
	}

	// Use instance-store if supported
	rootDeviceType := "ebs"
	if *instanceTypeInfo.InstanceStorageSupported {
		rootDeviceType = "instance-store"
	}

	image, err := h.GetDefaultImage(&rootDeviceType, instanceTypeInfo.ProcessorInfo.SupportedArchitectures)
	if err != nil {
		return nil, err
	}

	simpleConfig.ImageId = *image.ImageId

	vpc, err := h.getDefaultVpc()
	if err != nil {
		return nil, err
	}

	// Only set up network configuration when default VPC exists
	if vpc != nil {
		// Simply get all subnets and pick the first available subnet
		subnets, err := h.GetSubnetsByVpc(*vpc.VpcId)
		if err != nil {
			return nil, err
		}
		subnet := subnets[0]
		simpleConfig.SubnetId = *subnet.SubnetId

		// Get the default security group
		defaultSg, err := h.getDefaultSecurityGroup(*vpc.VpcId)
		if err != nil {
			return nil, err
		}
		simpleConfig.SecurityGroupIds = []string{*defaultSg.GroupId}
	}

	return simpleConfig, nil
}

// Launch instances based on input and confirmation. Returning an error means failure, otherwise success
func (h *EC2Helper) LaunchInstance(simpleConfig *SimpleInfo, detailedConfig *DetailedInfo,
	confirmation bool) ([]string, error) {
	if simpleConfig == nil {
		return nil, errors.New("No config found")
	}

	if confirmation {
		fmt.Println("Options confirmed! Launching instance...")

		input := getRunInstanceInput(simpleConfig, detailedConfig)
		launchedInstances := []string{}

		// Create new stack, if specified.
		if simpleConfig.NewVPC {
			err := h.createNetworkConfiguration(simpleConfig, input)
			if err != nil {
				return nil, err
			}
		}

		input.TagSpecifications = detailedConfig.TagSpecs

		resp, err := h.Svc.RunInstances(input)
		if err != nil {
			return nil, err
		} else {
			fmt.Println("Launch Instance Success!")
			for _, instance := range resp.Instances {
				fmt.Println("Instance ID:", *instance.InstanceId)
				launchedInstances = append(launchedInstances, *instance.InstanceId)
			}
			return launchedInstances, nil
		}
	} else {
		// Abort
		return nil, errors.New("Options not confirmed")
	}
}

// Get a RunInstanceInput given a structured config
func getRunInstanceInput(simpleConfig *SimpleInfo, detailedConfig *DetailedInfo) *ec2.RunInstancesInput {
	input := &ec2.RunInstancesInput{
		MaxCount: aws.Int64(1),
		MinCount: aws.Int64(1),
	}

	// Add launch template if present
	if simpleConfig.LaunchTemplateId != "" {
		input.LaunchTemplate = &ec2.LaunchTemplateSpecification{
			LaunchTemplateId: aws.String(simpleConfig.LaunchTemplateId),
			Version:          aws.String(simpleConfig.LaunchTemplateVersion),
		}
	}

	//Override settings if applicable
	if simpleConfig.ImageId != "" {
		input.ImageId = aws.String(simpleConfig.ImageId)
	}
	if simpleConfig.InstanceType != "" {
		input.InstanceType = aws.String(simpleConfig.InstanceType)
	}
	if simpleConfig.SubnetId != "" {
		input.SubnetId = aws.String(simpleConfig.SubnetId)
	}
	if simpleConfig.SecurityGroupIds != nil && len(simpleConfig.SecurityGroupIds) > 0 {
		input.SecurityGroupIds = aws.StringSlice(simpleConfig.SecurityGroupIds)
	}
	if simpleConfig.IamInstanceProfile != "" {
		input.IamInstanceProfile = &ec2.IamInstanceProfileSpecification{
			Name: aws.String(simpleConfig.IamInstanceProfile),
		}
	}

	setAutoTermination := false
	if detailedConfig != nil {
		// Set all EBS volumes not to be deleted, if specified
		if HasEbsVolume(detailedConfig.Image) && simpleConfig.KeepEbsVolumeAfterTermination {
			input.BlockDeviceMappings = detailedConfig.Image.BlockDeviceMappings
			for _, block := range input.BlockDeviceMappings {
				if block.Ebs != nil {
					block.Ebs.DeleteOnTermination = aws.Bool(false)
				}
			}
		}
		setAutoTermination = IsLinux(*detailedConfig.Image.PlatformDetails) && simpleConfig.AutoTerminationTimerMinutes > 0
	}

	if setAutoTermination {
		input.InstanceInitiatedShutdownBehavior = aws.String("terminate")
		autoTermCmd := fmt.Sprintf("#!/bin/bash\necho \"sudo poweroff\" | at now + %d minutes\n",
			simpleConfig.AutoTerminationTimerMinutes)
		if simpleConfig.BootScriptFilePath == "" {
			input.UserData = aws.String(base64.StdEncoding.EncodeToString([]byte(autoTermCmd)))
		} else {
			bootScriptRaw, _ := ioutil.ReadFile(simpleConfig.BootScriptFilePath)
			bootScriptLines := strings.Split(string(bootScriptRaw), "\n")
			//if #!/bin/bash is first, then replace first line otherwise, prepend termination
			if len(bootScriptLines) >= 1 && bootScriptLines[0] == "#!/bin/bash" {
				bootScriptLines[0] = autoTermCmd
			} else {
				bootScriptLines = append([]string{autoTermCmd}, bootScriptLines...)
			}
			bootScriptRaw = []byte(strings.Join(bootScriptLines, "\n"))
			input.UserData = aws.String(base64.StdEncoding.EncodeToString(bootScriptRaw))
		}
	} else {
		if simpleConfig.BootScriptFilePath != "" {
			bootScriptRaw, _ := ioutil.ReadFile(simpleConfig.BootScriptFilePath)
			input.UserData = aws.String(base64.StdEncoding.EncodeToString(bootScriptRaw))
		}
	}
	return input
}
