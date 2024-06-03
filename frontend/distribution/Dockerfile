# 选择基础镜像
FROM openjdk:23-jdk-bullseye

# 拷贝依赖、配置文件
COPY ./config.json /opt

# 运行依赖配置脚本
RUN chmod +x /opt/config.json

# 设置工作目录
WORKDIR /root

# 拷贝应用程序
COPY arthas /root/.arthas

# 启动命令
ENTRYPOINT ["sh","-c","java -jar /root/.arthas/lib/3.7.2/arthas/arthas-tunnel-server-3.7.2-fatjar.jar & sleep 10 && java -jar /root/.arthas/lib/3.7.2/arthas/arthas-boot.jar --select /root/.arthas/lib/3.7.2/arthas/arthas-tunnel-server-3.7.2-fatjar.jar --target-ip 0.0.0.0 --password passw0rd"]
