#!/bin/bash
source common.sh
ver_ge() {
  # usage: ver_ge "4.19.57" "4.18"
  awk -v a="$1" -v b="$2" 'BEGIN{
    split(a,A,"[.-]"); split(b,B,"[.-]");
    for(i=1;i<=3;i++){ if(A[i]=="") A[i]=0; if(B[i]=="") B[i]=0 }
    for(i=1;i<=3;i++){ if(A[i]>B[i]){print 0; exit} else if(A[i]<B[i]){print 1; exit} }
    print 0
  }'
}
kernel_full="$(uname -r)"             # e.g. 5.14.0-503.14.1.el9_4.x86_64 / 4.18.0-372.32.1.el8_6.x86_64
kernel_ver="${kernel_full%%-*}"       # only version：5.14.0 / 4.18.0

os_id=""; os_ver="";
if [ -r /etc/os-release ]; then
  . /etc/os-release
  os_id="${ID:-}"; os_ver="${VERSION_ID:-}"       # e.g. 8.6 / 9.4 / 20.03
fi

is_rhel_like=false
case "$os_id" in
  rhel|rocky|almalinux|centos|ol) is_rhel_like=true ;;
esac

is_euler_like=false
case "$os_id" in
  euleros|EulerOS|openEuler) is_euler_like=true ;;
esac

ok=false

# Condition 1: General kernel line
if ver_ge "$kernel_ver" "5.10"; then
  ok=true

# Condition 2: RHEL-like and kernel >= 4.18
elif $is_rhel_like && ver_ge "$kernel_ver" "4.18"; then
  ok=true

# Condition 3 (optional): EulerOS/openEuler and kernel >= 4.18
elif $is_euler_like && ver_ge "$kernel_ver" "4.18"; then
  ok=true
fi

if [ "$ok" != true ]; then
  error "Linux kernel must be >= 5.10 OR vendor-backed equivalent (e.g., RHEL >= 8.6 with 4.18+, EulerOS/openEuler >= 20.03 with 4.18+). Current: $kernel_full (OS: ${ID:-unknown} ${VERSION_ID:-unknown})"
fi

logger "Kernel check passed: $kernel_full (OS: ${ID:-unknown} ${VERSION_ID:-unknown})"