set -e
if [ -z "$VERSION" ]; then
    echo "VERSION is not set"
    exit 1
fi
cd .. && DOCKER_BUILDKIT=1 make image-build-providers/applaunchpad && cd -
sh package.sh
tar zcvf app${VERSION}-light.tar.gz dist/

# 如果没有 '--app-only' 参数，则生成app+demo
if [ "$1" != "-light" ]; then
    sh make_up.sh
    tar zcvf app${VERSION}.tar.gz dist/ docker-demo/
fi
