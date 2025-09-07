{{- /* Create the name for VM service */ -}}
{{- define "vm.service" -}}
  {{- include "vm.validate.args" . -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $nameTpl := "" -}}
  {{- if eq .style "managed" -}}
    {{- $nameTpl = "vm.managed.fullname" }}
  {{- else if eq .style "plain" -}}
    {{- $nameTpl = "vm.plain.fullname" }}
  {{- else -}}
    {{- fail ".style argument should be either `plain` or `managed`"}}
  {{- end -}}
  {{- include $nameTpl . -}}
{{- end }}

{{- define "vm.fqdn" -}}
  {{- $name := (include "vm.service" .) -}}
  {{- if hasKey . "appIdx" -}}
    {{- $name = (printf "%s-%d.%s" $name .appIdx $name) -}}
  {{- end -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $ns := (include "vm.namespace" .) -}}
  {{- $fqdn := printf "%s.%s.svc" $name $ns -}}
  {{- with (($Values.global).cluster).dnsDomain -}}
    {{- $fqdn = printf "%s.%s" $fqdn . -}}
  {{- end -}}
  {{- $fqdn -}}
{{- end -}}

{{- define "vm.host" -}}
  {{- $fqdn := (include "vm.fqdn" .) -}}
  {{- $port := 80 -}}
  {{- $isSecure := ternary false true (empty .appSecure) -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- if .appKey -}}
    {{- $appKey := ternary (list .appKey) .appKey (kindIs "string" .appKey) -}}
    {{- $values := $Values -}}
    {{- $ctx := . -}}
    {{- range $ak := $appKey -}}
      {{- $values = ternary (default dict) (index $values $ak | default dict) (empty $values) -}}
      {{- $ctx = ternary (default dict) (index $ctx $ak | default dict) (empty $ctx) -}}
    {{- end -}}
    {{- $spec := default dict -}}
    {{- if $ctx -}}
      {{- $spec = $ctx -}}
    {{- else if $values -}}
      {{- $spec = $values -}}
    {{- end -}}
    {{- with ($spec.extraArgs).tls -}}
      {{- $isSecure = eq (toString .) "true" -}}
    {{- end -}}
    {{- $port = (ternary 443 80 $isSecure) -}}
    {{- $port = $spec.port | default ($spec.service).servicePort | default ($spec.service).port | default $port -}}
    {{- if hasKey . "appIdx" -}}
      {{- $port = (include "vm.port.from.flag" (dict "flag" ($spec.extraArgs).httpListenAddr "default" $port)) -}}
    {{- end }}
  {{- end }}
  {{- $fqdn }}:{{ $port }}
{{- end -}}

{{- define "vm.url" -}}
  {{- $host := (include "vm.host" .) -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $proto := "http" -}}
  {{- $path := .appRoute | default "/" -}}
  {{- $isSecure := ternary false true (empty .appSecure) -}}
  {{- if .appKey -}}
    {{- $appKey := ternary (list .appKey) .appKey (kindIs "string" .appKey) -}}
    {{- $values := $Values -}}
    {{- $ctx := . -}}
    {{- range $ak := $appKey -}}
      {{- $values = ternary (default dict) (index $values $ak | default dict) (empty $values) -}}
      {{- $ctx = ternary (default dict) (index $ctx $ak | default dict) (empty $ctx) -}}
    {{- end -}}
    {{- $spec := default dict -}}
    {{- if $values -}}
      {{- $spec = $values -}}
    {{- else if $ctx -}}
      {{- $spec = $ctx -}}
    {{- end -}}
    {{- with ($spec.extraArgs).tls -}}
      {{- $isSecure = eq (toString .) "true" -}}
    {{- end -}}
    {{- $proto = (ternary "https" "http" $isSecure) -}}
    {{- $path = dig "http.pathPrefix" $path ($spec.extraArgs | default dict) -}}
  {{- end -}}
  {{- printf "%s://%s%s" $proto $host (trimSuffix "/" $path) -}}
{{- end -}}
