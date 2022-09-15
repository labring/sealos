#! /bin/bash
role=$1
password=$2
ipmasters=$3
ipnodes=$4
sudo echo -e ${password}"\n"${password} | sudo passwd root
sudo hostnamectl set-hostname ${role}
sudo sed -i '63c PasswordAuthentication yes' /etc/ssh/sshd_config
sudo sed -i 's/# StrictHostKeyChecking ask/StrictHostKeyChecking no/' /etc/ssh/ssh_config
sudo systemctl restart sshd
sudo wget -c https://github.com/labring/sealos/releases/download/v4.1.3/sealos_4.1.3_linux_amd64.tar.gz && sudo tar zxvf sealos_4.1.3_linux_amd64.tar.gz sealos && sudo rm -rf sealos_4.1.3_linux_amd64.tar.gz && sudo chmod +x sealos && sudo mv sealos /usr/bin
sudo sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters ${ipmasters} --nodes ${ipnodes} --passwd ${password}
#sudo sealos gen labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters ${ipmasters} --nodes ${ipnodes} --passwd ${password} > Clusterfile
#sudo sealos apply -f Clusterfile