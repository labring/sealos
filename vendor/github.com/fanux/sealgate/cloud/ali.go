package cloud

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/aliyun/alibaba-cloud-sdk-go/sdk/requests"
	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
)

type AliProvider struct {
	Config
	client *ecs.Client
}

func (a *AliProvider) secureGroupID(r Request, vpcName string) (string, error) {
	request := ecs.CreateCreateSecurityGroupRequest()
	request.Scheme = "https"

	request.SecurityGroupName = "sealos"
	request.VpcId = vpcName
	request.SecurityGroupType = "normal"

	response, err := a.client.CreateSecurityGroup(request)
	if err != nil {
		fmt.Print(err.Error())
		return "", err
	}
	fmt.Printf("response is %#v\n", response)

	//TODO set security rules
	req := ecs.CreateAuthorizeSecurityGroupRequest()
	req.Scheme = "https"

	req.SecurityGroupId = response.SecurityGroupId
	req.IpProtocol = "tcp"
	req.PortRange = "22/22"
	req.SourceCidrIp = "0.0.0.0/0"
	req.Policy = "accept"

	res, err := a.client.AuthorizeSecurityGroup(req)
	if err != nil {
		fmt.Print(err.Error())
		return "",err
	}
	fmt.Printf("response is %#v\n", res)

	return response.SecurityGroupId, nil
}

func (a *AliProvider) switchID(r Request, vpcName string) (string, error) {
	zoneid := a.zoneID(r)
	if zoneid == "" {
		return "", fmt.Errorf("Not support zone ID %s", r.ZoneID)
	}

	request := ecs.CreateCreateVSwitchRequest()
	request.Scheme = "https"

	request.CidrBlock = "172.16.0.0/20"
	request.VpcId = vpcName
	request.ZoneId = a.zoneID(r)
	request.VSwitchName = "sealos"
	request.Description = "sealos auto install kubernetes"

	response, err := a.client.CreateVSwitch(request)
	if err != nil {
		fmt.Print(err.Error())
		return "", err
	}
	fmt.Printf("response is %#v\n", response)
	return response.VSwitchId, nil
}

func (a *AliProvider) VPC(r Request) (string, error) {
	request := ecs.CreateCreateVpcRequest()
	request.Scheme = "https"

	request.CidrBlock = "172.16.0.0/16"
	request.VpcName = "htfang"
	request.Description = "sealos auto install kuberentes"

	response, err := a.client.CreateVpc(request)
	if err != nil {
		fmt.Print(err.Error())
		return "", err
	}
	fmt.Printf("response is %#v\n", response)
	return response.VpcId, nil
}

//default zone is seal-hangzhou, user can provide a zoneID
func (a *AliProvider) zoneID(r Request) string {
	if !strings.HasPrefix(r.ZoneID, "seal-") {
		return r.ZoneID
	}

	zones := map[string][]string{
		"cn-hangzhou": []string{"cn-hangzhou-a", "cn-hangzhou-b"},
	}

	z, ok := zones[a.Config.Region]
	if ok {
		return z[0]
	}
	return ""
}

func (a *AliProvider) List(r Request) (*Response, error) {
	request := ecs.CreateDescribeInstancesRequest()
	request.Scheme = "https"

	response, err := a.client.DescribeInstances(request)
	if err != nil {
		fmt.Print(err.Error())
		return nil, err
	}
	fmt.Printf("response is %#v\n", response)
	return nil, nil
}

