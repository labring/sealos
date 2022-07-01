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

.PHONY: gen.run
gen.run: gen.clean gen.deepcopy gen.docs

BOILERPLATE := $(ROOT_DIR)/scripts/template/boilerplate.go.txt
INPUT_DIR := $(ROOT_DIR)/pkg/types/v1beta1
INPUT_DIRS := $(ROOT_PACKAGE)/pkg/types/v1beta1

.PHONY: gen.deepcopy
gen.deepcopy: tools.verify.deepcopy-gen
	@echo "===========> Generating deepcopy go source files"
	@$(TOOLS_DIR)/deepcopy-gen --input-dirs="$(INPUT_DIRS)" \
	-O zz_generated.deepcopy \
	--go-header-file "$(BOILERPLATE)" \
	--output-base "${GOPATH}/src"

.PHONY: gen.docs
gen.docs: go.build
	@echo "===========> Generating docs"
	@$(BIN_DIR)/$(PLATFORM)/sealos docs

.PHONY: gen.clean
gen.clean:
	@find $(INPUT_DIR) -type f -name '*_generated.*.go' -delete
