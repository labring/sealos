# Copyright © 2026 sealos.
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

FROM scratch
COPY standalone.test /fixture
ENV SEALOS_MODE_CONTROLLER_FIXTURE=1
# The generated static Pod supplies root and NET_ADMIN for the route ownership fixture.
# nosemgrep: dockerfile.security.missing-user-entrypoint.missing-user-entrypoint
ENTRYPOINT ["/fixture", "-test.run=^TestModeControllerFixture$", "-test.timeout=0", "--"]
