#!/bin/bash

kubectl delete clusterrolebinding license-frontend-role-binding --ignore-not-found
kubectl apply -f manifests