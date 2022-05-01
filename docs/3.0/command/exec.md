# `sealos exec` 命令

>  支持在指定节点执行自定义命令, 拷贝一个文件到一些指定节点

如在所有master节点创建一个目录

```
sealos exec --cmd "mkdir /data" --label node-role.kubernetes.io/master=""
sealos exec --cmd "mkdir /data" --node x.x.x.x
sealos exec --cmd "mkdir /data" --node dev-k8s-mater 
```

拷贝一个文件到一些指定节点

```
sealos exec --src /data/foo --dst /root/foo --label node-role.kubernetes.io/master=""
sealos exec --src /data/foo --dst /root/foo --node x.x.x.x
sealos exec --src /data/foo --dst /root/foo --node dev-k8s-mater 
```

## 实现方法

### 获取待执行的`ip`序列逻辑

 将 `--label , --node hostname` 所关联的对象全部转为`ip`, 以`ip`为基点去执行`copy`或者是`cmd`. 

使用`ListOptions`, 通过`labelSelector`直接定位到相关的`nodeList`节点. 如果`label`为空, 则返回空. 如果不为空, 则返回的`ip` 加入到待执行的`ip`序列. 

```
func GetNodeListByLabel(k8sClient *kubernetes.Clientset, label string) (*v1.NodeList, error) {
	listOption := &metav1.ListOptions{LabelSelector: label}
	return k8sClient.CoreV1().Nodes().List(context.TODO(), *listOption)
}
func GetNodeIpByLabel(k8sClient *kubernetes.Clientset, label string) ([]string, error) {
	var ips []string
	if label == "" {
		return ips, nil
	}
	nodes, err := GetNodeListByLabel(k8sClient, label)
	if err != nil {
		return nil, err
	}
	for _, node := range nodes.Items {
		for _, v := range node.Status.Addresses {
			if v.Type == v1.NodeInternalIP {
				ips = append(ips, v.Address)
			}
		}
	}
	if len(ips) != 0 {
		return ips, nil
	}
	return nil, fmt.Errorf("label %s is not fount in kubernetes nodes", label)
}
```

将 `--node` 进行区分, 如果是`ip` ,则加入执行`ip`序列, 如果是`hostname`, 则加入到`hostname`序列, 通过使用Get方法, 获取K8s的ClientSet资源对象.通过`nodename`直接找到定位到node节点. 在通过一次`for loop` 找到`hostname`对应的`ip`, 将得到的`ip`加入到待执行的`ip`序列.

```
node, err := k8sClient.CoreV1().Nodes().Get(context.TODO(), nodeName, metav1.GetOptions{})

for _, node := range resHost {
	ip, err := GetNodeIpByName(k8sClient, node)
	if err == nil {
		ips = append(ips, ip)
	}
}
```

这里对`ips`没有进行过滤. 只要满足是ipv4, 即加入到执行序列, 没有对`master ips`及`nodes ips`进行比对. 

```
// 集群 
k8s-master    192.168.0.31
huohua-test   192.168.0.30
server65      192.168.0.65
server88-new  192.168.0.88

// sealos exec --cmd "hostname"  --node 192.168.0.21 
// 192.168.0.21 is not in your kubernetes. but if your ssh access 192.168.0.21. the command will be exec in 192.168.0.21.  
```

### 执行命令逻辑

判断是执行`copy` 或者是 `cmd`方法如下. 如果两者都存在, 则先执行`copy`逻辑, 再执行`cmd`逻辑.

```
type ExecFlag struct {
	Dst      string
	Src      string
	Cmd      string
	Label    string
	ExecNode []string
	SealConfig
}

func (e *ExecFlag) IsUseCopy() bool {
	return FileExist(e.Src) && e.Dst != ""
}

func (e *ExecFlag) IsUseCmd() bool {
	return e.Cmd != ""
}
```

### 远程命令和复制实现

