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
```
