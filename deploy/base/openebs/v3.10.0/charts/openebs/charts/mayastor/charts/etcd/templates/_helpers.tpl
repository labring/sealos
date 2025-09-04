{{/* vim: set filetype=mustache: */}}

{{/*
Return the proper etcd image name
*/}}
{{- define "etcd.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.image "global" .Values.global) }}
{{- end -}}

{{/*
Return the proper image name (for the init container volume-permissions image)
*/}}
{{- define "etcd.volumePermissions.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.volumePermissions.image "global" .Values.global) }}
{{- end -}}

{{/*
Return the proper Docker Image Registry Secret Names
*/}}
{{- define "etcd.imagePullSecrets" -}}
{{ include "common.images.pullSecrets" (dict "images" (list .Values.image .Values.volumePermissions.image) "global" .Values.global) }}
{{- end -}}

{{/*
Return the proper etcd peer protocol
*/}}
{{- define "etcd.peerProtocol" -}}
{{- if .Values.auth.peer.secureTransport -}}
{{- print "https" -}}
{{- else -}}
{{- print "http" -}}
{{- end -}}
{{- end -}}

{{/*
Return the proper etcd client protocol
*/}}
{{- define "etcd.clientProtocol" -}}
{{- if .Values.auth.client.secureTransport -}}
{{- print "https" -}}
{{- else -}}
{{- print "http" -}}
{{- end -}}
{{- end -}}

{{/*
Return the proper etcdctl authentication options
*/}}
{{- define "etcd.authOptions" -}}
{{- $rbacOption := "--user root:$ROOT_PASSWORD" -}}
{{- $certsOption := " --cert $ETCD_CERT_FILE --key $ETCD_KEY_FILE" -}}
{{- $autoCertsOption := " --cert /bitnami/etcd/data/fixtures/client/cert.pem --key /bitnami/etcd/data/fixtures/client/key.pem" -}}
{{- $caOption := " --cacert $ETCD_TRUSTED_CA_FILE" -}}
{{- if or .Values.auth.rbac.create .Values.auth.rbac.enabled -}}
    {{- printf "%s" $rbacOption -}}
{{- end -}}
{{- if and .Values.auth.client.secureTransport .Values.auth.client.useAutoTLS -}}
    {{- printf "%s" $autoCertsOption -}}
{{- else if and .Values.auth.client.secureTransport (not .Values.auth.client.useAutoTLS) -}}
    {{- printf "%s" $certsOption -}}
    {{- if .Values.auth.client.enableAuthentication -}}
        {{- printf "%s" $caOption -}}
    {{- end -}}
{{- end -}}
{{- end -}}

{{/*
Return the etcd configuration configmap
*/}}
{{- define "etcd.configmapName" -}}
{{- if .Values.existingConfigmap -}}
    {{- printf "%s" (tpl .Values.existingConfigmap $) | trunc 63 | trimSuffix "-" -}}
{{- else -}}
    {{- printf "%s-configuration" (include "common.names.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{/*
Return true if a configmap object should be created
*/}}
{{- define "etcd.createConfigmap" -}}
{{- if and .Values.configuration (not .Values.existingConfigmap) }}
    {{- true -}}
{{- end -}}
{{- end -}}

{{/*
Return the secret with etcd credentials
*/}}
{{- define "etcd.secretName" -}}
    {{- if .Values.auth.rbac.existingSecret -}}
        {{- printf "%s" .Values.auth.rbac.existingSecret | trunc 63 | trimSuffix "-" -}}
    {{- else -}}
        {{- printf "%s" (include "common.names.fullname" .) -}}
    {{- end -}}
{{- end -}}

{{/*
Get the secret password key to be retrieved from etcd secret.
*/}}
{{- define "etcd.secretPasswordKey" -}}
{{- if and .Values.auth.rbac.existingSecret .Values.auth.rbac.existingSecretPasswordKey -}}
{{- printf "%s" .Values.auth.rbac.existingSecretPasswordKey -}}
{{- else -}}
{{- printf "etcd-root-password" -}}
{{- end -}}
{{- end -}}

{{/*
Return true if a secret object should be created for the etcd token private key
*/}}
{{- define "etcd.token.createSecret" -}}
{{- if and (eq .Values.auth.token.type "jwt") (empty .Values.auth.token.privateKey.existingSecret) }}
    {{- true -}}
{{- end -}}
{{- end -}}

{{/*
Return the secret with etcd token private key
*/}}
{{- define "etcd.token.secretName" -}}
    {{- if .Values.auth.token.privateKey.existingSecret -}}
        {{- printf "%s" .Values.auth.token.privateKey.existingSecret | trunc 63 | trimSuffix "-" -}}
    {{- else -}}
        {{- printf "%s-jwt-token" (include "common.names.fullname" .) | trunc 63 | trimSuffix "-" -}}
    {{- end -}}
{{- end -}}

{{/*
Return the proper Disaster Recovery PVC name
*/}}
{{- define "etcd.disasterRecovery.pvc.name" -}}
{{- if .Values.disasterRecovery.pvc.existingClaim -}}
    {{- printf "%s" (tpl .Values.disasterRecovery.pvc.existingClaim $) | trunc 63 | trimSuffix "-" -}}
{{- else if .Values.startFromSnapshot.existingClaim -}}
    {{- printf "%s" (tpl .Values.startFromSnapshot.existingClaim $) | trunc 63 | trimSuffix "-" -}}
{{- else -}}
    {{- printf "%s-snapshotter" (include "common.names.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end -}}
{{- end -}}

{{/*
 Create the name of the service account to use
 */}}
{{- define "etcd.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{ default (include "common.names.fullname" .) .Values.serviceAccount.name | trunc 63 | trimSuffix "-" }}
{{- else -}}
{{ default "default" .Values.serviceAccount.name | trunc 63 | trimSuffix "-" }}
{{- end -}}
{{- end -}}

{{/*
Compile all warnings into a single message, and call fail.
*/}}
{{- define "etcd.validateValues" -}}
{{- $messages := list -}}
{{- $messages := append $messages (include "etcd.validateValues.startFromSnapshot.existingClaim" .) -}}
{{- $messages := append $messages (include "etcd.validateValues.startFromSnapshot.snapshotFilename" .) -}}
{{- $messages := append $messages (include "etcd.validateValues.disasterRecovery" .) -}}
{{- $messages := without $messages "" -}}
{{- $message := join "\n" $messages -}}

{{- if $message -}}
{{-   printf "\nVALUES VALIDATION:\n%s" $message | fail -}}
{{- end -}}
{{- end -}}

{{/* Validate values of etcd - an existing claim must be provided when startFromSnapshot is enabled */}}
{{- define "etcd.validateValues.startFromSnapshot.existingClaim" -}}
{{- if and .Values.startFromSnapshot.enabled (not .Values.startFromSnapshot.existingClaim) (not .Values.disasterRecovery.enabled) -}}
etcd: startFromSnapshot.existingClaim
    An existing claim must be provided when startFromSnapshot is enabled and disasterRecovery is disabled!!
    Please provide it (--set startFromSnapshot.existingClaim="xxxx")
{{- end -}}
{{- end -}}

{{/* Validate values of etcd - the snapshot filename must be provided when startFromSnapshot is enabled */}}
{{- define "etcd.validateValues.startFromSnapshot.snapshotFilename" -}}
{{- if and .Values.startFromSnapshot.enabled (not .Values.startFromSnapshot.snapshotFilename) (not .Values.disasterRecovery.enabled) -}}
etcd: startFromSnapshot.snapshotFilename
    The snapshot filename must be provided when startFromSnapshot is enabled and disasterRecovery is disabled!!
    Please provide it (--set startFromSnapshot.snapshotFilename="xxxx")
{{- end -}}
{{- end -}}

{{/* Validate values of etcd - persistence must be enabled when disasterRecovery is enabled */}}
{{- define "etcd.validateValues.disasterRecovery" -}}
{{- if and .Values.disasterRecovery.enabled (not .Values.persistence.enabled) -}}
etcd: disasterRecovery
    Persistence must be enabled when disasterRecovery is enabled!!
    Please enable persistence (--set persistence.enabled=true)
{{- end -}}
{{- end -}}

{{- define "etcd.token.jwtToken" -}}
{{- if (include "etcd.token.createSecret" .) -}}
{{- $jwtToken := lookup "v1" "Secret" .Release.Namespace (printf "%s-jwt-token" (include "common.names.fullname" .) | trunc 63 | trimSuffix "-" ) -}}
{{- if $jwtToken -}}
{{ index $jwtToken "data" "jwt-token.pem" | b64dec }}
{{- else -}}
{{ genPrivateKey "rsa" }}
{{- end -}}
{{- end -}}
{{- end -}}
