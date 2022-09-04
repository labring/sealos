#! /bin/bash
role=$1
password=$2
image=$3
imageArray=(${image//,/ })
images=""
for var in ${imageArray[@]}
do
         images=${images}${var}" "
done

sudo echo -e ${password}"\n"${password} | sudo passwd root
sudo hostnamectl set-hostname ${role}
sudo sed -i '63c PasswordAuthentication yes' /etc/ssh/sshd_config
sudo /sbin/service sshd restart
sudo wget -c https://github.com/labring/sealos/releases/download/v4.1.3/sealos_4.1.3_linux_amd64.tar.gz && sudo tar zxvf sealos_4.1.3_linux_amd64.tar.gz sealos && sudo rm -rf sealos_4.1.3_linux_amd64.tar.gz && sudo chmod +x sealos && sudo mv sealos /usr/bin
sudo sealos run ${images} --single