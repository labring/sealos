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

.PHONY: release.upx.%
release.upx.%: go.bin.%
	$(eval COMMAND := $(word 2,$(subst ., ,$*)))
	$(eval PLATFORM := $(word 1,$(subst ., ,$*)))
	@$(TOOLS_DIR)/upx $(BIN_DIR)/$(PLATFORM)/$(COMMAND)

.PHONY: release.upx
release.upx: tools.verify.upx $(addprefix release.upx., $(addprefix $(PLATFORM)., $(BINS)))

.PHONY: release.upx.multiarch
release.upx.multiarch: tools.verify.upx $(foreach p,$(PLATFORMS),$(addprefix release.upx., $(addprefix $(p)., $(BINS))))

PACKAGES ?= rpm deb

# Should only be used in actions
.PHONY: release.package.%
release.package.%: go.bin.%
	$(eval PACKAGE := $(word 2,$(subst ., ,$*)))
	$(eval PLATFORM := $(word 1,$(subst ., ,$*)))
	@$(TOOLS_DIR)/nfpm package -p $(PACKAGE) -f $(ROOT_DIR)/scripts/$(PLATFORM).yml -t $(BIN_DIR)/$(PLATFORM)

.PHONY: release.package
release.package: tools.verify.nfpm $(addprefix release.package., $(addprefix $(PLATFORM)., $(PACKAGES)))

.PHONY: release.package.multiarch
release.package.multiarch: tools.verify.nfpm $(foreach p,$(PLATFORMS),$(addprefix release.package., $(addprefix $(p)., $(BINS))))
