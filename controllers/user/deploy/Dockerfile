FROM scratch

USER 65532:65532
##
ENV WechatPrivateKey           = ""
ENV	MchID                      = ""
ENV	MchCertificateSerialNumber = ""
ENV	MchAPIv3Key                = ""
ENV	AppID                      = ""
COPY manifests ./manifests/user-controller
COPY registry ./registry
CMD ["kubectl apply -f manifests/user-controller/rbac.yaml","cd manifests/user-controller/config/manager && kustomize build -e SERVICE_NAME=webhook-service -e SERVICE_NAMESPACE=system | kubectl apply -f -"]
