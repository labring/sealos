### install  buildah

#### amd64

```shell
wget https://sealyun-home.oss-accelerate.aliyuncs.com/images/buildah.linux.amd64 --no-check-certificate -O buildah
chmod a+x buildah && mv buildah /usr/bin
```

#### arm64

```shell
wget https://sealyun-home.oss-accelerate.aliyuncs.com/images/buildah.linux.arm64 --no-check-certificate -O buildah
chmod a+x buildah && mv buildah /usr/bin
```

#### init buildah

```shell
mkdir -p /etc/containers
cat > /etc/containers/policy.json << EOF
{
    "default": [
	{
	    "type": "insecureAcceptAnything"
	}
    ],
    "transports":
	{
	    "docker-daemon":
		{
		    "": [{"type":"insecureAcceptAnything"}]
		}
	}
}
EOF

cat > /etc/containers/storage.conf << EOF
[storage]
# Default Storage Driver, Must be set for proper operation.
driver = "overlay"
# Temporary storage location
runroot = "/run/containers/storage"
# Primary Read/Write location of container storage
# When changing the graphroot location on an SELINUX system, you must
# ensure  the labeling matches the default locations labels with the
# following commands:
# semanage fcontext -a -e /var/lib/containers/storage /NEWSTORAGEPATH
# restorecon -R -v /NEWSTORAGEPATH
graphroot = "/var/lib/containers/storage"
EOF

```

###  install sealos

```shell
wget -c https://sealyun.oss-cn-beijing.aliyuncs.com/sealos-4.0/latest/sealos-amd64 -O sealos && \
chmod +x sealos && mv sealos /usr/bin 
```
