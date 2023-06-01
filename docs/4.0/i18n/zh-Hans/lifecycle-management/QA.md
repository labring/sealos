# 常见问题与解决方案

## 一、构建与代理

### 如何在build阶段设置代理服务?

在执行build命令时，可以设置HTTP_PROXY环境变量以配置代理服务。

```shell
HTTP_PROXY=socket5://127.0.0.1:7890 sealos build xxxxx
```

### 如何开启buildah的debug日志?

如果您需要查看buildah的debug日志，可以通过设置BUILDAH_LOG_LEVEL环境变量来开启。

```shell
BUILDAH_LOG_LEVEL=debug sealos images
```

## 二、运行时选择

### 搭建k8s如何选择运行时？

根据您选择的镜像，sealos将使用不同的运行时。如果您选择了kuberletes-docker镜像，sealos将使用docker作为运行时；如果选择了kuberletes-crio镜像，则使用crio作为运行时。

## 三、版本兼容性问题

### 出现报错："Applied to cluster error: failed to init exec auth.sh failed exit status 127"

这个问题通常与您使用的sealos版本和镜像版本不匹配有关。请确认您的镜像版本和sealos的版本是对应的。

例如，如果您正在使用形如kubernetes:v1.xx.x的版本，您可能需要升级sealos，尤其在您使用了老版本的sealos，但sealos集群镜像使用的是最新版时。

另一个解决方法是选择对应版本的sealos镜像。例如，如果您的sealos版本是4.1.3，那么您的集群镜像应该选择形如kuberntes:v1.24.0-4.1.3的版本。

通过确保镜像版本和sealos版本的匹配，您可以避免这类问题的出现。

## 四、文件和目录位置

### 如何修改/root/.sealos默认目录的存储位置

如果您需要修改默认的存储位置，可以设置SEALOS_RUNTIME_ROOT环境变量，然后运行sealos命令。为了方便，建议您将这个环境变量设置为全局的，这样您在其他命令或场景中也可以方便地使用。

```shell
export SEALOS_RUNTIME_ROOT=/data/.sealos 
sealos run labring/kubernetes:v1.24.0
```

### 如何修改/var/lib/sealos默认目录的存储位置

如果您需要修改默认的存储位置，可以设置SEALOS_DATA_ROOT环境变量，然后运行sealos命令。同样，为了方便，建议您将这个环境变量设置为全局的。

```shell
export SEALOS_DATA_ROOT=/data/sealos 
sealos run labring/kubernetes:v1.24.0
```

### ssh传输文件时,如何操作可以禁止检查文件的md5

在网络环境良好的情况下，禁用md5检查可以大幅提升传输速度。如果您不想在ssh传输文件时检查文件的md5，可以设置SEALOS_SCP_CHECKSUM环境变量为false来禁用这个功能。为了便于多场景使用，建议将此环境变量设置为全局。

```shell
export SEALOS_SCP_CHECKSUM=false
sealos run labring/kubernetes:v1.24.0
```

## 五、其他问题

### image-cri-shim导致端口大量占用，耗尽服务器socket资源

当出现此问题时，您可以尝试以下命令来解决：

```shell
wget https://github.com/labring/sealos/releases/download/v4.2.0/sealos_4.2.0_linux_amd64.tar.gz && tar xvf sealos_4.2.0_linux_amd64.tar.gz image-cri-shim
sealos exec -r master,node "systemctl stop image-cri-shim"
sealos scp "./image-cri-shim" "/usr/bin/image-cri-shim"
sealos exec -r master,node "systemctl start image-cri-shim"
sealos exec -r master,node "image-cri-shim -v"
```

### 报错[ERROR FileAvailable--etc-kubernetes-kubelet.conf]: /etc/kubernetes/kubelet.conf already exists

若出现此问题，您可能需要升级到sealos 4.1.7+。

### 报错："function "semverCompare" not defined"

如果您在使用sealos时遇到了这个错误，您需要升级到sealos 4.1.4+。

---

希望以上内容能帮助解决您在使用sealos时遇到的问题。如果还有其他问题，欢迎随时提出。
