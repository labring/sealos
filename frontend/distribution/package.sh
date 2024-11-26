set -e
if [ -z "$VERSION" ]; then
    echo "VERSION is not set"
    exit 1
fi

pip3 install pyinstaller 
python3 -m pip install flask apscheduler PyYAML

pyinstaller --onefile app.py

cp install_templete.sh install.sh
cp launchpad.yaml originlaunchpad.yaml
sed -i "s/LAUNCHPAD_IMAGE/luanshaotong\/sealos-applaunchpad:${VERSION}/g" originlaunchpad.yaml
sed -i "s/LAUNCHPAD_TAG/${VERSION}/g" install.sh
cp install.sh origindeployapp.service originlaunchpad.yaml dist/
rm -f originlaunchpad.yaml install.sh
docker tag docker.io/library/sealos-applaunchpad:dev luanshaotong/sealos-applaunchpad:${VERSION}
docker save -o dist/launchpad.tar luanshaotong/sealos-applaunchpad:${VERSION}

