### Building local image

```
mkdir -p /var/tmp/go/src/github.com/cesanta
cd /var/tmp/go/src/github.com/cesanta
git clone https://github.com/cesanta/docker_auth.git
cd docker_auth/auth_server
make docker-build
```
