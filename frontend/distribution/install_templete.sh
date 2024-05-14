sealos login -u admin -p passw0rd sealos.hub:5000
sealos load -i launchpad.tar
sealos tag luanshaotong/sealos-applaunchpad:LAUNCHPAD_TAG sealos.hub:5000/luanshaotong/sealos-applaunchpad:LAUNCHPAD_TAG
sealos push sealos.hub:5000/luanshaotong/sealos-applaunchpad:LAUNCHPAD_TAG
DOMAIN=`grep sealos.hub /etc/hosts | awk '{print $1}'`
cp originlaunchpad.yaml launchpad.yaml
sed -i "s/FLAG_SEALOS_DOMAIN/${DOMAIN}/g" launchpad.yaml
kubectl apply -f launchpad.yaml

cp origindeployapp.service deployapp.service
sed -i "s/FLAG_SEALOS_DOMAIN/${DOMAIN}/g" deployapp.service
if [ ! -f /etc/systemd/system/deployapp.service ]; then
    cp app /usr/local/bin/
    chmod +x /usr/local/bin/app
    cp deployapp.service /etc/systemd/system/
    systemctl enable deployapp
    systemctl start deployapp
else
    systemctl stop deployapp
    cp app /usr/local/bin/
    chmod +x /usr/local/bin/app
    cp deployapp.service /etc/systemd/system/
    systemctl enable deployapp
    systemctl start deployapp
fi

echo "install success"