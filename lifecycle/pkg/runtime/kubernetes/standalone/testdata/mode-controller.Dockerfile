# Copyright 2026 sealos.
# SPDX-License-Identifier: Apache-2.0

FROM scratch
COPY standalone.test /fixture
ENV SEALOS_MODE_CONTROLLER_FIXTURE=1
ENTRYPOINT ["/fixture", "-test.run=^TestModeControllerFixture$", "-test.timeout=0", "--"]
