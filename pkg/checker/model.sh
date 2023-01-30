#!/usr/bin/env bash

BASE=$(pwd)

common_log() {
	echo $(date +"[%Y%m%d %H:%M:%S]: ") $1 >&2
}

arch_env() {
    ARCH=$(uname -m)
    case $ARCH in
        armv5*) ARCH="armv5" ;;
        armv6*) ARCH="armv6" ;;
        armv7*) ARCH="armv7" ;;
        aarch64) ARCH="arm64" ;;
        x86) ARCH="386" ;;
        x86_64) ARCH="amd64" ;;
        i686) ARCH="386" ;;
        i386) ARCH="386" ;;
    esac
}

os_env() {
    ubu=$(cat /etc/issue | grep -i "ubuntu" | wc -l)
    debian=$(cat /etc/issue | grep -i "debian" | wc -l)
    cet=$(cat /etc/centos-release | grep "CentOS" | wc -l)
    redhat=$(cat /etc/redhat-release | grep "Red Hat" | wc -l)
    alios=$(cat /etc/redhat-release | grep "Alibaba" | wc -l)
    if [ "$ubu" == "1" ];then
        export OS="Ubuntu"
    elif [ "$cet" == "1" ];then
        export OS="CentOS"
    elif [ "$redhat" == "1" ];then
        export OS="RedHat"
    elif [ "$debian" == "1" ];then
        export OS="Debian"
    elif [ "$alios" == "1" ];then
        export OS="AliOS"
    else
       echo "unkown os...   exit"
       exit 1
    fi

    case "$OS" in
        CentOS)
            OSVersion="$(cat /etc/centos-release |awk '{print $4}')"
            ;;
        *)
            echo -e "Not support get OS version of ${OS}"
    esac
}

kube::nvidia::setup_lspci(){
    which lspci > /dev/null 2>&1
    i=$?
    if [ $i -ne 0 ]; then
        if [ "$1" == "CentOS" ] || [ "$OS" == "AliOS" ] || [ "$1" == "RedHat" ]; then
            yum install -y pciutils
        else
            apt install -y pciutils
        fi
    fi
}

kube::nvidia::detect_gpu(){
    set +e
    kube::nvidia::setup_lspci $OS
    lspci | grep -i nvidia > /dev/null 2>&1
    i=$?
    if [ $i -eq 0 ]; then
        export GPU_FOUNDED=true
    else
        export GPU_FOUNDED=false
    fi
    set -e
}

detect_timesync(){
    ntpd_status=`systemctl is-active ntpd`
    chronyd_status=`systemctl is-active chronyd`
}

#system info
system_info() {
    #kube::nvidia::detect_gpu 2>/dev/null

    os_env 2>/dev/null

    arch_env 2>/dev/null

    detect_timesync 2>/dev/null

    SPLITER="##SPLITER##"
    BLKS=""
    IFS='
'
    for blk in `lsblk -P -b --output=NAME,PKNAME,MOUNTPOINT,FSTYPE,SIZE,TYPE`;do
        BLKS=${BLKS}${SPLITER}${blk}
    done
    BLKS=`echo -n ${BLKS:11} | base64 | tr -d '\n'`

    IFACES=""
    for iface_line in $(ip -o -4 addr list);do
        iface_name=$(echo ${iface_line} | awk '{print $2}')
        addr=$(echo ${iface_line} | awk '{print $4}' | cut -d/ -f1)
        mac=$(ip link show dev $iface_name |awk '/link/{print $2}')
        iface="NAME=\"$iface_name\" IP=\"$addr\" MAC=\"$mac\""
        IFACES=${IFACES}${SPLITER}${iface}
    done
    IFACES=`echo -n ${IFACES:11} | base64 | tr -d '\n'`

#    "system_uuid": "$(dmidecode -s system-uuid | grep -v "^#")",
#    "processor_id": "$(dmidecode -t processor | grep ID | head -1 | sed 's/ID://g' | sed -e 's/^[ ,\t]*//g' | sed -e 's/[ ]*$//g')",
#    "baseboard_number": "$(dmidecode -s baseboard-serial-number | grep -v "^#")",

    echo -n "##INSTANCE_INFO_BEGIN##"
    cat - << EOF
{
    "instanceInfo": {
        "cpu": $(grep -c ^processor /proc/cpuinfo),
        "memory": $(cat /proc/meminfo | grep MemTotal | awk -F ' ' '{print $2}'),
        "os": "${OS}",
        "osVersion": "${OSVersion}",
        "arch": "${ARCH}",
        "kernel": "$(uname -r)",
        "hostName": "${HOSTNAME}"
    },
    "timeSyncStatus": {
        "ntpd": "${ntpd_status}",
        "chronyd": "${chronyd_status}"
    },
    "networkDevicesStr": "${IFACES}",
    "blockDevicesStr": "${BLKS}"
}
EOF
    echo -n "##INSTANCE_INFO_END##"
}

system_info
