#!/bin/bash

SEALOSCMD="./sealos"
KUBETARBALL="/root/kube1.18.0.tar.gz"
KUBEVERSION="v1.18.0"
KUBOARDTAR="/root/kuboard.tar"
KUBOARDYAML="/root/kuboard.yaml"
MASTER="192.168.160.243"
NODE="192.168.160.244"
WORKDIR="/data"
CONFIG="/root/config"

checkValid (){
  if [ `echo $?` !=  0 ] ;then
    echo "exec cmd err $1"
    exit
  fi
}

## clean first ##
echo "$SEALOSCMD clean --all -f"
${SEALOSCMD} clean --all -f

echo "wait for everything ok"
sleep 10

## init cluster ##
echo "$SEALOSCMD  init --passwd centos --master $MASTER  --node $NODE --pkg-url  $KUBETARBALL --version $KUBEVERSION"
${SEALOSCMD}  init --passwd centos --master $MASTER  --node $NODE --pkg-url  $KUBETARBALL --version $KUBEVERSION
checkValid init

echo "wait for everything ok"
sleep 40

##
kubectl get node && kubectl get pod --all-namespaces && kubectl get cs
echo "wait for everything ok"
sleep 10

## install kuboard app -f by stdin ##
echo "cat $KUBOARDYAML | ${SEALOSCMD} install -f -  --pkg-url $KUBOARDTAR -w $WORKDIR"
cat $KUBOARDYAML | ${SEALOSCMD} install -f -  --pkg-url $KUBOARDTAR -w $WORKDIR
checkValid installAppByStdin
echo "wait for everything ok"
sleep 20

echo "${SEALOSCMD} delete --pkg-url $KUBOARDTAR -f  -w $WORKDIR"
${SEALOSCMD} delete --pkg-url $KUBOARDTAR -f  -w $WORKDIR
checkValid deleteAppForce

echo "wait for everything ok"
sleep 10

## install kuboard app -f by file  ##
echo "${SEALOSCMD} install -f $KUBOARDYAML --pkg-url $KUBOARDTAR -w $WORKDIR -c $CONFIG"
${SEALOSCMD} install -f $KUBOARDYAML --pkg-url $KUBOARDTAR -w $WORKDIR -c $CONFIG
checkValid installAppByStdin
echo "wait for everything ok"
sleep 20
echo "${SEALOSCMD} delete --pkg-url $KUBOARDTAR -f  -w $WORKDIR -c $CONFIG"
${SEALOSCMD} delete --pkg-url $KUBOARDTAR -f  -w $WORKDIR -c $CONFIG
checkValid deleteAppForce
