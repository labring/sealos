#!/bin/bash
mkdir -p  /root/.ssh
if [ ! -f "/root/.ssh/id_rsa.pub" ];then
ssh-keygen -t rsa -C "" -f /root/.ssh/id_rsa  -P '' >> /dev/null
fi
echo "#################################################"
echo "###Generator ssh command:(Please input all hosts)"
echo "echo \"$(cat /root/.ssh/id_rsa.pub)\" > /root/.ssh/authorized_keys "



# mkdir -p /root/.ssh
# if [ ! -f "/root/.ssh/id_rsa" ];then
# ssh-keygen -t rsa -C ""  -f /root/.ssh/id_rsa -P ""   > /dev/null
# fi
# read -t 30 -p "Please input ansible hosts:" ansible_host
# ansible_host_ping=`ping $ansible_host -c 1 -w 30 | grep packets | awk -F ',' '{print $2}' | awk '{print $1}'`
# #echo $ansible_host_ping
# if [ "$ansible_host_ping" -eq 1 ];then
# ssh-copy-id -i /root/.ssh/id_rsa.pub  root@$ansible_host
# else 
# echo "Input host is not running ?"
# fi
