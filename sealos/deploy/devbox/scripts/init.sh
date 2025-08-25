#!/bin/bash

set -e

sealos run tars/devbox-controller.tar -e cloudDomain=${cloudDomain} -e cloudPort=${cloudPort} -e registryAddr=${registryAddr} -e registryUser=${registryUser} -e registryPassword=${registryPassword}
sealos run tars/devbox-frontend.tar -e cloudDomain=${cloudDomain} -e cloudPort=${cloudPort}
