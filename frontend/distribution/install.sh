sealos login -u admin -p passw0rd sealos.hub:5000
sealos load -i launchpad.tar
sealos tag luanshaotong/sealos-applaunchpad:v0.1 sealos.hub:5000/luanshaotong/sealos-applaunchpad:v0.1
sealos push sealos.hub:5000/luanshaotong/sealos-applaunchpad:v0.1
DOMAIN=`kubectl get ingress sealos-desktop -n sealos -o jsonpath='{.spec.rules[*].host}'`
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