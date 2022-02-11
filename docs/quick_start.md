# 快速开始

> 环境信息

| 主机名  | IP地址      |
| ------- | ----------- |
| master0 | 192.168.0.2 |
| master1 | 192.168.0.3 |
| master2 | 192.168.0.4 |
| node0   | 192.168.0.5 |

服务器密码：123456

**kubernetes高可用安装教程**

> 只需要准备好服务器，在任意一台服务器上执行下面命令即可

**kubernetes 修订版本号为0的版本（比如1.14.0，1.15.0等）不建议上生产环境!!!**

```sh
# 下载并安装sealos, sealos是个golang的二进制工具，直接下载拷贝到bin目录即可, release页面也可下载
$ wget -c https://sealyun.oss-cn-beijing.aliyuncs.com/latest/sealos && \
    chmod +x sealos && mv sealos /usr/bin 

# 下载离线资源包
$ wget -c https://sealyun.oss-cn-beijing.aliyuncs.com/05a3db657821277f5f3b92d834bbaf98-v1.22.0/kube1.22.0.tar.gz

# 安装一个三master的kubernetes集群
$ sealos init --passwd '123456' \
	--master 192.168.0.2  --master 192.168.0.3  --master 192.168.0.4  \
	--node 192.168.0.5 \
	--pkg-url /root/kube1.22.0.tar.gz \
	--version v1.22.0
```

> 参数含义

| 参数名  | 含义                                                         | 示例                    |
| ------- | ------------------------------------------------------------ | ----------------------- |
| passwd  | 服务器密码                                                   | 123456                  |
| master  | k8s master节点IP地址                                         | 192.168.0.2             |
| node    | k8s node节点IP地址                                           | 192.168.0.3             |
| pkg-url | 离线资源包地址，支持下载到本地，或者一个远程地址             | /root/kube1.22.0.tar.gz |
| version | [资源包](https://www.sealyun.com/goodsList) 对应的版本 | v1.22.0                 |

> 增加master

```bash
sealos join --master 192.168.0.6 --master 192.168.0.7
sealos join --master 192.168.0.6-192.168.0.9  # 或者多个连续IP
```

> 增加node

```bash
sealos join --node 192.168.0.6 --node 192.168.0.7
sealos join --node 192.168.0.6-192.168.0.9  # 或者多个连续IP
```
> 删除指定master节点

```bash
sealos clean --master 192.168.0.6 --master 192.168.0.7
sealos clean --master 192.168.0.6-192.168.0.9  # 或者多个连续IP
```

> 删除指定node节点

```bash
sealos clean --node 192.168.0.6 --node 192.168.0.7
sealos clean --node 192.168.0.6-192.168.0.9  # 或者多个连续IP
```

> 清理集群

```bash
sealos clean --all
```

> 备份集群

```bash
sealos etcd save
```

**注意事项**

- 必须同步所有服务器时间
- 所有服务器主机名不能重复
- 系统支持：centos7.6以上 ubuntu16.04以上
- 内核推荐4.14以上， 系统推荐：centos7.7
