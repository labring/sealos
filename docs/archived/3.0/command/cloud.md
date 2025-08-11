# sealos对接公有云
sealos已经把kubernetes安装做的最简单了，然而虽然是一条命令就可能安装k8s集群，填IP，服务器密码等参数任然对于笔者这种懒汉来说还是太麻烦

如何做到三秒安装（操作三秒，刷五分钟抖音）集群就构建成功成为sealos需要思考的。这点对于大部分使用公有云的用户来说成为了可能。

# 使用教程
在不指定任何参数时sealos会根据一些默认参数帮助用户构建一个k8s集群。
```
sealos cloud --accessKey xxx --accessSecret xxx
```
其它参数都为可选参数，安装时不加-y参数会与用户交互提示

参数说明：

参数名 | 参数值例 | 说明 
---|---|---
accessKey| LTAIah2bOOcr0uuT | 如阿里云的accessKey,在[用户信息](https://usercenter.console.aliyun.com/#/manage/ak)中可找到
accessSecret| FN3FcvXUctbudisnHs89bcYlbsZuImh
provider|ali| 云供应商，支持阿里云等
master|3|kubernetes master数量
node|4| kubernetes node数量
version|v1.16.3| kubernetes版本
flavor|2C4G| 2核4G的虚拟机，虚拟机实例类型，也可自己设置阿里云的机型，但是自己设置需要确认是否能兼容可用区等
name|mycluster| kubernetes集群名称
passwd|123456| 虚拟机密码
region|cn-hangzhou| 虚拟机可用区
zone|cn-hangzhou-a| 虚拟机zone
y | 无 | 免交互模式，有些默认值参数需要用户确认，以免起错集群

> 使用阿里云cloudshell

觉得填写accessKey，accessSecret很麻烦可以到cloudshell中执行，就无需填写这两个参数，因为cloudshell已经有这两个参数的环境变量。

构建集群只需要,这是世界上最简单的方式：
```
sealos cloud
```
cloudshell在用户控制台右上角，一个终端小图标

![](https://user-images.githubusercontent.com/8912557/65605474-ba6c4380-dfdb-11e9-8b9b-7842bf8e146b.png)

> 起一个3master 4node 的1.14.9集群

```
sealos cloud --master 3 --node 4 \
    --version v1.14.9 --flavor 2C4G \
    --name mytest --passwd test123 \
    --region cn-hangzhou
```

# 执行原理
1. sealos cloud根据参数申请公有云机器
2. 通过FIP连接到master0上下载sealos
3. 在master0上执行sealos init ...

# 关于虚拟机镜像
会使用基于centos7的虚拟机镜像，为了确保100%能安装成功推荐使用我们制作的自定义镜像，收费标准是0.05/小时/台机器

也就是一台机器五分钱一小时。

# 关于实例类型
首个版本支持的是阿里云的竞价实例，竞价实例相比普通实例拥有便宜很多的价格优势，是弹性计算的好选择

# 关于terraform
做了一个艰难的决定没去用terraform, terraform很优秀，对公有云openstack的编排做的非常好，但是没找到它的SDK这意味着只能通过调用命令行工具去使用terraform,这样就增加了sealos的依赖，这违背了sealos简单的原则，所以采用自己基于阿里云和腾讯云的SDK实现此功能

# 商业支持
请邮箱联系：fhtjob@hotmail.com

能提供以下支持：

* sealos定制化开发，支持用户特定要求的实例类型，付费规则等
* 弹性计算定制，在夜间业务低谷期时释放实例缩小k8s集群，大大降低企业使用公有云成本
* 保障集群自身稳定，可靠

PS：sealos定制价格极低，邮件获取报价单
