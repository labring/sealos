ifeq ($(OS),Windows_NT)
  SHELL := powershell.exe
  DOCKER_USERNAME := $(DOCKER_USERNAME)
else
  UNAME_S := $(shell uname -s)
  ifeq ($(UNAME_S),Linux)
    SHELL := /bin/bash
    CURRENT_USER := $(shell echo $$USER)
  endif
  ifeq ($(UNAME_S),Darwin)
    SHELL = /usr/bin/env bash
    CURRENT_USER := $(shell id -un)
  endif
endif

ifneq ($(strip $(DOCKER_USERNAME)),)
  imageOwner := $(DOCKER_USERNAME)
else
  imageOwner :=
endif

# build image
buildTargets := \
	desktop \
	providers/terminal \
	providers/adminer \
	providers/bytebase \
	providers/costcenter \
	providers/dbprovider \
	providers/applaunchpad \
	providers/imagehub

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
	docker build --target deps . -t $(imageOwner)sealos-deps:dev

image-build-providers/%: image-prebuild
	docker build -t $(imageOwner)sealos-$*:dev --build-arg path=providers/$* --build-arg name=$* . 
image-build-%: image-prebuild
	docker build -t $(imageOwner)sealos-$*:dev --build-arg path=$* --build-arg name=$* . 

image-push-providers/%: image-build-providers/%
	docker push $(imageOwner)sealos-$*:dev 
image-push-%: image-build-%
	docker push $(imageOwner)sealos-$*:dev
# Default target to run all builds.
