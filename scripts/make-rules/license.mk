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

TEMPLATE := $(ROOT_DIR)/scripts/template/LICENSE

.PHONY: license.verify
license.verify: tools.verify.addlicense
	@echo "===========> Verifying the boilerplate headers for all files"
	@$(TOOLS_DIR)/addlicense -check -ignore **/test/** -f $(TEMPLATE) $(CODE_DIRS)

.PHONY: license.add
license.add: tools.verify.addlicense
	@$(TOOLS_DIR)/addlicense -y $(shell date +"%Y") -c "sealos." -f $(TEMPLATE) $(CODE_DIRS)
