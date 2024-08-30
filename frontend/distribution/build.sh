if [ -z "$VERSION" ]; then
    echo "VERSION is not set"
    exit 1
fi

cd .. && make image-build-providers/applaunchpad && cd -
sh make_up.sh
sh package.sh
tar zcvf app${VERSION}.tar.gz dist/ docker-demo/