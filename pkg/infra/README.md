# infra模块

根据Clusterfile里的定义去申请IaaS资源，保障IaaS资源与Clusterfile中的定义保持终态一致

```yaml
apiVersion: xxx 
kind: Infra
metadata:
  name: alicloud-infra-demo
spec:
  provider: AliyunProvider
  credential:
    accessKey: xxx
    accessSecret: xxx
  cluster:
    isSeize: true
    regionIds: [cn-hangzhou, cn-shanghai]
    zoneIds: [cn-hangzhou-a, cn-hangzhou-b] # If the value is empty, a random value will be used.
    annotations: #set default value,if exist not delete resource
		www.sealyun.com/VpcID: v-xxxxx
        www.sealyun.com/VSwitchID: v-xxxxx
        www.sealyun.com/SecurityGroupID: v-xxxxx
    accessChannels: # If all access channels are the same, it will be filled.
      ssh:
        passwd: xxx #If the passwd is empty, a random password will be generated.
        port: 22
  hosts:
    - roles: [master, aaa, bbb]
      count: 3
      cpu: 4
      memory: 4
      arch: amd64 # ENUM: amd64/arm64 (NOTE: the default value is amd64)
	  ecsType: "ecs.n1.medium" #fixed ecs type
      os: # 默认 CentOS 7.6
        name: CentOS # ENUM: CentOS/Ubuntu/Debain and so on.
        version: 7.6
        id: xxx # 允许用户指定已有的镜像ID （Optional）
      disks:
        - capacity: 100 # The first disk is system disk. Otherwise, it is a data disk.
		  category: cloud_ssd
        - capacity: 50
          category: cloud_essd
status:
  cluster:
    regionId: cn-hangzhou
    zoneId: cn-hangzhou-a
    annotations:
        www.sealyun.com/VpcID: v-xxxxx
        www.sealyun.com/VSwitchID: v-xxxxx
        www.sealyun.com/SecurityGroupID: v-xxxxx
        www.sealyun.com/EIPID: v-xxxxx
    spotStrategy: SpotAsPriceGo
    eip: 10.0.x.x
	master0ID: xxxx
    master0InternalIP: 192.168.x.x
  hosts:
	- ready: true
      roles: [master,sss]
      IDs: xxx,xxxx,xxx
      IPs: xxx,xxx,xxx
      instanceType: xxxx
      arch: arm64
      imageID: xxxxx
      systemCategory: xxxx
      dataCategory: xxxx
```


### aliyun 模块

