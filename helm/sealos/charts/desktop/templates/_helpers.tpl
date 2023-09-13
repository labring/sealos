{{/*
Return the proper desktop image name
*/}}
{{- define "desktop.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.desktop.image "global" .Values.global) }}
{{- end -}}

{{/*
Return the proper Docker Image Registry Secret Names
*/}}
{{- define "desktop.imagePullSecrets" -}}
{{- include "common.images.pullSecrets" (dict "images" (list .Values.desktop.image) "global" .Values.global) -}}
{{- end -}}

{{/*
Create the name of the service account to use
*/}}
{{- define "desktop.serviceAccountName" -}}
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
{{- define "desktop.ingress.certManagerRequest" -}}
{{ if or (hasKey . "cert-manager.io/cluster-issuer") (hasKey . "cert-manager.io/issuer") }}
    {{- true -}}
{{- end -}}
{{- end -}}

{{/*
Returns the domain to be used by the desktop.
*/}}
{{- define "desktop.domain" -}}
{{- if .Values.desktop.domain -}}
    {{- .Values.desktop.domain -}}
{{- else -}}
    {{- .Values.global.cloud.domain -}}
{{- end -}}
{{- end -}}

{{/*
Returns the full URL for the desktop, including the HTTP/HTTPS prefix and port if specified.
*/}}
{{- define "desktop.fullUrl" -}}
{{- if .Values.global.ingress.tls -}}
https://{{ include "desktop.domain" . }}{{ if .Values.global.cloud.port }}:{{ .Values.global.cloud.port }}{{ end }}
{{- else -}}
http://{{ include "desktop.domain" . }}{{ if .Values.global.cloud.port }}:{{ .Values.global.cloud.port }}{{ end }}
{{- end -}}
{{- end -}}

{{/*
Returns the callback URL to be used by the desktop.
*/}}
{{- define "desktop.callbackUrl" -}}
{{- if .Values.desktop.callbackUrl -}}
{{- .Values.desktop.callbackUrl -}}
{{- else -}}
{{ if .Values.global.ingress.tls }}https{{ else }}http{{ end }}://{{ include "desktop.domain" . }}{{ if .Values.global.cloud.port }}:{{ .Values.global.cloud.port }}{{ end }}/callback
{{- end -}}
{{- end -}}

{{/*
Returns the mongodbURI to be used by the desktop.
*/}}
{{- define "desktop.mongodbURI" -}}
{{- if .Values.desktop.mongodbURI -}}
{{- .Values.desktop.mongodbURI -}}
{{- else -}}
{{- if .Values.global.cloud.mongodbURI -}}
{{- .Values.global.cloud.mongodbURI -}}
{{- end -}}
{{- end -}}
{{- end -}}