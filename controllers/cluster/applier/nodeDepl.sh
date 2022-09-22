#! /bin/bash
role=$1
password=$2
sudo echo -e ${password}"\n"${password} | sudo passwd root
sudo hostnamectl set-hostname ${role}
sudo sed -i '63c PasswordAuthentication yes' /etc/ssh/sshd_config
sudo /sbin/service sshd restart