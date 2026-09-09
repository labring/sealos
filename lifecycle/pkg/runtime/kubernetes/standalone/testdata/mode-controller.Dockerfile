# Copyright 2026 sealos.
# SPDX-License-Identifier: Apache-2.0

FROM scratch
COPY standalone.test /fixture
ENV SEALOS_MODE_CONTROLLER_FIXTURE=1
# The generated static Pod supplies root and NET_ADMIN for the route ownership fixture.
# nosemgrep: dockerfile.security.missing-user-entrypoint.missing-user-entrypoint
ENTRYPOINT ["/fixture", "-test.run=^TestModeControllerFixture$", "-test.timeout=0", "--"]
