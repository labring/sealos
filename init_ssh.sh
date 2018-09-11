#!/bin/bash
mkdir -p  /root/.ssh
if [ ! -f "/root/.ssh/id_rsa.pub" ];then
ssh-keygen -t rsa -C "" -f /root/.ssh/id_rsa  -P '' >> /dev/null
fi
echo "#################################################"
echo "###Generator ssh command:(Please input all hosts)"
echo "echo \"$(cat /root/.ssh/id_rsa.pub)\" > /root/.ssh/authorized_keys "