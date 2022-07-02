package aws

import (
	"encoding/base64"
	"fmt"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ec2"
	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/pkg/errors"
	"io/ioutil"
	"strconv"
	"strings"
)

type EC2Helper struct {
	Svc  EC2Svc
	Sess *session.Session
}

// GetLatestImages 根据条件获取最新的images列表
func (h *EC2Helper) GetLatestImages(rootDeviceType *string, architectures []*string) ([]*ec2.Image, error) {
	filters := make([]*ec2.Filter, 0)
	filters = append(filters, &ec2.Filter{
		Name: aws.String("state"),
		Values: []*string{
			aws.String("available"),
		},
	})
	filters = append(filters, &ec2.Filter{
		Name:   aws.String("architecture"),
		Values: architectures,
	})
	if rootDeviceType == nil {
		filters = append(filters, &ec2.Filter{
			Name: aws.String("root-device-type"),
			Values: []*string{
				aws.String("ebs"),
			},
		})
	} else {
		filters = append(filters, &ec2.Filter{
			Name: aws.String("root-device-type"),
			Values: []*string{
				aws.String(*rootDeviceType),
			},
		})
	}
	input := &ec2.DescribeImagesInput{
		Filters: filters,
	}
	imagesOutput, err := h.Svc.DescribeImages(input)
	if err != nil {
		return nil, err
	}
	return imagesOutput.Images, nil
}

// GetVpcs 获取所有的vpc 列表
func (h *EC2Helper) GetVpcs() (vpcs []*ec2.Vpc, err error) {
	input := &ec2.DescribeVpcsInput{}
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

// GetCidrByVpcID 根据vpcID 获取CIDR
func (h *EC2Helper) GetCidrByVpcID(vpcID string) (string, error) {
	input := &ec2.DescribeVpcsInput{
		VpcIds: []*string{
			aws.String(vpcID),
		},
	}
	vpcOutput, err := h.Svc.DescribeVpcs(input)
	if err != nil {
		return "", err
	}
	if len(vpcOutput.Vpcs) == 0 {
		return "", errors.New("Not found vpc by vpcID: " + vpcID)
	}
	return *(vpcOutput.Vpcs[0].CidrBlock), nil
}

// GetInstanceTypes Get the instance types based on input, with all pages concatenated
func (h *EC2Helper) GetInstanceTypes(input *ec2.DescribeInstanceTypesInput) ([]*ec2.InstanceTypeInfo, error) {
	allInstanceTypes := make([]*ec2.InstanceTypeInfo, 0)
	err := h.Svc.DescribeInstanceTypesPages(input, func(page *ec2.DescribeInstanceTypesOutput, lastPage bool) bool {
		allInstanceTypes = append(allInstanceTypes, page.InstanceTypes...)
		return !lastPage
	})
	return allInstanceTypes, err
}

// GetInstanceType Get the specified instance type info given an instance type name.
//Empty result is not allowed.
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

// HasEbsVolume todo
func HasEbsVolume(image *ec2.Image) bool {
	return false
}

// IsLinux todo
func IsLinux(platform string) bool {
	return true
}

// GetDefaultFreeTierInstanceType Get a default instance type, which is a free-tier eligible type.
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
	return images[0], nil
}

