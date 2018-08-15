#!/bin/bash
if [ `ps -C haproxy --no-header |wc -l` -eq 0 ] ; then
    systemctl restart haproxy
    sleep 3
    if [ `ps -C haproxy --no-header |wc -l` -eq 0 ] ; then
        systemctl stop keepalived
    fi
fi
