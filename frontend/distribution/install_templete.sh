docker login -u admin -p passw0rd sealos.hub:5000
docker load -i launchpad.tar
docker tag luanshaotong/sealos-applaunchpad:LAUNCHPAD_TAG sealos.hub:5000/luanshaotong/sealos-applaunchpad:LAUNCHPAD_TAG
docker push sealos.hub:5000/luanshaotong/sealos-applaunchpad:LAUNCHPAD_TAG
docker load -i deployapp.tar
docker tag luanshaotong/deployapp:LAUNCHPAD_TAG sealos.hub:5000/luanshaotong/deployapp:LAUNCHPAD_TAG
docker push sealos.hub:5000/luanshaotong/deployapp:LAUNCHPAD_TAG

DOMAIN=`grep sealos.hub /etc/hosts | awk '{print $1}'`
cp originlaunchpad.yaml launchpad.yaml
sed -i "s/FLAG_SEALOS_DOMAIN/${DOMAIN}/g" launchpad.yaml
kubectl apply -f launchpad.yaml

dc=`which docker-compose`
if [ -z $dc ]; then
    cp docker-compose-bin /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

if [ -f /etc/systemd/system/deployapp.service ]; then
    systemctl stop deployapp
    systemctl disable deployapp
    rm -rf /etc/systemd/system/deployapp.service
fi

rm -rf /usr/bin/deployapp
cp -r deployapp /usr/bin/deployapp
cd /usr/bin/deployapp
docker-compose up -d

# cp origindeployapp.service deployapp.service
# sed -i "s/FLAG_SEALOS_DOMAIN/${DOMAIN}/g" deployapp.service
# if [ ! -f /etc/systemd/system/deployapp.service ]; then
#     cp app /usr/local/bin/
#     chmod +x /usr/local/bin/app
#     cp deployapp.service /etc/systemd/system/
#     systemctl enable deployapp
#     systemctl start deployapp
# else
#     systemctl stop deployapp
#     cp app /usr/local/bin/
#     chmod +x /usr/local/bin/app
#     cp deployapp.service /etc/systemd/system/
#     systemctl enable deployapp
#     systemctl start deployapp
# fi

echo "install success"