default: test

include ../../../helpers/examples.mk

RELEASE := helm-logstash-default
TIMEOUT := 1200s

install:
	helm upgrade --wait --timeout=$(TIMEOUT) --install $(RELEASE) ../../

test: install goss

purge:
	helm del $(RELEASE)
