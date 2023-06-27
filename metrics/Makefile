# 定义变量
DOCKER_IMAGE_NAME = registry.cn-hangzhou.aliyuncs.com/bxy4543/user-exporter
BUILD_TOOL ?= docker
DOCKER_TAG ?= dev
#KUBECONFIG = ${HOME}/.kube/config

# 默认目标：help
.DEFAULT_GOAL := help

# 显示帮助信息
.PHONY: help
help:
	@echo "Makefile for CRD Exporter"
	@echo "Available commands:"
	@echo "  make build         Build the exporter binary and Docker image"
	@echo "  make push          Push the Docker image to the repository"
	@echo "  make deploy        Deploy the exporter to a Kubernetes cluster"
	@echo "  make undeploy      Remove the exporter from the Kubernetes cluster"
	@echo "  make clean         Clean the build artifacts"

# 构建 exporter 二进制文件和 Docker 镜像
.PHONY: build
build:
	CGO_ENABLED=0 GOOS=linux go build -o crd_exporter .
	$(BUILD_TOOL) build -t $(DOCKER_IMAGE_NAME):$(DOCKER_TAG) .

# 将 Docker 镜像推送到存储库
.PHONY: push
push:
	$(BUILD_TOOL) push $(DOCKER_IMAGE_NAME):$(DOCKER_TAG)

# 部署 exporter 到 Kubernetes 集群
.PHONY: deploy
deploy:
	sed "s/<YOUR_DOCKER_IMAGE>/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)/" deploy.yaml | kubectl --kubeconfig=$(KUBECONFIG) apply -f -

# 从 Kubernetes 集群中删除 exporter
.PHONY: undeploy
undeploy:
	sed "s/<YOUR_DOCKER_IMAGE>/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)/" deploy.yaml | kubectl --kubeconfig=$(KUBECONFIG) delete -f -

# 清理构建产物
.PHONY: clean
clean:
	rm -f crd_exporter