```
GOROOT=/usr/local/go #gosetup
GOPATH=/Users/cuisongliu/Workspaces/go #gosetup
/usr/local/go/bin/go test -c -o /private/var/folders/5w/gq4g84754jjc0wv0pr0s0fdc0000gn/T/GoLand/___aliyun.test github.com/fanux/sealos/pkg/infra #gosetup
/usr/local/go/bin/go tool test2json -t /private/var/folders/5w/gq4g84754jjc0wv0pr0s0fdc0000gn/T/GoLand/___aliyun.test -test.v -test.paniconexit0 -test.run ^\QTestAliApply\E$
=== RUN   TestAliApply
2022-01-06 22:11:07 [INFO] [ali_provider.go:186] using regionID is cn-shanghai
2022-01-06 22:11:07 [INFO] [ali_vpc.go:140] get available resource success GetAvailableZoneID: cn-shanghai-l
2022-01-06 22:11:08 [INFO] [ali_provider.go:70] create resource success www.sealyun.com/VpcID: vpc-uf6bdtosh4s8r37qgbsb7
2022-01-06 22:11:13 [INFO] [ali_provider.go:70] create resource success www.sealyun.com/VSwitchID: vsw-uf6inewn0tgzjutzpcnh4
2022-01-06 22:11:13 [INFO] [ali_provider.go:70] create resource success www.sealyun.com/SecurityGroupID: sg-uf6hd5xi86hxd8pmi0nq
2022-01-06 22:11:13 [INFO] [ali_image.go:32] host tags is [master ssdxxx],using imageID is centos_8_0_x64_20G_alibase_20210712.vhd
2022-01-06 22:11:17 [INFO] [retry.go:65] use instance type: ecs.c7a.large
2022-01-06 22:11:21 [INFO] [ali_ecs.go:178] get scale up IP list [172.16.0.140], append iplist [172.16.0.140], host count 1
2022-01-06 22:11:21 [INFO] [ali_ecs.go:216] reconcile {"roles":["master","ssdxxx"],"cpu":2,"memory":4,"count":1,"disks":[{"capacity":50,"category":""}],"arch":"amd64","ecsType":"ecs.c7a.large","os":{"name":"","version":"","id":"centos_8_0_x64_20G_alibase_20210712.vhd"}} instances success [172.16.0.140] 
2022-01-06 22:11:23 [INFO] [ali_provider.go:70] create resource success www.sealyun.com/EipID: eip-uf6ptsp0s0uadt9pr7zcq
<nil>=== RUN   TestAliApply/modify_instance_system_disk
    infra_test.go:82: output yaml: apiVersion: apps.sealyun.com/v1
        kind: Infra
        metadata:
          creationTimestamp: null
          name: my-infra
        spec:
          cluster:
            accessChannels:
              ssh:
                passwd: Fanux#123
                port: 22
            metadata:
              isSeize: true
              network:
                bandwidth: "100"
                exportPorts:
                - cidrIP: 0.0.0.0/0
                  portRange: 22/22
                  protocol: tcp
                - cidrIP: 0.0.0.0/0
                  portRange: 6443/6443
                  protocol: tcp
                privateCidrIP: 172.16.0.0/24
            regionIDs:
            - cn-shanghai
            zoneIDs:
            - cn-shanghai-l
          credential:
            accessKey: xxxx
            accessSecret: xxxx
          hosts:
          - arch: amd64
            count: 1
            cpu: 2
            disks:
            - capacity: 50
              category: ""
            ecsType: ecs.c7a.large
            memory: 4
            os:
              id: centos_8_0_x64_20G_alibase_20210712.vhd
              name: ""
              version: ""
            roles:
            - master
            - ssdxxx
          provider: AliyunProvider
        status:
          cluster:
            annotations:
              www.sealyun.com/EipID: eip-uf6ptsp0s0uadt9pr7zcq
              www.sealyun.com/SecurityGroupID: sg-uf6hd5xi86hxd8pmi0nq
              www.sealyun.com/VSwitchID: vsw-uf6inewn0tgzjutzpcnh4
              www.sealyun.com/VpcID: vpc-uf6bdtosh4s8r37qgbsb7
            eip: 106.15.195.252
            master0ID: i-uf6h5xw6053oqtgc3m33
            master0InternalIP: 172.16.0.140
            regionID: cn-shanghai
            spotStrategy: SpotAsPriceGo
            zoneID: cn-shanghai-l
          hosts:
          - IDs: i-uf6h5xw6053oqtgc3m33
            IPs:
            - 172.16.0.140
            arch: amd64
            imageID: centos_8_0_x64_20G_alibase_20210712.vhd
            instanceType: ecs.c7a.large
            ready: true
            roles:
            - master
            - ssdxxx
            systemCategory: ""
        
2022-01-06 22:11:23 [INFO] [ali_image.go:32] host tags is [master ssd],using imageID is centos_8_0_x64_20G_alibase_20210712.vhd
2022-01-06 22:11:24 [INFO] [retry.go:65] use instance type: ecs.c7a.large
2022-01-06 22:11:28 [INFO] [ali_ecs.go:178] get scale up IP list [172.16.0.141], append iplist [172.16.0.141], host count 1
2022-01-06 22:11:28 [INFO] [ali_ecs.go:216] reconcile {"roles":["master","ssd"],"cpu":2,"memory":4,"count":1,"disks":[{"capacity":50,"category":""}],"arch":"amd64","ecsType":"ecs.c7a.large","os":{"name":"","version":"","id":"centos_8_0_x64_20G_alibase_20210712.vhd"}} instances success [172.16.0.141] 
2022-01-06 22:11:28 [INFO] [ali_ecs.go:206] get up IP list [172.16.0.140],  host count 1
2022-01-06 22:11:28 [INFO] [ali_ecs.go:216] reconcile {"roles":["master","ssdxxx"],"cpu":2,"memory":4,"count":1,"disks":[{"capacity":50,"category":""}],"arch":"amd64","ecsType":"ecs.c7a.large","os":{"name":"","version":"","id":"centos_8_0_x64_20G_alibase_20210712.vhd"}} instances success [172.16.0.140] 
    infra_test.go:107: add server:<nil>
    infra_test.go:109: output yaml: apiVersion: apps.sealyun.com/v1
        kind: Infra
        metadata:
          creationTimestamp: null
          name: my-infra
        spec:
          cluster:
            accessChannels:
              ssh:
                passwd: Fanux#123
                port: 22
            metadata:
              isSeize: true
              network:
                bandwidth: "100"
                exportPorts:
                - cidrIP: 0.0.0.0/0
                  portRange: 22/22
                  protocol: tcp
                - cidrIP: 0.0.0.0/0
                  portRange: 6443/6443
                  protocol: tcp
                privateCidrIP: 172.16.0.0/24
            regionIDs:
            - cn-shanghai
            zoneIDs:
            - cn-shanghai-l
          credential:
            accessKey: xxx
            accessSecret: xxx
          hosts:
          - arch: amd64
            count: 1
            cpu: 2
            disks:
            - capacity: 50
              category: ""
            ecsType: ecs.c7a.large
            memory: 4
            os:
              id: centos_8_0_x64_20G_alibase_20210712.vhd
              name: ""
              version: ""
            roles:
            - master
            - ssd
          - arch: amd64
            count: 1
            cpu: 2
            disks:
            - capacity: 50
              category: ""
            ecsType: ecs.c7a.large
            memory: 4
            os:
              id: centos_8_0_x64_20G_alibase_20210712.vhd
              name: ""
              version: ""
            roles:
            - master
            - ssdxxx
          provider: AliyunProvider
        status:
          cluster:
            annotations:
              www.sealyun.com/EipID: eip-uf6ptsp0s0uadt9pr7zcq
              www.sealyun.com/SecurityGroupID: sg-uf6hd5xi86hxd8pmi0nq
              www.sealyun.com/VSwitchID: vsw-uf6inewn0tgzjutzpcnh4
              www.sealyun.com/VpcID: vpc-uf6bdtosh4s8r37qgbsb7
            eip: 106.15.195.252
            master0ID: i-uf6h5xw6053oqtgc3m33
            master0InternalIP: 172.16.0.140
            regionID: cn-shanghai
            spotStrategy: SpotAsPriceGo
            zoneID: cn-shanghai-l
          hosts:
          - IDs: i-uf6h5xw6053oqtgc3m33
            IPs:
            - 172.16.0.140
            arch: amd64
            imageID: centos_8_0_x64_20G_alibase_20210712.vhd
            instanceType: ecs.c7a.large
            ready: true
            roles:
            - master
            - ssdxxx
            systemCategory: ""
          - IDs: i-uf6iw7ipumgzpoq7l3op
            IPs:
            - 172.16.0.141
            arch: amd64
            imageID: centos_8_0_x64_20G_alibase_20210712.vhd
            instanceType: ecs.c7a.large
            ready: true
            roles:
            - master
            - ssd
            systemCategory: ""
        
2022-01-06 22:11:39 [INFO] [ali_ecs.go:206] get up IP list [172.16.0.141],  host count 1
2022-01-06 22:11:39 [INFO] [ali_ecs.go:216] reconcile {"roles":["master","ssd"],"cpu":2,"memory":4,"count":1,"disks":[{"capacity":50,"category":""}],"arch":"amd64","ecsType":"ecs.s6-c1m2.large","os":{"name":"","version":"","id":"centos_8_0_x64_20G_alibase_20210712.vhd"}} instances success [172.16.0.141] 
2022-01-06 22:12:17 [INFO] [ali_provider.go:84] delete resource Success ShouldBeDeleteInstancesIDs: i-uf6h5xw6053oqtgc3m33
2022-01-06 22:14:02 [EROR] [ali_provider.go:66] reconcile resource www.sealyun.com/EipID failed err: retry action timeout: SDK.ServerError
ErrorCode: ORDER.QUANTITY_INVALID
Recommend: https://error-center.aliyun.com/status/search?Keyword=ORDER.QUANTITY_INVALID&source=PopGw
RequestId: 1F933962-8116-55C7-A4A1-00F50835C480
Message: User quota has exceeded the limit.
2022-01-06 22:14:02 [WARN] [ali_provider.go:231] actionName: BindEIP,err: retry action timeout: SDK.ServerError
ErrorCode: ORDER.QUANTITY_INVALID
Recommend: https://error-center.aliyun.com/status/search?Keyword=ORDER.QUANTITY_INVALID&source=PopGw
RequestId: 1F933962-8116-55C7-A4A1-00F50835C480
Message: User quota has exceeded the limit. ,skip it
    infra_test.go:124: delete:<nil>
    infra_test.go:126: output yaml: apiVersion: apps.sealyun.com/v1
        kind: Infra
        metadata:
          creationTimestamp: null
          name: my-infra
        spec:
          cluster:
            accessChannels:
              ssh:
                passwd: Fanux#123
                port: 22
            metadata:
              isSeize: true
              network:
                bandwidth: "100"
                exportPorts:
                - cidrIP: 0.0.0.0/0
                  portRange: 22/22
                  protocol: tcp
                - cidrIP: 0.0.0.0/0
                  portRange: 6443/6443
                  protocol: tcp
                privateCidrIP: 172.16.0.0/24
            regionIDs:
            - cn-shanghai
            zoneIDs:
            - cn-shanghai-l
          credential:
            accessKey: xxx
            accessSecret: xxxx
          hosts:
          - arch: amd64
            count: 1
            cpu: 2
            disks:
            - capacity: 50
              category: ""
            ecsType: ecs.s6-c1m2.large
            memory: 4
            os:
              id: centos_8_0_x64_20G_alibase_20210712.vhd
              name: ""
              version: ""
            roles:
            - master
            - ssd
          provider: AliyunProvider
        status:
          cluster:
            annotations:
              ShouldBeDeleteInstancesIDs: ""
              www.sealyun.com/SecurityGroupID: sg-uf6hd5xi86hxd8pmi0nq
              www.sealyun.com/VSwitchID: vsw-uf6inewn0tgzjutzpcnh4
              www.sealyun.com/VpcID: vpc-uf6bdtosh4s8r37qgbsb7
            regionID: cn-shanghai
            spotStrategy: SpotAsPriceGo
            zoneID: cn-shanghai-l
          hosts:
          - IDs: i-uf6iw7ipumgzpoq7l3op
            IPs:
            - 172.16.0.141
            arch: amd64
            imageID: centos_8_0_x64_20G_alibase_20210712.vhd
            instanceType: ecs.c7a.large
            ready: true
            roles:
            - master
            - ssd
            systemCategory: ""
        
2022-01-06 22:14:22 [INFO] [ali_provider.go:215] DeletionTimestamp not nil Clear Infra
2022-01-06 22:14:22 [WARN] [ali_provider.go:78] delete resource not exists www.sealyun.com/EipID
2022-01-06 22:14:23 [INFO] [ali_provider.go:84] delete resource Success ShouldBeDeleteInstancesIDs: i-uf6iw7ipumgzpoq7l3op
2022-01-06 22:14:49 [INFO] [ali_provider.go:84] delete resource Success www.sealyun.com/VSwitchID: vsw-uf6inewn0tgzjutzpcnh4
2022-01-06 22:14:49 [INFO] [ali_provider.go:84] delete resource Success www.sealyun.com/SecurityGroupID: sg-uf6hd5xi86hxd8pmi0nq
2022-01-06 22:14:50 [INFO] [ali_provider.go:84] delete resource Success www.sealyun.com/VpcID: vpc-uf6bdtosh4s8r37qgbsb7
=== CONT  TestAliApply
    infra_test.go:132: <nil>
--- PASS: TestAliApply (223.10s)
PASS

Process finished with the exit code 0

```

