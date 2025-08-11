# `sealos route` 命令

## 使用`sealos route`

> 这个命令产生的原因， 是在双网卡甚至多网卡的主机上， 使用`sealos init`安装 `kubernetes` 集群失败。
> 
> kubernetes 集群在使用`kubeadm init`安装的时候，会读取默认路由条目下的ip作为 `apiserver-advertise-address`和`etcd`的`advertise-address`
>
> 使用`localAPIEndpoint`来定义即可。  lvscare了创建 ipvs 在多网卡的情况下， 
> node节点但是得添加一个 `10.103.97.2`到非默认路由 ip的 一个路由. 不然ipvs 不通
>
> 对比目前ip和默认路由ip， 来判断是否需要进行添加路由操作。

```
$ sealos route -h
set route gateway

Usage:
  sealos route [flags]
  sealos route [command]

Available Commands:
  add         set route host via gateway, like ip route add host via gateway
  del         del route host via gateway, like ip route del host via gateway

Flags:
  -h, --help          help for route
      --host string   route host ip address for iFace

Global Flags:
      --config string   config file (default is $HOME/.sealos/config.yaml)

Use "sealos route [command] --help" for more information about a command.
```

说明一下选项

`sealos route --host` : 根据这个`--host ip`来比对当前的默认路由所绑定的`default ip`，来进行判断是否是默认路由的ip。


like linux command `ip route add host via gateway`

- `sealos route add --gateway --host`: 主机上的路由gateway ip， 如 `192.168.0.1`， 目标地址的host`192.168.0.23`，  这个gateway将通过`host`添加到路由条目，


like linux command `ip route del host via gateway`

- `sealos route del --gateway --host`: 主机上的路由gateway ip， 如 `192.168.0.1`， 目标地址的host`192.168.0.23`， 将匹配这条路由删除掉。
### 演示

演示主机默认路由为 `192.168.253.1` 。

名称|网卡1|网卡2
---|---|---
ip|192.168.160.243|192.168.253.129
路由|192.168.160.1|192.168.253.1


use `--host` to check default route gateway, only support ipv4

根据这个`--host ip`来比对当前的默认路由所绑定的`default ip`， 

```
$ sealos route --host 192.168.253.129
  ok
$ sealos route --host 192.168.253.128
  failed
$ sealos route --host 192.168.160.243
  failed
```

use `add --gateway  --host ` to set default route gateway, only support ipv4

```
$ sealos route add --host 10.103.97.2 --gateway 192.168.253.129
$ ip route show |grep 10.103.97.2
10.103.97.2 via 192.168.253.129 dev ens32 

## show nothing. when no error
$ sealos route del --host 10.103.97.2 --gateway 192.168.253.129
$ ip route show |grep 10.103.97.2

## exec twice
$ sealos route del --host 10.103.97.2 --gateway 192.168.253.129
delRouteGatewayViaHost err:  no such process
```

## 实现原理

通过和默认的路由条目进行比对. 使用 "github.com/vishvananda/netlink"命令操作`linux`主机默认路由。 


获取默认路由`ip`， 使用的是`"k8s.io/apimachinery/pkg/util/net"`这个包里面的` ChooseHostInterface()`来获取.
像`apiserver`和`etcd`的`advertise-address`都是这个方法获取。 目前只支持ipv4.

```go
func (r *RouteFlags) useHostCheckRoute() bool {
	return k8s.IsIpv4(r.Host) && r.Gateway ==""
}

func (r *RouteFlags) useGatewayManageRoute() bool {
	return k8s.IsIpv4(r.Gateway) && k8s.IsIpv4(r.Host)
}



// getDefaultRouteIp is get host ip by ChooseHostInterface() .
func getDefaultRouteIp() (ip string, err error) {
	netIp, err := k8snet.ChooseHostInterface()
	if err != nil {
		return "", err
	}
	return netIp.String(), nil
}
```

具体详情请查看源码`"github.com/labring/sealos/install/route.go"`

### 配合和`sealos init`使用

这里简要描述一下init逻辑： 

1. check ， 检查主机名是否重复
2. sendSealos, 将最新的sealos复制到 /usr/bin/ 
3. sendPackage， 将压缩kube1.**.tar.gz包复制到各主机
4. KubeadmConfigInstall, 生成`kubeadm-config`
5. GenerateCert, 生成`pki`证书
6. CreateKubeconfig, 生成`kube-×.config`文件
7. InstallMaster0, 安装第一个`master`节点。 
8. 安装其他子节点。 优先`master`， 再`node` 。

    8.1 安装master， 采用`kubeadm join --config=/root/kubeadm-join-config.yaml`
    
    8.2 安装node节点，对当前的网卡进行判断， 如果是单网卡跳过， 如果是多网卡， 且安装的node ip 不是本机的默认路由ip， 
    添加一条路由 例如`ip route add 10.103.97.2 via node ip`

所以， 当存在双网卡的时候，且init指定的node ip 不是默认路由所在的网卡ip， 在node节点。我们只需要在8.2的时候， 添加一条从`vip`到`node ip`的路由即可。

```go
// 如果不是默认路由， 则添加 vip 到 master的路由。
	cmdRoute := fmt.Sprintf("sealos route --host %s", IpFormat(node))
	status := SSHConfig.CmdToString(node, cmdRoute, "")
	if status != "ok" {
		// 以自己的ip作为路由网关
		addRouteCmd := fmt.Sprintf("sealos route add --host %s --gateway %s", VIP, IpFormat(node))
		SSHConfig.CmdToString(node, addRouteCmd, "")
	}
```
