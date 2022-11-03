# usage./clearMetering.sh namespaceName
NSNAME="test1"
# if set first param in command line
if [ -n "$1" ]; then
    NSNAME="$1"
fi

SYSTEMNAME="metering-system"

set -x
kubectl delete -f testNS.yaml
kubectl delete -f metering_v1_podresourceprice.yaml
kubectl delete ExtensionResourcesPrice sealos-pod-controller-config -n metering-system
kubectl delete namespace $NSNAME
kubectl delete metering "metering-"$NSNAME -n $SYSTEMNAME
kubectl delete meteringQuota "metering-quota-"$NSNAME -n $NSNAME
kubectl delete meteringQuota "metering-quota-"$NSNAME -n $SYSTEMNAME

set +x