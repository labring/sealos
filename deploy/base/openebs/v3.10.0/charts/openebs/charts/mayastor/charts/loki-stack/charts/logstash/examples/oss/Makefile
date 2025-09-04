default: test

include ../../../helpers/examples.mk

RELEASE := helm-logstash-oss
TIMEOUT := 1200s

install:
	helm upgrade --wait --timeout=$(TIMEOUT) --install --values values.yaml $(RELEASE) ../../

test: install goss

purge:
	helm del $(RELEASE)
