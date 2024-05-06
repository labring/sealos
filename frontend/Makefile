DOCKER_USERNAME := $(DOCKER_USERNAME)
IMAGE_TAG := $(IMAGE_TAG)

ifneq ($(strip $(DOCKER_USERNAME)),)
  imageOwner := $(DOCKER_USERNAME)/
else
  imageOwner :=
endif

ifneq ($(strip $(IMAGE_TAG)),)
  imageTag := $(IMAGE_TAG)
else
  imageTag := dev
endif
# build image
buildTargets := \
	desktop \
	providers/terminal \
	providers/adminer \
	providers/costcenter \
	providers/dbprovider \
	providers/applaunchpad \
	providers/imagehub \
	providers/template \
	providers/cronjob \
	providers/license \
	providers/kubepanel \
	providers/objectstorage \
	providers/workorder

buildTargets-all := $(addprefix image-build-,$(buildTargets))
pushTargets-all := $(addprefix image-push-,$(buildTargets))
$(foreach target,$(buildTargets),$(eval .PHONY: image-build-$($(target))))
$(foreach target,$(buildTargets),$(eval .PHONY: image-push-$($(target))))
$(foreach target,$(buildTargets),$(eval .PHONY: dev-$($(target))))
$(foreach target,$(buildTargets),$(eval .PHONY: build-$($(target))))
.PHONY: all image-prebuild push-images

all: image-prebuild $(buildTargets-all)

push-images: image-prebuild $(pushTargets-all)
fetch-deps: pnpm-lock.yaml
	pnpm fetch
build-packages: fetch-deps
	pnpm -r --offline --filter=./packages/* install
	pnpm -r --offline --filter=./packages/* build
build-providers/%: build-packages
	pnpm -r --offline --filter=./providers/$* install
	pnpm -r --offline --filter=./providers/$* build
build-%: build-packages
	pnpm -r --offline --filter=$* install
	pnpm -r --offline --filter=$* build
dev-providers/%: build-packages
	pnpm -r --offline --filter=./providers/$* install
	pnpm -r --offline --filter=./providers/$* dev
dev-%: build-packages
	pnpm -r --offline --filter=$* install
	pnpm -r --offline --filter=$* dev

# prebuild-image-for -j
image-prebuild: pnpm-lock.yaml
	docker build --platform=linux/amd64 --target deps . -t $(imageOwner)sealos-deps:dev

image-build-providers/%: image-prebuild
	docker build --platform=linux/amd64 -t $(imageOwner)sealos-$*:$(imageTag) --build-arg path=providers/$* --build-arg name=$* .
image-build-%: image-prebuild
	docker build --platform=linux/amd64 -t $(imageOwner)sealos-$*:$(imageTag) --build-arg path=$* --build-arg name=$* .

image-push-providers/%: image-build-providers/%
	docker push $(imageOwner)sealos-$*:$(imageTag)
image-push-%: image-build-%
	docker push $(imageOwner)sealos-$*:$(imageTag)
# Default target to run all builds.