func (a *AliProvider) Create(r Request) (*Response, error) {
	var err error

	fmt.Print("create vpc ..")
	var vpc string
	if r.VPCID == "" {
		vpc, err = a.VPC(r)
		if err != nil || vpc == "" {
			return nil, fmt.Errorf("create vpc failed : %s", err)
		}
	} else {
		vpc = r.VPCID
	}

	fmt.Print("wait for vpc create sucess and create switch ..")
	time.Sleep(time.Second * 3)
	var switchID string
	if r.SwitchID == "" {
		switchID, err = a.switchID(r, vpc)
		if err != nil {
			return nil, fmt.Errorf("create switch failed : %s", err)
		}
	} else {
		switchID = r.SwitchID
	}

	fmt.Print("create secureGroup ..")
	var securityGroupID string
	if r.SecuretyGroupID == "" {
		securityGroupID, err = a.secureGroupID(r, vpc)
		if err != nil {
			return nil, fmt.Errorf("create security group failed : %s", err)
		}
	} else {
		securityGroupID = r.SecuretyGroupID
	}

	fmt.Print("wait for vswitch success and create vm ..")
	time.Sleep(time.Second * 3)
	request := ecs.CreateRunInstancesRequest()
	request.Scheme = "https"
	name := fmt.Sprintf("%s-[0,%d]", r.NamePrefix, r.Num-1)

	/*
		f := a.queryFlavor(r.Flavor)
		if f == "" {
			return nil, fmt.Errorf("query vm flavor failed")
		}
	*/
	request.InstanceType = "ecs.c5.xlarge"
	request.InstanceName = name
	request.HostName = name
	request.InternetChargeType = "PayByTraffic"
	if len(r.Disks) >= 1 {
		request.SystemDiskSize = r.Disks[0].Size
		request.SystemDiskDiskName = r.Disks[0].Name
	}
	if r.Passwd != "" {
		request.Password = r.Passwd
	} else {
		request.KeyPairName = r.KeyPair
	}
	request.Amount = requests.NewInteger(r.Num)
	request.SpotStrategy = "SpotAsPriceGo"
	request.InstanceChargeType = "PostPaid"
	request.SecurityGroupId = securityGroupID
	request.VSwitchId = switchID
	request.ImageId = r.Image
	if r.FIP == true {
		request.InternetMaxBandwidthIn = requests.NewInteger(5)
		request.InternetMaxBandwidthOut = requests.NewInteger(5)
	}

	response, err := a.client.RunInstances(request)
	if err != nil {
		return nil, fmt.Errorf("create and run instance failed : %s", err)
	}
	fmt.Printf("response is %#v\n", response)

	fmt.Println("sleep 60 seconds and wait for instance create success..")
	time.Sleep(time.Second * 60 * 3)
	res := &Response{}
	res.VPCID = vpc
	res.SecuretyGroupID = securityGroupID
	res.SwitchID = switchID
	for _, i := range response.InstanceIdSets.InstanceIdSet {
		vm, err := a.InstanceInfo(i)
		if err != nil {
			return nil, err
		}
		res.VMs = append(res.VMs, *vm)
	}
	return res, nil
}

func (a *AliProvider) InstanceInfo(id string) (*VM, error) {
	request := ecs.CreateDescribeInstanceAttributeRequest()
	request.Scheme = "https"

	request.InstanceId = id

	response, err := a.client.DescribeInstanceAttribute(request)
	if err != nil {
		fmt.Print(err.Error())
		return nil, err
	}
	fmt.Printf("response is %#v\n", response)
	vm := &VM{}
	vm.ID = id
	vm.Name = response.InstanceName
	if len(response.PublicIpAddress.IpAddress) > 0 {
		vm.FIP = response.PublicIpAddress.IpAddress[0]
	}
	if len(response.VpcAttributes.PrivateIpAddress.IpAddress) > 0 {
		vm.IP = response.VpcAttributes.PrivateIpAddress.IpAddress[0]
	}
	vm.CPU = response.Cpu
	vm.Memory = response.Memory
	vm.CreationTime = response.CreationTime

	return vm, nil
}

func (a *AliProvider) Delete(...string) error {
	panic("implement me")
}

func (a *AliProvider) flavor(flavor string) string {
	if strings.HasPrefix(flavor, "ecs") {
		return flavor
	}
	flavors := map[string]string{
		"1C1G": "ecs.t5-lc1m1.small",
		"1C2G": "ecs.t5-lc1m2.small",
		"2C2G": "ecs.ic5.large",
		"2C4G": "ecs.c6.large",
		"4C4G": "ecs.ic5.xlarge",
		"4C8G": "ecs.c6.xlarge",
	}
	f, ok := flavors[flavor]
	if !ok {
		return ""
	}
	return f
}

//1C2G return 1,2
func getCPUandMemory(flavor string) (int, float64) {
	b := []byte(flavor)
	cpu, err := strconv.Atoi(string(b[0]))
	if err != nil {
		return 0, 0
	}
	mem, err := strconv.Atoi(string(b[2]))
	if err != nil {
		return 0, 0
	}

	return cpu, float64(mem)
}

func (a *AliProvider) queryFlavor(flavor string) string {
	request := ecs.CreateDescribeInstanceTypesRequest()
	request.Scheme = "https"

	cpu, mem := getCPUandMemory(flavor)
	if cpu == 0 || mem == 0 {
		fmt.Errorf("cpu or mem is 0, can't get flavor")
		return ""
	}

	response, err := a.client.DescribeInstanceTypes(request)
	if err != nil {
		fmt.Print(err.Error())
	}
	fmt.Printf("response is %#v\n", response)

	for _, res := range response.InstanceTypes.InstanceType {
		if res.MemorySize == mem && res.CpuCoreCount == cpu {
			fmt.Printf("flavor is : %s", res.InstanceTypeId)
			return res.InstanceTypeId
		}
	}
	return ""
}
