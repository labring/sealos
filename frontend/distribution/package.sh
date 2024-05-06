pip3 install pyinstaller flask

pyinstaller --onefile app.py

cp install.sh origindeployapp.service originlaunchpad.yaml dist/
docker tag docker.io/library/sealos-applaunchpad:dev luanshaotong/sealos-applaunchpad:v0.1
docker save -o dist/launchpad.tar luanshaotong/sealos-applaunchpad:v0.1

