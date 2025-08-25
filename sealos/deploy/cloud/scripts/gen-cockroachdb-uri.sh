#!/bin/bash
namespace="sealos"
user="sealos"
svc="sealos-cockroachdb-public"
password=$(tr -cd 'a-z0-9' </dev/urandom | head -c64 )

kubectl exec -q -n sealos sealos-cockroachdb-0 -- cockroach sql --certs-dir=/cockroach/cockroach-certs -e "CREATE USER IF NOT EXISTS $user WITH PASSWORD '$password'; GRANT admin TO $user; CREATE DATABASE IF NOT EXISTS local; CREATE DATABASE IF NOT EXISTS global;" >> /dev/null

cockroachdb_uri="postgresql://$user:$password@$svc.$namespace.svc.cluster.local:26257"
echo "$cockroachdb_uri"