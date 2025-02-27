# Copyright © 2022 sealos.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# This file is currently not in use, but please do not delete it as
# it may be useful in the future.

DOCKER := docker
DOCKER_SUPPORTED_API_VERSION ?= 1.40

REGISTRY_PREFIX ?= ghcr.io/labring
IMAGES ?= lvscare
IMAGE_PLAT ?= $(subst $(SPACE),$(COMMA),$(subst _,/,$(PLATFORMS)))

ifeq (${IMAGES},)
  $(error Could not determine IMAGES, set ROOT_DIR or run in source dir)
endif

.PHONY: image.daemon.verify
image.daemon.verify:
	$(eval PASS := $(shell $(DOCKER) version | grep -q -E 'Experimental: {1,6}true' && echo 1 || echo 0))
	@if [ $(PASS) -ne 1 ]; then \
		echo "Experimental features of Docker daemon is not enabled. Please add \"experimental\": true in '/etc/docker/daemon.json' and then restart Docker daemon."; \
		exit 1; \
	fi

.PHONY: image.verify
image.verify:
	$(eval API_VERSION := $(shell $(DOCKER) version | grep -E 'API version: {1,6}[0-9]' | head -n1 | awk '{print $$3} END { if (NR==0) print 0}' ))
	$(eval PASS := $(shell echo "$(API_VERSION) > $(DOCKER_SUPPORTED_API_VERSION)" | bc))
	@if [ $(PASS) -ne 1 ]; then \
		$(DOCKER) -v ;\
		echo "Unsupported docker version. Docker API version should be greater than $(DOCKER_SUPPORTED_API_VERSION)"; \
		exit 1; \
	fi

.PHONY: image.build
image.build: image.verify $(addprefix image.build., $(addprefix $(PLATFORM)., $(IMAGES)))

.PHONY: image.build.multiarch
image.build.multiarch: image.verify $(foreach p,$(PLATFORMS),$(addprefix image.build., $(addprefix $(p)., $(IMAGES))))

.PHONY: image.build.%
image.build.%: go.bin.%
	$(eval IMAGE := $(COMMAND))
	$(eval IMAGE_PLAT := $(subst _,/,$(PLATFORM)))
	$(eval ARCH := $(word 2,$(subst _, ,$(PLATFORM))))

	@echo "===========> Building LOCAL docker image $(IMAGE) $(VERSION) for $(IMAGE_PLAT)"
	@mkdir -p $(TMP_DIR)/$(IMAGE)/$(PLATFORM)
	@cat $(ROOT_DIR)/docker/$(IMAGE)/Dockerfile\
		>$(TMP_DIR)/$(IMAGE)/Dockerfile
	@cp $(BIN_DIR)/$(PLATFORM)/$(IMAGE) $(TMP_DIR)/$(IMAGE)/$(PLATFORM)

	$(eval BUILD_SUFFIX := --load --pull -t $(REGISTRY_PREFIX)/$(IMAGE):$(VERSION) $(TMP_DIR)/$(IMAGE))
	$(eval BUILD_SUFFIX_ARM := --load --pull -t $(REGISTRY_PREFIX)/$(IMAGE).$(ARCH):$(VERSION) $(TMP_DIR)/$(IMAGE))
	@if [ "$(ARCH)" == "amd64" ]; then \
		echo "===========> Creating LOCAL docker image tag $(REGISTRY_PREFIX)/$(IMAGE):$(VERSION) for $(ARCH)"; \
		$(DOCKER) buildx build --platform $(IMAGE_PLAT) $(BUILD_SUFFIX); \
	else \
		echo "===========> Creating LOCAL docker image tag $(REGISTRY_PREFIX)/$(IMAGE).$(ARCH):$(VERSION) for $(ARCH)"; \
		$(DOCKER) buildx build --platform $(IMAGE_PLAT) $(BUILD_SUFFIX_ARM); \
	fi

.PHONY: image.push
image.push: image.verify $(addprefix image.push., $(addprefix $(PLATFORM)., $(IMAGES)))

.PHONY: image.push.multiarch
image.push.multiarch: image.verify $(addprefix image.push.multiarch., $(IMAGES))

# buildx will use the cache from image.build.% so no worries
.PHONY: image.push.%
image.push.%: image.build.%
	@echo "===========> Pushing image $(IMAGE) $(VERSION) for $(IMAGE_PLAT) to $(REGISTRY_PREFIX)"
	$(eval PUSH_SUFFIX := --push --pull -t $(REGISTRY_PREFIX)/$(IMAGE):$(VERSION) $(TMP_DIR)/$(IMAGE))
	$(DOCKER) buildx build --platform $(IMAGE_PLAT) $(PUSH_SUFFIX)

.PHONY: image.push.multiarch.%
image.push.multiarch.%: $(foreach p,$(PLATFORMS),$(addprefix image.build., $(addprefix $(p)., %)))
	@echo "===========> Pushing multi-arch image $(IMAGE) $(VERSION) to $(REGISTRY_PREFIX)"
	$(eval PUSH_SUFFIX := --push --pull -t $(REGISTRY_PREFIX)/$(IMAGE):$(VERSION) $(TMP_DIR)/$(IMAGE))
	$(DOCKER) buildx build --platform $(subst _,/,$(subst $(SPACE),$(COMMA),$(PLATFORMS))) $(PUSH_SUFFIX)