func (h *EC2Helper) getDefaultVpc() (*ec2.Vpc, error) {
	vpcs, err := h.GetVpcs()
	if err != nil {
		return nil, err
	}
	for idx := range vpcs {
		if *vpcs[idx].IsDefault {
			return vpcs[idx], nil
		}
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

// GetOrCreateSubnetIDByVpcID 获取subnetID
func (h *EC2Helper) GetOrCreateSubnetIDByVpcID(vpcID string) (*ec2.Subnet, error) {
	subnets, err := h.GetSubnetsByVpc(vpcID)
	if err == nil && len(subnets) > 0 {
		return subnets[0], nil
	}
	input := &ec2.CreateSubnetInput{
		CidrBlock: aws.String(DefaultSubnets),
		VpcId:     aws.String(vpcID),
	}
	subnetOutput, err := h.Svc.CreateSubnet(input)
	if err != nil {
		return nil, err
	}
	_, err = h.Svc.ModifySubnetAttribute(&ec2.ModifySubnetAttributeInput{
		MapPublicIpOnLaunch: &ec2.AttributeBooleanValue{
			Value: aws.Bool(true),
		},
		SubnetId: aws.String(*subnetOutput.Subnet.SubnetId),
	})

	_, err = h.Svc.ModifySubnetAttribute(&ec2.ModifySubnetAttributeInput{
		SubnetId: aws.String(*subnetOutput.Subnet.SubnetId),
		EnableResourceNameDnsARecordOnLaunch: &ec2.AttributeBooleanValue{
			Value: aws.Bool(true),
		},
	})
	if err != nil {
		return nil, err
	}
	return subnetOutput.Subnet, nil
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

// -----------------------------

// FindInstanceTypes 找到可以用的instance规格
// cpu, memory is number
// arch support arm64|amd64
// deviceType support  ebs|instance-store
func (h *EC2Helper) FindInstanceTypes(cpu, memory int, arch, deviceType string) ([]*ec2.InstanceTypeInfo, error) {
	filters := make([]*ec2.Filter, 0)
	if memory <= 0 {
		return nil, errors.New("host memory is not correct.")
	}
	filters = append(filters, &ec2.Filter{
		Name: aws.String("memory-info.size-in-mib"),
		Values: []*string{
			aws.String(strconv.Itoa(memory * 1024)),
		},
	})
	if cpu <= 0 {
		return nil, errors.New("host cpu is not correct.")
	}
	filters = append(filters, &ec2.Filter{
		Name: aws.String("vcpu-info.default-cores"),
		Values: []*string{
			aws.String(strconv.Itoa(cpu)),
		},
	})
	if string(arch) != "" {
		filters = append(filters, &ec2.Filter{
			Name: aws.String("processor-info.supported-architecture"),
			Values: []*string{
				aws.String(string(ConvertImageArch(v1beta1.Arch(arch)))),
			},
		})
	}
	if deviceType != "" {
		filters = append(filters, &ec2.Filter{
			Name: aws.String("supported-root-device-type"),
			Values: []*string{
				aws.String(deviceType),
			},
		})
	}
	input := &ec2.DescribeInstanceTypesInput{
		Filters: filters,
	}
	instanceTypes, err := h.GetInstanceTypes(input)
	if err != nil {
		return nil, err
	}
	if len(instanceTypes) == 0 {
		return nil, errors.New("get instance type result is empty")
	}
	return instanceTypes, nil
}

// BindEgressGatewayToVpc 绑定egress到vpc
func (h *EC2Helper) BindEgressGatewayToVpc(vpcID string) (string, error) {
	input := &ec2.CreateEgressOnlyInternetGatewayInput{
		VpcId: aws.String(vpcID),
	}
	gateway, err := h.Svc.CreateEgressOnlyInternetGateway(input)
	if err != nil {
		return "", err
	}
	return *gateway.EgressOnlyInternetGateway.EgressOnlyInternetGatewayId, nil
}

// BindIngressGatewayToVpc 绑定ingress到vpc
func (h *EC2Helper) BindIngressGatewayToVpc(vpcID string) (string, error) {
	gateway, err := h.Svc.CreateInternetGateway(&ec2.CreateInternetGatewayInput{})
	if err != nil {
		return *gateway.InternetGateway.InternetGatewayId, err
	}

	_, err = h.Svc.AttachInternetGateway(&ec2.AttachInternetGatewayInput{
		InternetGatewayId: aws.String(*gateway.InternetGateway.InternetGatewayId),
		VpcId:             aws.String(vpcID),
	})
	if err != nil {
		return *gateway.InternetGateway.InternetGatewayId, err
	}

	routeTableID, err := h.GetMainRouteTable(vpcID)
	if err != nil {
		return *gateway.InternetGateway.InternetGatewayId, err
	}
	_, err = h.Svc.CreateRoute(&ec2.CreateRouteInput{
		DestinationCidrBlock: aws.String("0.0.0.0/0"),
		GatewayId:            aws.String(*gateway.InternetGateway.InternetGatewayId),
		RouteTableId:         aws.String(routeTableID),
	})
	return *gateway.InternetGateway.InternetGatewayId, err
}

// GetInstanceInfos 获取instance info
func (h *EC2Helper) GetInstanceInfos(input *ec2.DescribeInstancesInput) ([]*ec2.Instance, error) {
	var allReservations []*ec2.Reservation
	err := h.Svc.DescribeInstancesPages(input, func(page *ec2.DescribeInstancesOutput, lastPage bool) bool {
		allReservations = append(allReservations, page.Reservations...)
		return !lastPage
	})
	var allInstances []*ec2.Instance
	for _, reservation := range allReservations {
		for _, instance := range reservation.Instances {
			allInstances = append(allInstances, instance)
		}
	}
	return allInstances, err
}

func (h *EC2Helper) GetRouteTables(vpcID string) ([]*ec2.RouteTable, error) {
	tables, err := h.Svc.DescribeRouteTables(&ec2.DescribeRouteTablesInput{
		Filters: []*ec2.Filter{
			{
				Name: aws.String("vpc-id"),
				Values: []*string{
					aws.String(vpcID),
				},
			},
		},
	})
	return tables.RouteTables, err
}

func (h *EC2Helper) GetMainRouteTable(vpcID string) (string, error) {
	tables, err := h.GetRouteTables(vpcID)
	if err != nil {
		return "", err
	}
	for idx := range tables {
		for associaID := range tables[idx].Associations {
			if *tables[idx].Associations[associaID].Main == true {
				return *tables[idx].RouteTableId, nil
			}
		}
	}
	return "", errors.New("not found main route table.")
}
