#!/usr/bin/env sh
# requirement
# ~/.ssh must have id_rsa.pub,id_rsa

# Usage:
# - sh start_vm.sh
# - sh start_vm.sh  Name

#Docs url:https://www.sealos.io/blog/2022/10/22/vm-sealos-creat
NAME="sealos-test"
# if set first param in command line
if [ -n "$1" ]; then
    NAME="$1"
fi

# check if multipass is installed
if ! command -v multipass; then
    echo "multipass is not installed, please install it first"
    exit 1
fi


MASTER_NAME="$NAME""-master1"
NODE_NAME="$NAME""-node1"
# delete the vm if it already exists
if multipass list | grep -e "^$MASTER_NAME"; then
    echo "existing vm $MASTER_NAME"
#    echo "Deleting the existing vm $MASTER_NAME"
#    multipass delete -p "$MASTER_NAME"
fi

if multipass list | grep -e "^$NODE_NAME "; then
    echo "existing vm $NODE_NAME"
#    echo "Deleting the existing vm $NODE_NAME"
#    multipass delete -p "$NODE_NAME"
fi

echo "Creating VM..."
#multipass launch --name "$NAME" --cpus 2 --mem 4G --disk 100G --network br0-test
echo "\tmultipass launch --name $MASTER_NAME --cpus 2 --mem 4G --disk 100G --network br0-test"
multipass launch --name $MASTER_NAME --cpus 2 --mem 4G --disk 100G --network br0-test

echo "\tmultipass launch --name $NODE_NAME --cpus 2 --mem 4G --disk 100G --network br0-test"
multipass launch --name $NODE_NAME --cpus 2 --mem 4G --disk 100G --network br0-test

if [ $? -eq 0 ]; then
    echo "vm is created"
else
    echo "ERROR: failed to create vm, please retry"
    exit 1
fi

# shellcheck disable=SC2139
alias vm_root_exec="multipass exec $MASTER_NAME -- sudo -u root"
alias vm_node_exec="multipass exec $NODE_NAME -- sudo -u root"
echo "Installing sealos..."
set -x
vm_root_exec -s << EOF
echo "deb [trusted=yes] https://apt.fury.io/labring/ /" | tee /etc/apt/sources.list.d/labring.list
apt update
apt install sealos
EOF
set +x

set -x
vm_node_exec -s << EOF
echo "deb [trusted=yes] https://apt.fury.io/labring/ /" | tee /etc/apt/sources.list.d/labring.list
apt update
apt install sealos
EOF
set +x

set -x
cp -r ~/.ssh ~/vm_ssh

vm_root_exec rm -rf ~/.ssh
vm_root_exec mkdir ~/.ssh
multipass transfer ~/vm_ssh/id_rsa $MASTER_NAME:/home/ubuntu/
multipass transfer ~/vm_ssh/id_rsa.pub $MASTER_NAME:/home/ubuntu/
vm_root_exec cp -r /home/ubuntu/id_rsa ~/.ssh/id_rsa
vm_root_exec chmod 600 ~/.ssh/id_rsa
vm_root_exec cp -r /home/ubuntu/id_rsa.pub ~/.ssh/id_rsa.pub

vm_node_exec rm -rf ~/.ssh
vm_node_exec mkdir ~/.ssh
multipass transfer ~/vm_ssh/id_rsa.pub $NODE_NAME:/home/ubuntu
vm_node_exec cp -r /home/ubuntu/id_rsa.pub ~/.ssh/authorized_keys

rm -rf ~/vm_ssh

set +x

master_ip=$(multipass info "$MASTER_NAME" | grep IPv4: | awk '{print $2}')
node_ip=$(multipass info "$NODE_NAME" | grep IPv4: | awk '{print $2}')

echo master_ip: $master_ip
echo node_ip: $node_ip

echo "Installing k8s..."
set -x
vm_root_exec sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 --masters $master_ip --nodes $node_ip
#vm_root_exec kubectl taint node $NAME node-role.kubernetes.io/master-
#vm_root_exec kubectl taint node $NAME node-role.kubernetes.io/control-plane-
set +x
set +e

echo "k8s cluster is ready."