实现`scp`复制, 则是通过复制单个文件, 然后递归复制即可. 查看具体的[源码](https://github.com/labring/sealos/blob/master/pkg/sshcmd/sshutil/scp.go)
如果`--dst`在目标机器存在, 则不执行copy动作, 直接就跳过了. 

// todo
这里是否需要添加一个flag, 比如`--force, -f`, 直接覆盖? 或者先删除再复制?

```
// CopyLocalToRemote is copy file or dir to remotePath
func (ss *SSH) CopyLocalToRemote(host, localPath, remotePath string) {

}
// ssh session is a problem, 复用ssh链接
func (ss *SSH) copyLocalDirToRemote(sftpClient *sftp.Client, localPath, remotePath string) {

}
// solve the session
func (ss *SSH) copyLocalFileToRemote(sftpClient *sftp.Client, localPath, remotePath string) {

}
```

实现执行命令的逻辑. 这里是用的ssh. 具体不赘述.

## 使用方法

```
$ ./sealos exec -h
support exec cmd or copy file by Label/nodes

Usage:
  sealos exec [flags]

Examples:

	# exec cmd by label or nodes.  when --label and --node is Exist, get Union of both.
	sealos exec --cmd "mkdir /data" --label node-role.kubernetes.io/master= --node 192.168.0.2
	sealos exec --cmd "mkdir /data" --node 192.168.0.2 --nodes dev-k8s-mater
	
	# exec copy src file to dst by label or nodes. when --label and --node is Exist, get Union of both.
	sealos exec --src /data/foo --dst /root/foo --label node-role.kubernetes.io/master=""
	sealos exec --src /data/foo --dst /root/foo --node 192.168.0.2


Flags:
      --cmd string     exec command string
      --dst string     dest file location
  -h, --help           help for exec
      --label string   kubernetes labels like node-role.kubernetes.io/master=
      --node strings   node ip or hostname in kubernetes
      --src string     source file location

Global Flags:
      --config string   config file (default is $HOME/.sealos/config.yaml)
```

选项说明: 

- `--cmd`:  执行的命令.
- `--src`: 本地文件路径, 可以使文件或者是文件夹, 配合`--dst`使用.
- `--dst`: 目标文件路径, 配合`--src`使用.
- `--label`: `kubernetes`集群的`label`. 支持`label`逻辑表达式, 如 `kubernetes.io/arch!=amd64` 
- `--node`: 节点的`ip`或者是`hostname`

## 测试相关

集群如下

```
$ kubectl get nodes --show-labels
NAME           STATUS   ROLES    AGE   VERSION   LABELS
huohua-test    Ready    <none>   93d   v1.18.3   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=huohua-test,kubernetes.io/os=linux,name=huohua
k8s-master     Ready    master   93d   v1.18.3   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=k8s-master,kubernetes.io/os=linux,node-role.kubernetes.io/master=
server65       Ready    <none>   89d   v1.18.3   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=server65,kubernetes.io/os=linux
server88-new   Ready    <none>   90d   v1.18.3   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=server88-new,kubernetes.io/os=linux,name=front
```

#### 仅使用 `--label` 执行 `cmd` 命令

<details><summary><code>1. Use --label to exec cmd </code> Output</summary><br><pre>
$ ./sealos exec --cmd "hostname "  --label beta.kubernetes.io/arch=amd64  
19:09:35 [INFO] [ssh.go:57] [ssh][192.168.0.88] cd /tmp && hostname 
19:09:35 [INFO] [ssh.go:57] [ssh][192.168.0.31] cd /tmp && hostname 
19:09:35 [INFO] [ssh.go:57] [ssh][192.168.0.30] cd /tmp && hostname 
19:09:35 [INFO] [ssh.go:57] [ssh][192.168.0.65] cd /tmp && hostname 
19:09:35 [INFO] [ssh.go:50] [192.168.0.88] server88-new
19:09:35 [INFO] [ssh.go:50] [192.168.0.30] huohua-test
19:09:35 [INFO] [ssh.go:50] [192.168.0.65] server65
19:09:36 [INFO] [ssh.go:50] [192.168.0.31] k8s-master
</pre></details>

#### 仅使用 `--node` 执行 `cmd` 命令

<details><summary><code>2. Use --node to exec cmd </code> Output</summary><br><pre>
$ ./sealos exec --cmd "hostname -i"  --node huohua-test --node 192.168.0.65 
19:20:47 [INFO] [ssh.go:57] [ssh][192.168.0.30] cd /tmp && hostname -i
19:20:47 [INFO] [ssh.go:57] [ssh][192.168.0.65] cd /tmp && hostname -i
19:20:47 [INFO] [ssh.go:50] [192.168.0.30] 192.168.0.30
19:20:47 [INFO] [ssh.go:50] [192.168.0.65] 192.168.0.65
</pre></details>

#### 使用 `--label` 和 `--node`执行 `cmd` 命令

<details><summary><code>3. Use --node & --label  to exec cmd  </code> Output</summary><br><pre>
$ ./sealos exec --cmd "hostname -i"  --node huohua-test  --label node-role.kubernetes.io/master=  
19:21:44 [INFO] [ssh.go:57] [ssh][192.168.0.30] cd /tmp && hostname -i
19:21:44 [INFO] [ssh.go:57] [ssh][192.168.0.31] cd /tmp && hostname -i
19:21:44 [INFO] [ssh.go:50] [192.168.0.30] 192.168.0.30
19:21:45 [INFO] [ssh.go:50] [192.168.0.31] 192.168.0.31
</pre></details>

#### 使用 `--label` 和 `--node`执行 `cmd` 命令和 复制文件

<details><summary><code>4. Use --node & --label  to exec cmd & copy files  </code> Output</summary><br><pre>
$ ./sealos exec --cmd "ls -lh /data/01.txt" --src /root/01.txt --dst /data/01.txt  --node huohua-test  --label node-role.kubernetes.io/master=  
19:23:01 [INFO] [ssh.go:12] [ssh][192.168.0.30] ls -l /data/01.txt 2>/dev/null |wc -l
19:23:01 [INFO] [ssh.go:12] [ssh][192.168.0.31] ls -l /data/01.txt 2>/dev/null |wc -l
19:23:01 [DEBG] [ssh.go:24] [ssh][192.168.0.30]command result is: 0
19:23:02 [INFO] [scp.go:328] [ssh]transfer [/root/01.txt] total size is: 2.11MB ;speed is 2MB
19:23:02 [DEBG] [ssh.go:24] [ssh][192.168.0.31]command result is: 0
19:23:02 [INFO] [scp.go:328] [ssh]transfer [/root/01.txt] total size is: 2.11MB ;speed is 2MB
19:23:02 [INFO] [ssh.go:57] [ssh][192.168.0.30] cd /tmp && ls -lh /data/01.txt
19:23:02 [INFO] [ssh.go:57] [ssh][192.168.0.31] cd /tmp && ls -lh /data/01.txt
19:23:02 [INFO] [ssh.go:50] [192.168.0.30] -rw-r--r-- 1 root root 2.2M 9月   4 19:23 /data/01.txt
19:23:03 [INFO] [ssh.go:50] [192.168.0.31] -rw-r--r--. 1 root root 2.2M Sep  4 19:23 /data/01.txt
</pre></details>

#### 使用 `--label` 和 `--node`执行 `cmd` 命令和 复制文件夹

<details><summary><code>5. Use --node & --label  to exec cmd & copy dir  </code> Output</summary><br><pre>
$ ./sealos exec --cmd "ls -lh /data/test" --src /root/test --dst /data/test  --node huohua-test  --label node-role.kubernetes.io/master=  
19:24:24 [INFO] [ssh.go:12] [ssh][192.168.0.30] ls -l /data/test 2>/dev/null |wc -l
19:24:24 [INFO] [ssh.go:12] [ssh][192.168.0.31] ls -l /data/test 2>/dev/null |wc -l
19:24:24 [DEBG] [ssh.go:24] [ssh][192.168.0.30]command result is: 0
19:24:24 [INFO] [scp.go:328] [ssh]transfer [/root/test/crontab.yaml] total size is: 1.19KB ;speed is 1KB
19:24:24 [INFO] [scp.go:328] [ssh]transfer [/root/test/crontab.yaml.bak] total size is: 2.23KB ;speed is 2KB
19:24:24 [DEBG] [ssh.go:24] [ssh][192.168.0.31]command result is: 0
19:24:25 [INFO] [scp.go:328] [ssh]transfer [/root/test/crontab.yaml] total size is: 1.19KB ;speed is 1KB
19:24:25 [INFO] [scp.go:328] [ssh]transfer [/root/test/crontab.yaml.bak] total size is: 2.23KB ;speed is 2KB
19:24:25 [INFO] [ssh.go:57] [ssh][192.168.0.30] cd /tmp && ls -lh /data/test
19:24:25 [INFO] [ssh.go:57] [ssh][192.168.0.31] cd /tmp && ls -lh /data/test
19:24:25 [INFO] [ssh.go:50] [192.168.0.30] 总用量 8.0K
19:24:25 [INFO] [ssh.go:50] [192.168.0.30] -rw-r--r-- 1 root root 1.2K 9月   4 19:24 crontab.yaml
19:24:25 [INFO] [ssh.go:50] [192.168.0.31] total 8.0K
</pre></details>

#### 使用 `--label`时,  `label` 不存在

<details><summary><code>6. Use --label if label not exist  </code> Output</summary><br><pre>
$ ./sealos exec --cmd "hostname -i"  --node huohua-test  --label node-role.kubernete.
12:48:25 [EROR] [exec.go:53] get ips err:  unable to parse requirement: invalid label key "node-role.kubernete.": name part must consist of alphanumeric characters, '-', '_' or '.', and must start and end with an alphanumeric character (e.g. 'MyName',  or 'my.name',  or '123-abc', regex used for validation is '([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9]')
$ ./sealos exec --cmd "hostname -i"  --node huohua-test  --label node-role.kubernete               
12:48:42 [EROR] [exec.go:53] get ips err:  label node-role.kubernete is not fount in kubernetes nodes
</pre></details>

#### 使用 `--node`时,  `node`不存在

<details><summary><code>7. Use --node if node  not exist in kuernetes  </code> Output</summary><br><pre>
12:50:05 [INFO] [ssh.go:50] [192.168.0.88] server88-new
12:50:05 [INFO] [ssh.go:50] [192.168.0.30] huohua-test
12:50:05 [INFO] [ssh.go:50] [192.168.0.65] server65
12:50:05 [INFO] [ssh.go:50] [192.168.0.31] k8s-master
## this will output nothing   
$ ./sealos exec --cmd "hostname -i"  --node huohua-test031
## only exec on exsit nodes.
./sealos exec --cmd "hostname -i"  --node huohua-test031 --node 192.168.0.65
12:51:28 [INFO] [ssh.go:57] [ssh][192.168.0.65] cd /tmp && hostname -i
12:51:29 [INFO] [ssh.go:50] [192.168.0.65] 192.168.0.65
## when nodes ip is format but is not in kubernetes, will appear ssh session error , timeout. 
$ ./sealos exec --cmd "hostname -i"  --node huohua-test031 --node 192.168.9.65
12:52:14 [INFO] [ssh.go:57] [ssh][192.168.9.65] cd /tmp && hostname -i
12:53:14 [EROR] [ssh.go:60] [ssh][192.168.9.65]Error create ssh session failed,dial tcp 192.168.9.65:22: i/o timeout
</pre></details>

#### 支持`kubernetes label`的逻辑表达式. 

<details><summary><code>8. support kubernetes label exp like kubernetes.io/arch!=amd64  </code> Output</summary><br><pre>
$ kubectl get nodes --show-labels
NAME           STATUS   ROLES    AGE   VERSION   LABELS
huohua-test    Ready    <none>   93d   v1.18.3   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=huohua-test,kubernetes.io/os=linux,name=huohua
k8s-master     Ready    master   93d   v1.18.3   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=k8s-master,kubernetes.io/os=linux,node-role.kubernetes.io/master=
server65       Ready    <none>   89d   v1.18.3   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=server65,kubernetes.io/os=linux
server88-new   Ready    <none>   89d   v1.18.3   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=server88-new,kubernetes.io/os=linux,name=front
$ ./sealos exec --cmd  "hostname -i"  --label name!=front 
09:17:21 [INFO] [ssh.go:57] [ssh][192.168.0.65] cd /tmp && hostname -i
09:17:21 [INFO] [ssh.go:57] [ssh][192.168.0.30] cd /tmp && hostname -i
09:17:21 [INFO] [ssh.go:57] [ssh][192.168.0.31] cd /tmp && hostname -i
09:17:21 [INFO] [ssh.go:50] [192.168.0.30] 192.168.0.30
09:17:21 [INFO] [ssh.go:50] [192.168.0.65] 192.168.0.65
09:17:21 [INFO] [ssh.go:50] [192.168.0.31] 192.168.0.31
</pre></details>

