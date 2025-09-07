{{- define "vm.port.from.flag" -}}
  {{- $port := .default -}}
  {{- with .flag -}}
    {{- $port = regexReplaceAll ".*:(\\d+)" . "${1}" -}}
  {{- end -}}
  {{- $port -}}
{{- end }}

{{- /*
Return true if the detected platform is Openshift
Usage:
{{- include "vm.isOpenshift" . -}}
*/ -}}
{{- define "vm.isOpenshift" -}}
  {{- $Capabilities := (.helm).Capabilities | default .Capabilities -}}
  {{- if $Capabilities.APIVersions.Has "security.openshift.io/v1" -}}
    {{- true -}}
  {{- end -}}
{{- end -}}

{{- /*
Render a compatible securityContext depending on the platform.
Usage:
{{- include "vm.securityContext" (dict "securityContext" .Values.containerSecurityContext "helm" .) -}}
*/ -}}
{{- define "vm.securityContext" -}}
  {{- $securityContext := omit .securityContext "enabled" -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $adaptMode := (((($Values).global).compatibility).openshift).adaptSecurityContext | default "" -}}
  {{- if or (eq $adaptMode "force") (and (eq $adaptMode "auto") (include "vm.isOpenshift" .)) -}}
    {{- $securityContext = omit $securityContext "fsGroup" "runAsUser" "runAsGroup" "seLinuxOptions" -}}
  {{- end -}}
  {{- toYaml $securityContext -}}
{{- end -}}

{{- /*
Render probe
*/ -}}
{{- define "vm.probe" -}}
  {{- /* undefined value */ -}}
  {{- $null := (fromYaml "value: null").value -}}
  {{- $probe := dig .type (default dict) .app.probe -}}
  {{- $probeType := "" -}}
  {{- $defaultProbe := default dict -}}
  {{- if ne (dig "httpGet" $null $probe) $null -}}
    {{- /* httpGet probe */ -}}
    {{- $defaultProbe = dict "path" (include "vm.probe.http.path" .) "scheme" (include "vm.probe.http.scheme" .) "port" (include "vm.probe.port" .) -}}
    {{- $probeType = "httpGet" -}}
  {{- else if ne (dig "tcpSocket" $null $probe) $null -}}
    {{- /* tcpSocket probe */ -}}
    {{- $defaultProbe = dict "port" (include "vm.probe.port" .) -}}
    {{- $probeType = "tcpSocket" -}}
  {{- end -}}
  {{- $defaultProbe = ternary (default dict) (dict $probeType $defaultProbe) (empty $probeType) -}}
  {{- $probe = mergeOverwrite $defaultProbe $probe -}}
  {{- range $key, $value := $probe -}}
    {{- if and (has (kindOf $value) (list "object" "map")) (ne $key $probeType) -}}
      {{- $_ := unset $probe $key -}}
    {{- end -}}
  {{- end -}}
  {{- tpl (toYaml $probe) . -}}
{{- end -}}

{{- /*
HTTP GET probe path
*/ -}}
{{- define "vm.probe.http.path" -}}
  {{- index .app.extraArgs "http.pathPrefix" | default "" | trimSuffix "/" -}}/health
{{- end -}}

{{- /*
HTTP GET probe scheme
*/ -}}
{{- define "vm.probe.http.scheme" -}}
  {{- $isSecure := false -}}
  {{- with ((.app).extraArgs).tls -}}
    {{- $isSecure = eq (toString .) "true" -}}
  {{- end -}}
  {{- ternary "HTTPS" "HTTP" $isSecure -}}
{{- end -}}

{{- /*
Net probe port
*/ -}}
{{- define "vm.probe.port" -}}
  {{- dig "ports" "name" "http" (.app | dict) -}}
{{- end -}}

{{- define "vm.arg" -}}
  {{- if and (empty .value) (kindIs "string" .value) (ne (toString .list) "true") }}
    {{- .key -}}
  {{- else if eq (toString .value) "true" -}}
    -{{ ternary "" "-" (eq (len .key) 1) }}{{ .key }}
  {{- else -}}
    -{{ ternary "" "-" (eq (len .key) 1) }}{{ .key }}={{ ternary (toJson .value | squote) .value (has (kindOf .value) (list "map" "slice")) }}
  {{- end -}}
{{- end -}}

{{- /*
command line arguments
*/ -}}
{{- define "vm.args" -}}
  {{- $args := default list -}}
  {{- range $key, $value := . -}}
    {{- if not $key -}}
      {{- fail "Empty key in command line args is not allowed" -}}
    {{- end -}}
    {{- if kindIs "slice" $value -}}
      {{- range $v := $value -}}
        {{- $args = append $args (include "vm.arg" (dict "key" $key "value" $v "list" true)) -}}
      {{- end -}}
    {{- else -}}
      {{- $args = append $args (include "vm.arg" (dict "key" $key "value" $value)) -}}
    {{- end -}}
  {{- end -}}
  {{- toYaml (dict "args" $args) -}}
{{- end -}}
