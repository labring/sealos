{{- define "vm.ingress.port" }}
  {{- $port := dict "name" "http" }}
  {{- with .port }}
    {{- $numberTypes := list "int" "float64" }}
    {{- $port = dict (ternary "number" "name" (has (kindOf .) $numberTypes)) . }}
  {{- end -}}
  {{- toYaml $port -}}
{{- end }}
