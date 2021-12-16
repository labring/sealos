/*
Copyright 2021 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package aliyun

import "time"

const (
	EnvAccessKey    = "ECS_AKID"
	EnvAccessSecret = "ECS_AKSK"
	EnvRegion       = "ECS_REGION"
)

const (
	Scheme                     = "https"
	IPProtocol                 = "tcp"
	APIServerPortRange         = "6443/6443"
	SSHPortRange               = "22/22"
	SourceCidrIP               = "0.0.0.0/0"
	CidrBlock                  = "172.16.0.0/24"
	Policy                     = "accept"
	DestinationResource        = "InstanceType"
	InstanceChargeType         = "PostPaid"
	ImageID                    = "centos_7_9_x64_20G_alibase_20210927.vhd"
	Product                    = "product"
	Role                       = "role"
	Master                     = "master"
	Node                       = "node"
	Stopped                    = "Stopped"
	AvailableTypeStatus        = "WithStock"
	Bandwidth                  = "100"
	Digits                     = "0123456789"
	Specials                   = "~=+%^*/()[]{}/!@#$?|"
	Letter                     = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	PasswordLength             = 16
	DataCategory               = "cloud_ssd"
	AliDomain                  = "www.sealyun.com/"
	EipID                      = AliDomain + "EipID"
	Master0ID                  = AliDomain + "Master0ID"
	Master0InternalIP          = AliDomain + "Master0InternalIP"
	VpcID                      = AliDomain + "VpcID"
	VSwitchID                  = AliDomain + "VSwitchID"
	SecurityGroupID            = AliDomain + "SecurityGroupID"
	Eip                        = AliDomain + "ClusterEIP"
	ZoneID                     = AliDomain + "ZoneID"
	RegionID                   = "RegionID"
	AliRegionID                = AliDomain + RegionID
	AliMasterIDs               = AliDomain + "MasterIDs"
	AliNodeIDs                 = AliDomain + "NodeIDs"
	DefaultRegionID            = "cn-chengdu"
	AliCloudEssd               = "cloud_essd"
	TryTimes                   = 10
	TrySleepTime               = time.Second
	JustGetInstanceInfo        = ""
	ShouldBeDeleteInstancesIDs = "ShouldBeDeleteInstancesIDs"
)
