# LVScare

A lightweight LVS baby care, support health check, currently only HTTP prober supported， [sealos](https://github.com/labring/sealos) using lvscare for kubernetes masters HA.

## Feature

If real server is unavailable, lvscare firstly set weight of rs to 0(for TCP graceful termination), and remove it from backends during the next check, if real server return to available, add it back. This is useful for kubernetes master HA.

## Attention

1. running lvscare static pod in kubernetes with cilium CNI, cilium **MUST** configured with `prepend-iptables-chains: false`

## Quick Start

```bash
lvscare care --run-once --vs 10.103.97.12:6443 --rs 192.168.0.2:6443 --rs 192.168.0.3:6443 --rs 192.168.0.4:6443
```

> run once mode just simply setup rules and exit. and it WON'T perform health checks.

Then kubeadm join can use `10.103.97.12:6443` instead of real masters.

Run lvscare as a static pod on every kubernetes workers. **now control planes are also supported with `link` mode.**

```bash
lvscare care --vs 10.103.97.12:6443 --rs 192.168.0.2:6443 --rs 192.168.0.3:6443 --rs 192.168.0.4:6443 --interval 5 --mode link
```

- --mode defaults to `route`, from my test case seems `route` mode doesn't make sense..
- --interval every 5s check the real server port
- --health-path "/healthz" if returned status code is smaller than 400, then real server will be removed. this default behavior can be override by `--health-status` flag.

Check with `lvscare care --help` command for more options.

### Test

If the real server is listening on the same host, you **MUST** run with `link` mode.

start some echoserver as real servers

```bash
docker run -p 8081:80 --name echoserver1 -d cilium/echoserver
docker run -p 8082:80 --name echoserver2 -d cilium/echoserver
docker run -p 8083:80 --name echoserver3 -d cilium/echoserver
```

and run lvscare foreground

```bash
lvscare care --vs 169.254.0.1:80 --rs 127.0.0.1:8081 --rs 1.0.0.1:8082 --rs 127.0.0.1:8083 --logger DEBG --health-schem http --health-path / --mode link
```

`link` mode actually automatically setup rules below.

```bash
ip link add lvscare type dummy
ip addr add 169.254.0.1/32 dev lvscare

# enable conntrack for ipvs
echo 1 | tee /proc/sys/net/ipv4/vs/conntrack

iptables -t nat -N VIRTUAL-SERVICES
iptables -t nat -A PREROUTING -m comment --comment "virtual service portals" -j VIRTUAL-SERVICES

iptables -t nat -N VIRTUAL-MARK-MASQ
# create ipset
ipset create VIRTUAL-IP hash:ip,port -exist
iptables -t nat -A VIRTUAL-SERVICES -m comment --comment "virtual service ip + port for masquerade purpose" -m set --match-set VIRTUAL-IP dst,dst -j VIRTUAL-MARK-MASQ
# do mark
iptables -t nat -A VIRTUAL-MARK-MASQ -j MARK --set-xmark 0x2/0x2
# do snat at POSTROUTING
iptables -t nat -N VIRTUAL-POSTROUTING
iptables -t nat -A POSTROUTING -m comment --comment "virtual service postrouting rules" -j VIRTUAL-POSTROUTING
iptables -t nat -A VIRTUAL-POSTROUTING -m mark ! --mark 0x2/0x2 -j RETURN
iptables -t nat -A VIRTUAL-POSTROUTING -m comment --comment "virtual service traffic requiring SNAT" -m mark --mark 0x2 -j MASQUERADE

iptables -t nat -A OUTPUT -m comment --comment "virtual service portals" -j VIRTUAL-SERVICES
```

create another terminal, check ipvs rules:

```bash
[root@VM-16-107-centos ~]# sudo ipvsadm -Ln
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
  -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
TCP  169.254.0.1:80 rr
  -> 127.0.0.1:8080               Masq    1      0          2
  -> 127.0.0.1:8081               Masq    1      0          2
  -> 127.0.0.1:8082               Masq    1      0          2
```

As you can see, all the real server had been added. Now you can perform a HTTP request to `http://$vip:$port` with curl:

```bash
[root@VM-16-107-centos ~]# curl -s 169.254.0.1 | grep -i hostname
Hostname: 962ed9edb0b0
[root@VM-16-107-centos ~]# curl -s 169.254.0.1 | grep -i hostname
Hostname: 9d44216a7ee8
[root@VM-16-107-centos ~]# curl -s 169.254.0.1 | grep -i hostname
Hostname: a15e1c0d0f62
[root@VM-16-107-centos ~]# sudo ipvsadm -Ln
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
  -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
TCP  169.254.0.1:80 rr
  -> 127.0.0.1:8081               Masq    1      0          1
  -> 127.0.0.1:8082               Masq    1      0          1
  -> 127.0.0.1:8083               Masq    1      0          2
```

stop any of echoservers, and wait for 2 rounds(10s), then restart it

```bash
[root@VM-16-107-centos ~]# docker stop echoserver3
echoserver3
[root@VM-16-107-centos ~]# sudo ipvsadm -Ln
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
  -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
TCP  169.254.0.1:80 rr
  -> 127.0.0.1:8081               Masq    1      0          0
  -> 127.0.0.1:8082               Masq    1      0          0
  -> 127.0.0.1:8083               Masq    0      0          0
[root@VM-16-107-centos ~]# sudo ipvsadm -Ln
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
  -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
TCP  169.254.0.1:80 rr
  -> 127.0.0.1:8081               Masq    1      0          0
  -> 127.0.0.1:8082               Masq    1      0          0
[root@VM-16-107-centos ~]# docker start echoserver3
echoserver3
[root@VM-16-107-centos ~]# sudo ipvsadm -Ln
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
  -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
TCP  169.254.0.1:80 rr
  -> 127.0.0.1:8081               Masq    1      0          0
  -> 127.0.0.1:8082               Masq    1      0          0
  -> 127.0.0.1:8083               Masq    1      0          0
```

you can observe logs from lvscare

```log
2022-07-30T18:55:34 debug probe: Get "http://127.0.0.1:8083/": dial tcp 127.0.0.1:8083: connect: connection refused
2022-07-30T18:55:34 debug Trying to update wight to 0 for graceful termination
2022-07-30T18:55:39 debug probe: Get "http://127.0.0.1:8083/": dial tcp 127.0.0.1:8083: connect: connection refused
2022-07-30T18:55:39 debug Trying to delete real server
2022-07-30T18:55:44 debug probe: Get "http://127.0.0.1:8083/": dial tcp 127.0.0.1:8083: connect: connection refused
2022-07-30T18:55:49 debug Trying to add real server back
```

But the address is still accessible!

You can remove one or more, even destroy all of them and then check out IPVS rules.

### Cleanup

Append `-C` or `--clean` option with lvscare command ran before.

```bash
lvscare care --vs 169.254.0.1:80 --logger DEBG --mode link -C
```

Welcome to give it a shot, have fun with it.