> 用户通过设置`provider` 来决定是aliyun,`credential`设置对应的aksk,`regionIds`设置对应的region

- isSeize 是否抢占模式
- regionIds 可选region，多个会随机选择
- zoneIds 随机选择对应的zone 如果为空，则从可选zone中随机选择zone
- annotations 会有一些默认值
  - `www.sealyun.com/VpcID` vpcID ,如果没值系统会自动创建
  - `www.sealyun.com/VSwitchID` 交换机ID ,如果没值系统会自动创建
  - `www.sealyun.com/SecurityGroupID` 安全组ID ,如果没值系统会自动创建
- accessChannels 设置创建出虚拟机的密码
- hosts 设置虚拟机参数
  - roles 对应的tag，这个tag全局唯一
  - count 创建数量
  - cpu、memory 产品内存和cpu 根据参数获取对应的ecsType 如果ecsType指定该参数无效
  - arch 会影响对应的ecsType和对应的os
  - ecsType： 固定ecs类型（影响cpu,内存和硬盘category默认设置为cloud_ssd）
  - os
    - 根据name和version筛选对应的影响（可能会找不到）
    - id固定镜像ID
  - disks
    - 默认第一个为系统盘（如果没有设置category,会自动获取可用的category）
    - 其他为数据盘
- status
  - regionId 最终的region
  - zoneID 最终的zoneID
  - eip 外网访问IP
  - master0ID master0的id
  - master0InternalIP master的内网IP
  - hosts
    - ready判断主机是否正常
    - IPs 内网IP
    - instanceType ecs类型
    - arch 主机的arch
    - imageID 镜像ID
