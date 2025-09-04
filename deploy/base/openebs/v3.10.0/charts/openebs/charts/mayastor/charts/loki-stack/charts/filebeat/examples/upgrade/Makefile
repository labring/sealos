default: test

include ../../../helpers/examples.mk

CHART := filebeat
RELEASE := helm-filebeat-upgrade
FROM := 7.9.0 # registry file version 1 not supported error with previous version

install:
	../../../helpers/upgrade.sh --chart $(CHART) --release $(RELEASE) --from $(FROM)
	kubectl rollout status daemonset $(RELEASE)-filebeat

test: install goss

purge:
	helm del $(RELEASE)
