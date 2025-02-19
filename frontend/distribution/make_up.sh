set -e
if [ ! -d "docker-demo" ]; then
    mkdir docker-demo
fi
cp docker-demo-template/* docker-demo
cd docker-demo
if [ ! -d "arthas" ]; then
    curl -k --user test01:qwer@123 -o arthas.tar https://ofc0.lafyun.com:18033/arthas.tar
    tar -xvf arthas.tar
    rm arthas.tar
fi
docker pull openjdk:23-jdk-bullseye
docker save -o openjdk23.tar openjdk:23-jdk-bullseye
docker pull nginx
docker save -o nginx.tar nginx

cd ..
