FROM centos:7.4.1708
RUN yum install -y ansible && yum install -y openssh && yum install -y openssh-clients
COPY . /etc/ansible/
