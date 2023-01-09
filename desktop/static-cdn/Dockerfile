FROM nginxinc/nginx-unprivileged:stable

WORKDIR /home
COPY static/ /home/static/
COPY deploy/default.conf /etc/nginx/conf.d/default.conf
