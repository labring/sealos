#!/bin/bash
namespace="sealos"
secret_name="sealos-mongodb-conn-credential"

secret_data=$(kubectl get secret -n $namespace $secret_name -o go-template='{{range $k,$v := .data}}{{printf "%s: " $k}}{{if not $v}}{{$v}}{{else}}{{$v | base64decode}}{{end}}{{"\n"}}{{end}}')

endpoint=$(echo "$secret_data" | awk -F': ' '/endpoint/ {print $2}')
headlessEndpoint=$(echo "$secret_data" | awk -F': ' '/headlessEndpoint/ {print $2}')
headlessHost=$(echo "$secret_data" | awk -F': ' '/headlessHost/ {print $2}')
headlessPort=$(echo "$secret_data" | awk -F': ' '/headlessPort/ {print $2}')
host=$(echo "$secret_data" | awk -F': ' '/host/ {print $2}')
password=$(echo "$secret_data" | awk -F': ' '/password/ {print $2}')
port=$(echo "$secret_data" | awk -F': ' '/port/ {print $2}')
username=$(echo "$secret_data" | awk -F': ' '/username/ {print $2}')

mongodb_uri="mongodb://$username:$password@$host.sealos.svc:$port"

echo "$mongodb_uri"