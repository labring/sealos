# get sealos config
function get_sealos_config {
  # get cloudDomain from sealos-config configmap
  cloudDomain=$(kubectl get configmap sealos-config -o jsonpath='{.data.cloudDomain}')
  cloudPort=$(kubectl get configmap sealos-config -o jsonpath='{.data.cloudPort}')
  certSecretName=$(kubectl get configmap sealos-config -o jsonpath='{.data.certSecretName}')
  regionUID=$(kubectl get configmap sealos-config -o jsonpath='{.data.regionUID}')
  databaseMongodbURI=$(kubectl get configmap sealos-config -o jsonpath='{.data.databaseMongodbURI}')
  databaseGlobalCockroachdbURI=$(kubectl get configmap sealos-config -o jsonpath='{.data.databaseGlobalCockroachdbURI}')
  databaseRegionalCockroachdbURI=$(kubectl get configmap sealos-config -o jsonpath='{.data.databaseRegionalCockroachdbURI}')
  passwordEnabled=$(kubectl get configmap sealos-config -o jsonpath='{.data.passwordEnabled}')
  passwordSalt=$(kubectl get configmap sealos-config -o jsonpath='{.data.passwordSalt}')
  jwtInternal=$(kubectl get configmap sealos-config -o jsonpath='{.data.jwtInternal}')
  jwtGlobal=$(kubectl get configmap sealos-config -o jsonpath='{.data.jwtGlobal}')
  jwtRegional=$(kubectl get configmap sealos-config -o jsonpath='{.data.jwtRegional}')
}

function install_admin {
  # get sealos config
  get_sealos_config

  # install admin
  echo "run sealos admin frontend"
  sealos run tars/frontend-admin.tar \
  --env cloudDomain=$cloudDomain \
  --env cloudPort=$cloudPort \
  --env certSecretName=$certSecretName \
  --env regionUid=$regionUID \
  --env databaseMongodbURI="${databaseMongodbURI}/sealos-auth?authSource=admin" \
  --env databaseGlobalCockroachdbURI=$databaseGlobalCockroachdbURI \
  --env databaseRegionalCockroachdbURI=$databaseRegionalCockroachdbURI \
  --env jwtInternal=$jwtInternal \
  --env jwtGlobal=$jwtGlobal
}
