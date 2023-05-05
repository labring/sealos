#!/bin/bash

function read_env {
    while read line; do
        key=$(echo $line | cut -d'=' -f1)
        val=$(echo $line | cut -d'=' -f2)
        export $key=$val
    done < $1
}

read_env etc/sealos/cloud.env


