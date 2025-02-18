set -e
if [ -z "$VERSION" ]; then
    echo "VERSION is not set"
    exit 1
fi

# pip3 install pyinstaller 
# python3 -m pip install flask apscheduler PyYAML

# pyinstaller --onefile app.py

mkdir -p dist/deployapp/

cp install_templete.sh install.sh
cp launchpad.yaml originlaunchpad.yaml
cp docker-compose-template.yml docker-compose.yml
sed -i "s/LAUNCHPAD_IMAGE/luanshaotong\/sealos-applaunchpad:${VERSION}/g" originlaunchpad.yaml
sed -i "s/LAUNCHPAD_TAG/${VERSION}/g" install.sh
sed -i "s/LAUNCHPAD_TAG/${VERSION}/g" docker-compose.yml

if [ ! -f docker-compose-bin ]; then
    if [ arch == "aarch64" ]; then
        wget "https://github.com/docker/buildx/releases/download/v0.20.1/buildx-v0.20.1.linux-arm64" -O docker-compose-bin
    else
        wget "https://github.com/docker/buildx/releases/download/v0.20.1/buildx-v0.20.1.linux-amd64" -O docker-compose-bin
    fi
    chmod +x docker-compose-bin
fi

cp install.sh originlaunchpad.yaml docker-compose-bin dist/
cp app.py node.py docker-compose.yml dist/deployapp/
rm -f originlaunchpad.yaml install.sh docker-compose.yml
docker tag docker.io/library/sealos-applaunchpad:dev luanshaotong/sealos-applaunchpad:${VERSION}
docker save -o dist/launchpad.tar luanshaotong/sealos-applaunchpad:${VERSION}

docker build . -t luanshaotong/deployapp:${VERSION}
docker save -o dist/deployapp.tar luanshaotong/deployapp:${VERSION}