make build

IMG="xiaojie99999/metering:v0.1.8"
echo $IMG
docker build -t $IMG .
docker push $IMG

#rm -rf /Users/jie/Desktop/golang/sealos/controllers/metering/bin/kustomize
#make deploy -IMG=$IMG
