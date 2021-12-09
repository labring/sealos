#!/bin/bash
# sh test.sh 1.15.4 pkgurl v3.1.0-alpha.3
# test network, podcidr network interface --podcidr 10.63.0.0/10 --svccidr 11.96.0.0/12 --network calico

echo "create 4 vms"
aliyun ecs RunInstances --Amount 4 \
    --ImageId centos_7_04_64_20G_alibase_201701015.vhd \
    --InstanceType ecs.c5.xlarge \
    --Action RunInstances \
    --InternetChargeType PayByTraffic \
    --InternetMaxBandwidthIn 50 \
    --InternetMaxBandwidthOut 50 \
    --Password Fanux#123 \
    --InstanceChargeType PostPaid \
    --SpotStrategy SpotAsPriceGo \
    --RegionId cn-hongkong  \
    --SecurityGroupId sg-j6cg7qx8vufo7vopqwiy \
    --VSwitchId vsw-j6crutzktn5vdivgeb6tv \
    --ZoneId cn-hongkong-b > InstanceId.json
ID0=$(jq -r ".InstanceIdSets.InstanceIdSet[0]" < InstanceId.json)
ID1=$(jq -r ".InstanceIdSets.InstanceIdSet[1]" < InstanceId.json)
ID2=$(jq -r ".InstanceIdSets.InstanceIdSet[2]" < InstanceId.json)
ID3=$(jq -r ".InstanceIdSets.InstanceIdSet[3]" < InstanceId.json)

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
node=$(jq -r ".VpcAttributes.PrivateIpAddress.IpAddress[0]" < info.json)

echo "all nodes IP: $master0 $master1 $master2 $node"

echo "wait for sshd start"
sleep 100 # wait for sshd

# $2 is sealos clientip
alias remotecmd="./sshcmd --passwd Fanux#123 --host $master0FIP --cmd"

remotecmd "wget https://github.com/fanux/sealos/releases/download/$3/sealos && chmod +x sealos && mv sealos /usr/bin"

version=$1
pkgurl=$2

echo "./sshcmd sealos command"
remotecmd "sealos init --master $master0 --master $master1 --master $master2 \
    --node $node --passwd Fanux#123 --version v$version --pkg-url $pkgurl --podcidr 10.63.0.0/10 \
    --svccidr 11.96.0.0/12 --network calico"

echo "wait for everything ok"
sleep 40
./sshcmd --passwd Fanux#123 --host $master0FIP --cmd "kubectl get node && kubectl get pod --all-namespaces -o wide"

echo "release instance"
sleep 20
aliyun ecs DeleteInstances --InstanceId.1 $ID0 --RegionId cn-hongkong --Force true
aliyun ecs DeleteInstances --InstanceId.1 $ID1 --RegionId cn-hongkong --Force true
aliyun ecs DeleteInstances --InstanceId.1 $ID2 --RegionId cn-hongkong --Force true
aliyun ecs DeleteInstances --InstanceId.1 $ID3 --RegionId cn-hongkong --Force true
