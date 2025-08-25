#!/usr/bin/env bash
set -e

MINIO_CONFIG_ENV=$(kubectl -n objectstorage-system get secret object-storage-env-configuration -o jsonpath="{.data.config\.env}" | base64 --decode)
MINIO_ROOT_USER=$(echo "$MINIO_CONFIG_ENV" | tr ' ' '\n' | grep '^MINIO_ROOT_USER=' | cut -d '=' -f 2); MINIO_ROOT_USER=${MINIO_ROOT_USER//\"}
MINIO_ROOT_PASSWORD=$(echo "$MINIO_CONFIG_ENV" | tr ' ' '\n' | grep '^MINIO_ROOT_PASSWORD=' | cut -d '=' -f 2); MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD//\"}

SYMMETRIC_KEY=$MINIO_ROOT_PASSWORD; HEADER='{"alg":"HS256","typ":"JWT"}'; PAYLOAD='{"exp":4833872336,"iss":"prometheus","sub":"'"$MINIO_ROOT_USER"'"}'

BASE64_HEADER=$(echo -n "$HEADER" | base64 | tr -d '\n=' | tr '/+' '_-'); BASE64_PAYLOAD=$(echo -n "$PAYLOAD" | base64 | tr -d '\n=' | tr '/+' '_-')

BASE64_SIGNATURE=$(echo -n "$BASE64_HEADER.$BASE64_PAYLOAD" | openssl dgst -binary -sha256 -hmac "$SYMMETRIC_KEY" | base64 | tr -d '\n=' | tr '/+' '_-')

TOKEN="$BASE64_HEADER.$BASE64_PAYLOAD.$BASE64_SIGNATURE"

BASE64_TOKEN=$(echo -n "$TOKEN" | base64 -w 0)

sed -i 's/{BASE64_TOKEN}/'${BASE64_TOKEN}'/g' manifests/deploy.yaml

kubectl apply -f manifests/deploy.yaml