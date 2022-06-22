#!/bin/bash
# Copyright © 2022 sealos.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


#1、将IP写在一个文件里，比如文件名为hosts_file，一行一个IP地址。
#2、修改ssh-mutual-trust.sh里面的用户名及密码，默认为root用户及密码123。
#3、./ssh-mutual-trust.sh hosts_file
#
#或者用户密码写在命令行：
#./ssh-mutual-trust.sh hosts_file root Abc123
#
#执行脚本的机器要安装 expect 软件包

# check args count
if test $# -lt 1; then
  echo -e "\nUsage: $0 < hosts file list > < username > < password >\n"
  exit 1
fi

#hosts_file=${@:1:$#-2}
#username=${@:$#-1:1}
#password=${!#}

hosts_file=$1
username=$2
password=$3

if test X$2 == X""; then
  username=root
  password=123
fi

if test X$3 == X""; then
  password=123
fi

# check sshkey file 
sshkey_file=~/.ssh/id_rsa.pub
if ! test -e $sshkey_file; then
  expect -c "
  spawn ssh-keygen -t rsa
  expect \"Enter*\" { send \"\n\"; exp_continue; }
  "
fi

# get hosts list
hosts=$(cat ${hosts_file} | grep -Ev '^#|^$' | awk -F"[ ]+" '{gsub(/^\s+|\s+$/, ""); print $1}')
echo "======================================================================="
echo "hosts: "
echo "$hosts"
echo "======================================================================="

ssh_key_copy()
{
  # delete history
  sed "/$1/d" -i ~/.ssh/known_hosts

  # start copy 
  expect -c "
  set timeout 100
  spawn ssh-copy-id $username@$1
  expect {
  \"yes/no\"   { send \"yes\n\"; exp_continue; }
  \"*assword\" { send \"$password\n\"; }
  \"already exist on the remote system\" { exit 1; }
  }
  expect eof
  "
}

# auto sshkey pair
for host in $hosts; do
  echo "======================================================================="

  # check network
  ping -i 0.2 -c 3 -W 1 $host >& /dev/null
  if test $? -ne 0; then
    echo "[ERROR]: Can't connect $host"
    exit 1
  fi

  cat /etc/hosts | grep -v '^#' | grep $host >& /dev/null
  if test $? -eq 0; then
    hostaddr=$(cat /etc/hosts | grep -v '^#' | grep $host | awk '{print $1}')
    hostname=$(cat /etc/hosts | grep -v '^#' | grep $host | awk '{print $2}')
    ssh_key_copy $hostaddr
    ssh_key_copy $hostname
  else
    ssh_key_copy $host
  fi

  echo ""
done

