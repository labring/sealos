#!/bin/bash
kbcli addon enable apecloud-mysql
kbcli addon enable redis
kbcli addon enable postgresql
kbcli addon enable mongodb
kbcli addon enable csi-s3
kbcli addon enable kafka
kbcli addon enable snapshot-controller --tolerations '[{"effect":"NoSchedule","key":"kb-controller","operator":"Equal","value":"true"}]'
kbcli addon enable migration --tolerations '[{"effect":"NoSchedule","key":"kb-controller","operator":"Equal","value":"true"}]'
