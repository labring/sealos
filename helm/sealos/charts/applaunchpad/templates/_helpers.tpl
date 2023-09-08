{{/*
Return the proper applaunchpad image name
*/}}
{{- define "applaunchpad.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.applaunchpad.image "global" .Values.global) }}
{{- end -}}

{{/*
Return the proper Docker Image Registry Secret Names
*/}}
{{- define "applaunchpad.imagePullSecrets" -}}
{{- include "common.images.pullSecrets" (dict "images" (list .Values.applaunchpad.image) "global" .Values.global) -}}
{{- end -}}

{{/*
Create the name of the service account to use
*/}}
{{- define "applaunchpad.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
    {{ default (include "common.names.fullname" .) .Values.serviceAccount.name }}
{{- else -}}
    {{ default "default" .Values.serviceAccount.name }}
{{- end -}}
{{- end -}}

{{/*
Return true if cert-manager required annotations for TLS signed certificates are set in the Ingress annotations
Ref: https://cert-manager.io/docs/usage/ingress/#supported-annotations
*/}}
{{- define "applaunchpad.ingress.certManagerRequest" -}}
{{ if or (hasKey . "cert-manager.io/cluster-issuer") (hasKey . "cert-manager.io/issuer") }}
    {{- true -}}
{{- end -}}
{{- end -}}

{{/*
Returns the domain to be used by the applaunchpad.
*/}}
{{- define "applaunchpad.domain" -}}
{{- if .Values.applaunchpad.domain -}}
    {{- .Values.applaunchpad.domain -}}
{{- else -}}
    applaunchpad.{{- .Values.global.cloud.domain -}}
{{- end -}}
{{- end -}}

{{/*
Returns the full URL for the applaunchpad, including the HTTP/HTTPS prefix and port if specified.
*/}}
{{- define "applaunchpad.fullUrl" -}}
{{- if .Values.global.ingress.tls -}}
https://{{ include "applaunchpad.domain" . }}{{ if .Values.global.cloud.port }}:{{ .Values.global.cloud.port }}{{ end }}
{{- else -}}
http://{{ include "applaunchpad.domain" . }}{{ if .Values.global.cloud.port }}:{{ .Values.global.cloud.port }}{{ end }}
{{- end -}}
{{- end -}}
