FROM scratch
COPY standalone.test /fixture
ENV SEALOS_MODE_CONTROLLER_FIXTURE=1
ENTRYPOINT ["/fixture", "-test.run=^TestModeControllerFixture$", "-test.timeout=0", "--"]
