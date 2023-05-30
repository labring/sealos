# 如何编写e2e测试和接入github-action

### 为什么要进行 e2e 测试?

​    进行E2E测试的主要目的是确保应用程序在真实的用户场景下能够正常运行 通过模拟用户的实际操作流程 它可以检测到整个系统中的任何故障或错误 并且可以确保应用程序在各种情况下都能够正常运行 ,k8s 中 CRD 测试需要部署到 k8s 集群之后才能看是否满足自己期望。



### 如何进行e2e测试编写

#### 前置条件

在开始测试之前，请确保您已经满足以下条件：

- 已经安装了 Kubernetes 集群，并且集群正常运行。
- 已经安装了 kubectl 工具，并且可以使用该工具连接到 Kubernetes 集群。
- 已经安装了 go 语言环境，并且可以使用 go 命令。

#### 部署CRD

本机有k8s 可以执行`make build run `直接本地运行，如果有 webhook 得自己打包镜像使用`make deploy` 部署

#### 测试文件编写

举个例子，有一个Metering CRD，会随着ns的创建而创建一个对应的CR（CRD 实例化）,在测试文件中运行程序创建一个ns，查看CR是否被创建

```
func TestMetering(t *testing.T) {
		t.Run("metering should be created when create a user ns", func(t *testing.T) {
			t.Log("create metering  ")
			// if ns have created,will skip,if not ,will create ns
			baseapi.EnsureNamespace(TestNamespace)
			
			t.Log("ensure metering is created")
			_, err := api.GetMetering(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace)
			if err != nil {
				t.Fatalf("failed to get metering: %v", err)
			}
		})
		t.Cleanup(clear)
}
```

#### 资源清理

```
func clear() {
	// delete metering CR
	err = api.DeleteMetering(MeteringSystemNamespace, meteringv1.MeteringPrefix+TestNamespace)
	if err != nil {
		log.Println(err)
	}
	// delete test namespace
	err = baseapi.DeleteNamespace(TestNamespace)
	if err != nil {
		log.Println(err)
	}
}
```



### e2e 测试如何接入github-action

通过将E2E测试集成到CI/CD流程中 可以自动化测试过程 并提高开发效率 通过自动化测试 可以减少手动测试所需的时间和精力 这有助于提高开发效率并加快发布速度，以下是接入Github-Action每次代码提交自动测试的一些步骤。[example](/.github/workflows/e2e.yml)

#### 创建yml文件

创建Github-Action配置文件 创建一个名为.github/workflows/e2e.yml 的配置文件 并在其中定义E2E测试作业

#### 定义触发器

定义触发器以指定何时运行作业 可以选择在每次代码提交时运行或定期运行

举例子，任何branch 有push请求时，如果修改了paths下面的文件，就会触发测试

```
on:
  workflow_dispatch:
  push:
    branches: [ "*" ]
    paths:
      - "controllers/metering/**"
      - "controllers/common/metering/**"
      - ".github/workflows/e2e.yml"
      - "controllers/account/**"
      - "!**/*.md"
      - "!**/*.yaml"
```



#### 环境安装

clone 代码、安装go，安装sealos

```
jobs:
  build-image:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        module: [ metering, account ]
    steps:
      - name: Checkout # clone 代码
        uses: actions/checkout@v3 

      - name: Setup Golang with cache
        uses: magnetikonline/action-golang-cache@v3
        with:
          go-version: ${{ env.GO_VERSION }}
      - name: Auto install sealos
        uses: labring/sealos-action@v0.0.4
        with:
          sealosVersion: 4.1.5-alpha2
```



#### 打包镜像并且push 到gtihub上

需要预先设置好`GH_PAT `在github secret中，是github token，[获取办法](https://blog.51cto.com/u_15069485/3590346)

```
      - name: Build ${{ matrix.module }} amd64  # 打包amd64镜像
        working-directory: controllers/${{ matrix.module }}
        run: |
          GOARCH=amd64 make build
          mv bin/manager bin/controller-${{ matrix.module }}-amd64
          chmod +x bin/controller-${{ matrix.module }}-amd64
      - name: Build ${{ matrix.module }} image
        working-directory: controllers/${{ matrix.module }}
        run: |
          sealos login -u ${{ github.repository_owner }} -p ${{ secrets.GH_PAT }} --debug ghcr.io
          DOCKER_REPO=ghcr.io/${{ github.repository_owner }}/sealos-${{ matrix.module }}-controller
          sealos build --debug  -t $DOCKER_REPO:dev .
          sealos push  $DOCKER_REPO:dev
```



#### 在github-action 上面安装k8s环境

```
      - name: Auto install k8s using sealos
        uses: labring/sealos-action@v0.0.2
        with:
          image: labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1
          debug: true
          type: run-k8s

      - name: After k8s operation
        run: |
          mkdir -p $HOME/.kube
          sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
          sudo chown $(id -u):$(id -g) $HOME/.kube/config
          NODENAME=$(sudo -u root kubectl get nodes -ojsonpath='{.items[0].metadata.name}' )
          NODEIP=$(sudo -u root kubectl get nodes -ojsonpath='{.items[0].status.addresses[0].address}' )
          echo "NodeName=$NODENAME,NodeIP=$NODEIP"
          sudo -u root kubectl taint node $NODENAME node-role.kubernetes.io/control-plane-
          sleep 40
```

#### 在gtihub-action里面部署CRD

```
      - name: install CRD metering
        working-directory: ./controllers/metering
        run: |
          sudo -u root kubectl apply -f ./deploy/manifests/deploy.yaml
          sleep 10
```

#### 运行测试代码

```
      -  name: metering e2e Test
         working-directory: ./controllers/metering
         run: |
           go test -v ./testdata/e2e/metering_test.go -run TestMetering
```







