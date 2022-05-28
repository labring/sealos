# Build the dashboard

```
cargo install trunk wasm-bindgen-cli
rustup target add wasm32-unknown-unknown
trunk serve
```

## init registry

```
docker run -p 5000:5000 -d --name registry registry:2.7.1
```

using nginx to proxy cors:

nginx.conf:

```
user  nginx;
worker_processes  1;

error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    keepalive_timeout  65;

    server {
        listen       8000;  #监听8000端口，可以改成其他端口
        server_name  localhost; # 当前服务的域名

        location / {
          if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET,POST,OPTIONS,PUT,DELETE' always;
            add_header 'Access-Control-Allow-Headers' '*' always;
            add_header 'Access-Control-Max-Age' 1728000 always;
            add_header 'Content-Length' 0;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            return 204;
          }

          if ($request_method ~* '(GET|POST|DELETE|PUT)') {
            add_header 'Access-Control-Allow-Origin' '*' always;
          }
          proxy_pass http://172.17.0.3:5000; # the registry IP or domain name
          proxy_http_version 1.1;
        }
    }

    #gzip  on;

    include /etc/nginx/conf.d/*.conf;
}
```

```
docker run -d --name registry-proxy -p 8001:8000 \
  -v /Users/fanghaitao/nginx/nginx.conf:/etc/nginx/nginx.conf nginx:1.19.0
```

Then you can test the registry api:

```
curl http://localhost:8001/v2/_catalog
{"repositories":["centos","golang"]}
```