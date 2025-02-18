# 如果本机的ssh公钥不在本机的authorized_keys中，则加进去
pubkey=`cat ~/.ssh/id_rsa.pub`
if [ -z "`cat ~/.ssh/authorized_keys | grep "$pubkey"`" ]; then
    echo $pubkey >> ~/.ssh/authorized_keys
fi

docker run -e CLUSTER_DOMAIN=192.168.0.134 -e SAVE_PATH=/root/.mxapps \
    -v `pwd`:/root/app/ \
    -v /usr/bin/docker:/usr/bin/docker \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v /usr/bin/kubectl:/usr/bin/kubectl \
    -v /etc/kubernetes/admin.conf:/etc/kubernetes/admin.conf \
    -v /etc/hosts:/etc/hosts \
    -v /root/.ssh:/root/.ssh \
    -v /root/.mxapps:/root/.mxapps \
    --rm -it -p 5002:5002 luanshaotong/deployapp:dev bash
