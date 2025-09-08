{{- define "vm.license.secret.key" -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $plain := (($Values.license).secret).key | default ((($Values.global).license).secret).key -}}
  {{- $managed := (($Values.license).keyRef).key | default ((($Values.global).license).keyRef).key }}
  {{- if $plain -}}
    {{- $plain -}}
  {{- else if $managed -}}
    {{- $managed -}}
  {{- end -}}
{{- end -}}

{{- define "vm.license.secret.name" -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $plain := (($Values.license).secret).name | default ((($Values.global).license).secret).name -}}
  {{- $managed := (($Values.license).keyRef).name | default ((($Values.global).license).keyRef).name -}}
  {{- if $plain -}}
    {{- $plain -}}
  {{- else if $managed -}}
    {{- $managed -}}
  {{- end -}}
{{- end -}}

{{- define "vm.license.key" -}}
  {{- $Values := (.helm).Values | default .Values }}
  {{- ($Values.license).key | default (($Values.global).license).key | default "" -}}
{{- end -}}

{{- define "vm.enterprise.disabled" -}}
  {{- $licenseKey := (include "vm.license.key" .) -}}
  {{- $licenseSecretKey := (include "vm.license.secret.key" .) -}}
  {{- $licenseSecretName := (include "vm.license.secret.name" .) -}}
  {{- or .noEnterprise (and (empty $licenseKey) (and (empty $licenseSecretName) (empty $licenseSecretKey))) -}}
{{- end -}}

{{- define "vm.enterprise.only" -}}
  {{- if eq (include "vm.enterprise.disabled" .) "true" }}
    {{ fail `Pass valid license at .Values.license or .Values.global.license if you have an enterprise license for running this software.
       See https://victoriametrics.com/legal/esa/ for details.
       Documentation - https://docs.victoriametrics.com/enterprise
       for more information, visit https://victoriametrics.com/products/enterprise/
       To request a trial license, go to https://victoriametrics.com/products/enterprise/trial/` }}
  {{- end -}}
{{- end -}}

{{/*
Return license volume mount
*/}}
{{- define "vm.license.volume" -}}
  {{- $licenseSecretKey := (include "vm.license.secret.key" .) -}}
  {{- $licenseSecretName := (include "vm.license.secret.name" .) -}}
  {{- if and $licenseSecretName $licenseSecretKey -}}
- name: license-key
  secret:
    secretName: {{ $licenseSecretName }}
  {{- end -}}
{{- end -}}

{{/*
Return license volume mount for container
*/}}
{{- define "vm.license.mount" -}}
  {{- $licenseSecretKey := (include "vm.license.secret.key" .) -}}
  {{- $licenseSecretName := (include "vm.license.secret.name" .) -}}
  {{- if and $licenseSecretName $licenseSecretKey -}}
- name: license-key
  mountPath: /etc/vm-license-key
  readOnly: true
  {{- end -}}
{{- end -}}

{{/*
Return license flag if necessary.
*/}}
{{- define "vm.license.flag" -}}
  {{- $licenseKey := (include "vm.license.key" .) -}}
  {{- $licenseSecretKey := (include "vm.license.secret.key" .) -}}
  {{- $licenseSecretName := (include "vm.license.secret.name" .) -}}
  {{- if $licenseKey -}}
    license: {{ $licenseKey }}
  {{- else if and $licenseSecretName $licenseSecretKey -}}
    {{- $flagName := "licenseFile" -}}
    {{- if eq .flagStyle "kebab" }}
      {{- $flagName = "license-file" -}}
    {{- end -}}
    {{- $flagName }}: /etc/vm-license-key/{{ $licenseSecretKey }}
  {{- end -}}
{{- end -}}
