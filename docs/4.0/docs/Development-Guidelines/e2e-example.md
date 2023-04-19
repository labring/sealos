# How to write E2E tests and integrate with Github Actions

### Why perform E2E testing?

​    The main purpose of performing E2E testing is to ensure that the application can function properly in real user scenarios. By simulating the actual user operation process, it can detect any faults or errors in the entire system and ensure that the application can function properly under various circumstances. CRD testing in k8s needs to be deployed to the k8s cluster before it can be checked if it meets expectations.



### How to write E2E tests

#### Prerequisites

Before starting the test, please make sure you have met the following requirements:

- Kubernetes cluster is installed and running properly.
- kubectl tool is installed and can be used to connect to the Kubernetes cluster.
- Go language environment is installed and go command can be used.

#### Deploy CRD

If you have k8s on your local machine, you can directly run `make build run` locally. If you have a webhook, you need to package the image yourself and deploy it using `make deploy`.

#### Writing test files

For example, there is a Metering CRD that will create a corresponding CR (CRD instantiation) when an ns is created. In the test file, run the program to create an ns and check if CR has been created.

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

#### Resource cleaning

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

### How to integrate E2E tests with Github Actions

By integrating E2E tests into the CI/CD process, the testing process can be automated and development efficiency can be improved. Automation testing can reduce the time and effort required for manual testing, which helps improve development efficiency and speed up release. Here are some steps to integrate automatic testing with Github Actions for automatic testing every time code is submitted. [example](https://docgpt.ahapocket.cn/.github/workflows/e2e.yml)



#### Create yml file

Create a Github Actions configuration file that defines an E2E test job in a configuration file named .github/workflows/e2e.yml.

#### Define triggers

Define triggers to specify when to run jobs. You can choose to run on every code submission or periodically. For example, when there is a push request on any branch and files under paths are modified, the test will be triggered.

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

#### Environment installation

Clone code, install go and sealos in advance.

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

#### Package the image and push it to Github

`GH_PAT` needs to be set up in advance in Github secret, which is the Github token. [How to get it](https://blog.51cto.com/u_15069485/3590346)

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

#### Install k8s environment on Github Actions



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

#### Deploy CRD on Github Actions

```
      - name: install CRD metering
        working-directory: ./controllers/metering
        run: |
          sudo -u root kubectl apply -f ./deploy/manifests/deploy.yaml
          sleep 10
```

#### Run test code on Github Actions.

```
      -  name: metering e2e Test
         working-directory: ./controllers/metering
         run: |
           go test -v ./testdata/e2e/metering_test.go -run TestMetering
```