#!/bin/bash
# Copyright © 2021 sealos.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# sh test.sh [k8s version] [package url] [sealos version]
# sh test.sh 1.15.4 pkgurl 3.1.0
# 如测试3.2.0-beta.2 版本 1.18.0版本离线包:
# sh test-sealos-HA.sh 1.18.0 https://sealyun.oss-cn-beijing-internal.aliyuncs.com/d551b0b9e67e0416d0f9dce870a16665-1.18.0/kube1.18.0.tar.gz 3.2.0-beta.2

echo "create 6 vms"
aliyun ecs RunInstances --Amount 6 \
    --ImageId centos_7_04_64_20G_alibase_201701015.vhd \
    --InstanceType ecs.n4.large \
    --Action RunInstances \
    --InternetChargeType PayByTraffic \
    --InternetMaxBandwidthIn 50 \
    --InternetMaxBandwidthOut 50 \
    --Password Fanux#123 \
    --InstanceChargeType PostPaid \
    --SpotStrategy SpotAsPriceGo \
    --RegionId cn-beijing \
    --SecurityGroupId sg-2zeaztwqaib4q842evey \
    --VSwitchId vsw-2ze8v4m3uj5w3yov72ih0 \
    --ZoneId cn-beijing-a > InstanceId.json
ID0=$(jq -r ".InstanceIdSets.InstanceIdSet[0]" < InstanceId.json)
ID1=$(jq -r ".InstanceIdSets.InstanceIdSet[1]" < InstanceId.json)
ID2=$(jq -r ".InstanceIdSets.InstanceIdSet[2]" < InstanceId.json)
ID3=$(jq -r ".InstanceIdSets.InstanceIdSet[3]" < InstanceId.json)
ID4=$(jq -r ".InstanceIdSets.InstanceIdSet[4]" < InstanceId.json)
ID5=$(jq -r ".InstanceIdSets.InstanceIdSet[5]" < InstanceId.json)

echo "sleep 40s wait for IP and FIP"
sleep 40 # wait for IP

aliyun ecs DescribeInstanceAttribute --InstanceId $ID0 > info.json
master0=$(jq -r ".VpcAttributes.PrivateIpAddress.IpAddress[0]" < info.json)
master0FIP=$(jq -r ".PublicIpAddress.IpAddress[0]" < info.json)

aliyun ecs DescribeInstanceAttribute --InstanceId $ID1 > info.json
master1=$(jq -r ".VpcAttributes.PrivateIpAddress.IpAddress[0]" < info.json)

aliyun ecs DescribeInstanceAttribute --InstanceId $ID2 > info.json
master2=$(jq -r ".VpcAttributes.PrivateIpAddress.IpAddress[0]" < info.json)

aliyun ecs DescribeInstanceAttribute --InstanceId $ID3 > info.json
node0=$(jq -r ".VpcAttributes.PrivateIpAddress.IpAddress[0]" < info.json)

aliyun ecs DescribeInstanceAttribute --InstanceId $ID4 > info.json
node1=$(jq -r ".VpcAttributes.PrivateIpAddress.IpAddress[0]" < info.json)

aliyun ecs DescribeInstanceAttribute --InstanceId $ID5 > info.json
node2=$(jq -r ".VpcAttributes.PrivateIpAddress.IpAddress[0]" < info.json)

echo "all nodes IP: $master0 $master1 $master2 $node0 $node1 $node2"

echo "wait for sshd start"
sleep 100 # wait for sshd

# $2 is sealos clientip
alias remotecmd="./sshcmd --passwd Fanux#123 --host $master0FIP --cmd"

remotecmd "wget https://sealyun-home.oss-cn-beijing-internal.aliyuncs.com/sealos/v$3/sealos && chmod +x sealos && mv sealos /usr/bin"

version=$1
pkgurl=$2

echo "test init one master"
remotecmd "sealos init --master $master0  \
    --passwd Fanux#123 --version v$version --pkg-url $pkgurl --podcidr 11.64.0.0/10 --svccidr 12.96.0.0/12"

echo "wait for everything ok"
sleep 40
echo "[CHECK] check init one master"
remotecmd "kubectl get node && kubectl get pod --all-namespaces && kubectl get cs"

echo "test join one master"
remotecmd "sealos join --master $master1"
echo "wait for everything ok"
sleep 40
echo "[CHECK] check join one master"
remotecmd "kubectl get node && kubectl get pod --all-namespaces && kubectl get cs"

echo "test clean one master"
remotecmd "sealos clean --master $master1"
echo "wait for everything ok"
sleep 40
echo "[CHECK] check clean one master"
remotecmd "kubectl get node && kubectl get pod --all-namespaces && kubectl get cs"

echo "test join two masters"
remotecmd "sealos join --master $master1 --master $master2"
echo "wait for everything ok"
sleep 40
echo "[CHECK] check add two masters"
remotecmd "kubectl get node && kubectl get pod --all-namespaces && kubectl get cs"

echo "test join a node"
remotecmd "sealos join --node $node0"
echo "wait for everything ok"
sleep 40
echo "[CHECK] check add one node"
remotecmd "kubectl get node && kubectl get pod --all-namespaces && kubectl get cs"

echo "test join two nodes"
remotecmd "sealos join --node $node1 --node $node2"
echo "wait for everything ok"
sleep 40
echo "[CHECK] check add two nodes"
remotecmd "kubectl get node && kubectl get pod --all-namespaces && kubectl get cs"

echo "test clean a node"
remotecmd "sealos clean --node $node0"
echo "wait for everything ok"
sleep 40
echo "[CHECK] check clean a node"
remotecmd "kubectl get node && kubectl get pod --all-namespaces && kubectl get cs"

echo "test clean two nodes"
remotecmd "sealos clean --node $node1 --node $node2"
echo "wait for ever7thing ok"
sleep 40
echo "[CHECK] check clean two nodes"
remotecmd "kubectl get node && kubectl get pod --all-namespaces && kubectl get cs"


echo "test clean all"
remotecmd "sealos clean"
echo "wait for ever7thing ok"
sleep 40
echo "[CHECK] check clean two nodes"
remotecmd "kubectl get node && kubectl get pod --all-namespaces && kubectl get cs"

echo "release instance"
sleep 20
aliyun ecs DeleteInstances --InstanceId.1 $ID0 --RegionId cn-hongkong --Force true
aliyun ecs DeleteInstances --InstanceId.1 $ID1 --RegionId cn-hongkong --Force true
aliyun ecs DeleteInstances --InstanceId.1 $ID2 --RegionId cn-hongkong --Force true
aliyun ecs DeleteInstances --InstanceId.1 $ID3 --RegionId cn-hongkong --Force true
aliyun ecs DeleteInstances --InstanceId.1 $ID4 --RegionId cn-hongkong --Force true
aliyun ecs DeleteInstances --InstanceId.1 $ID5 --RegionId cn-hongkong --Force true
