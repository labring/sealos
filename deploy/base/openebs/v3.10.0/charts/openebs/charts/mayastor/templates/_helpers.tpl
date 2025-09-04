{{/* vim: set filetype=mustache: */}}

{{/*
Renders a value that contains template.
Usage:
{{ include "render" ( dict "value" .Values.path.to.the.Value "context" $) }}
*/}}
{{- define "render" -}}
    {{- if typeIs "string" .value }}
        {{- tpl .value .context }}
    {{- else }}
        {{- tpl (.value | toYaml) .context }}
    {{- end }}
{{- end -}}

{{/*
Renders the CORE server init container, if enabled
Usage:
{{ include "base_init_core_containers" . }}
*/}}
{{- define "base_init_core_containers" -}}
    {{- if .Values.base.initCoreContainers.enabled }}
    {{- include "render" (dict "value" .Values.base.initCoreContainers.containers "context" $) | nindent 8 }}
    {{- end }}
{{- end -}}

{{/*
Renders the HA NODE AGENT init container, if enabled
Usage:
{{ include "base_init_ha_node_containers" . }}
*/}}
{{- define "base_init_ha_node_containers" -}}
    {{- if .Values.base.initHaNodeContainers.enabled }}
    {{- include "render" (dict "value" .Values.base.initHaNodeContainers.containers "context" $) | nindent 8 }}
    {{- end }}
{{- end -}}

{{/*
Renders the base init containers for all deployments, if any
Usage:
{{ include "base_init_containers" . }}
*/}}
{{- define "base_init_containers" -}}
    {{- if .Values.base.initContainers.enabled }}
    {{- include "render" (dict "value" .Values.base.initContainers.containers "context" $) | nindent 8 }}
    {{- end }}
    {{- include "jaeger_agent_init_container" . }}
{{- end -}}

{{/*
Renders the jaeger agent init container, if enabled
Usage:
{{ include "jaeger_agent_init_container" . }}
*/}}
{{- define "jaeger_agent_init_container" -}}
    {{- if .Values.base.jaeger.enabled }}
      {{- if .Values.base.jaeger.initContainer }}
      {{- include "render" (dict "value" .Values.base.jaeger.agent.initContainer "context" $) | nindent 8 }}
      {{- end }}
    {{- end }}
{{- end -}}

{{/*
Renders the base image pull secrets for all deployments, if any
Usage:
{{ include "base_pull_secrets" . }}
*/}}
{{- define "base_pull_secrets" -}}
    {{- if .Values.base.imagePullSecrets.enabled }}
    {{- include "render" (dict "value" .Values.base.imagePullSecrets.secrets "context" $) | nindent 8 }}
    {{- end }}
{{- end -}}

{{/*
Renders the REST server init container, if enabled
Usage:
{{- include "rest_agent_init_container" . }}
*/}}
{{- define "rest_agent_init_container" -}}
    {{- if .Values.base.initRestContainer.enabled }}
        {{- include "render" (dict "value" .Values.base.initRestContainer.initContainer "context" $) | nindent 8 }}
    {{- end }}
{{- end -}}

{{/*
Renders the jaeger scheduling rules, if any
Usage:
{{ include "jaeger_scheduling" . }}
*/}}
{{- define "jaeger_scheduling" -}}
    {{- if index .Values "jaeger-operator" "affinity" }}
  affinity:
    {{- include "render" (dict "value" (index .Values "jaeger-operator" "affinity") "context" $) | nindent 4 }}
    {{- end }}
    {{- if index .Values "jaeger-operator" "tolerations" }}
  tolerations:
    {{- include "render" (dict "value" (index .Values "jaeger-operator" "tolerations") "context" $) | nindent 4 }}
    {{- end }}
{{- end -}}

{{/* Generate Core list specification (-l param of io-engine) */}}
{{- define "cpuFlag" -}}
{{- include "coreListUniq" . -}}
{{- end -}}

{{/* Get the number of cores from the coreList */}}
{{- define "coreCount" -}}
{{- include "coreListUniq" . | split "," | len -}}
{{- end -}}

{{/* Get a list of cores as a comma-separated list */}}
{{- define "coreListUniq" -}}
{{- if .Values.io_engine.coreList -}}
{{- $cores_pre := .Values.io_engine.coreList -}}
{{- if not (kindIs "slice" .Values.io_engine.coreList) -}}
{{- $cores_pre = list $cores_pre -}}
{{- end -}}
{{- $cores := list -}}
{{- range $index, $value := $cores_pre | uniq -}}
{{- $value = $value | toString | replace " " "" }}
{{- if eq ($value | int | toString) $value -}}
{{-   $cores = append $cores $value -}}
{{- end -}}
{{- end -}}
{{- $first := first $cores | required (print "At least one core must be specified in io_engine.coreList") -}}
{{- $cores | join "," -}}
{{- else -}}
{{- if gt 1 (.Values.io_engine.cpuCount | int) -}}
{{- fail ".Values.io_engine.cpuCount must be >= 1" -}}
{{- end -}}
{{- untilStep 1 (add 1 .Values.io_engine.cpuCount | int) 1 | join "," -}}
{{- end -}}
{{- end }}

{{/*
Adds the project domain to labels
Usage:
{{ include "label_prefix" . }}/release: {{ .Release.Name }}
*/}}
{{- define "label_prefix" -}}
    {{ $product := .Files.Get "product.yaml" | fromYaml }}
    {{- print $product.domain -}}
{{- end -}}

{{/*
Creates the tolerations based on the global and component wise tolerations, with early eviction
Usage:
{{ include "tolerations_with_early_eviction" (dict "template" . "localTolerations" .Values.path.to.local.tolerations) }}
*/}}
{{- define "tolerations_with_early_eviction" -}}
{{- toYaml .template.Values.earlyEvictionTolerations | nindent 8 }}
{{- if .localTolerations }}
    {{- toYaml .localTolerations | nindent 8 }}
{{- else if .template.Values.tolerations }}
    {{- toYaml .template.Values.tolerations | nindent 8 }}
{{- end }}
{{- end }}


{{/*
Creates the tolerations based on the global and component wise tolerations
Usage:
{{ include "tolerations" (dict "template" . "localTolerations" .Values.path.to.local.tolerations) }}
*/}}
{{- define "tolerations" -}}
{{- if .localTolerations }}
    {{- toYaml .localTolerations | nindent 8 }}
{{- else if .template.Values.tolerations }}
    {{- toYaml .template.Values.tolerations | nindent 8 }}
{{- end }}
{{- end }}

{{/*
Generates the priority class name, with the given `template` and the `localPriorityClass`
Usage:
{{ include "priority_class" (dict "template" . "localPriorityClass" .Values.path.to.local.priorityClassName) }}
*/}}
{{- define "priority_class" -}}
    {{- if typeIs "string" .localPriorityClass }}
        {{- if .localPriorityClass -}}
            {{ printf "%s" .localPriorityClass -}}
        {{- else if .template.Values.priorityClassName -}}
            {{ printf "%s" .template.Values.priorityClassName -}}
        {{- else -}}
            {{ printf "" -}}
        {{- end -}}
    {{- end -}}
{{- end -}}


{{/*
Generates the priority class name, with the given `template` and the `localPriorityClass`, sets to mayastor default priority class
if both are empty
Usage:
{{ include "priority_class_with_default" (dict "template" . "localPriorityClass" .Values.path.to.local.priorityClassName) }}
*/}}
{{- define "priority_class_with_default" -}}
    {{- if typeIs "string" .localPriorityClass }}
        {{- if .localPriorityClass -}}
            {{ printf "%s" .localPriorityClass -}}
        {{- else if .template.Values.priorityClassName -}}
            {{ printf "%s" .template.Values.priorityClassName -}}
        {{- else -}}
            {{ printf "%s-cluster-critical" .template.Release.Name -}}
        {{- end -}}
    {{- end -}}
{{- end -}}

{{/*
    Generate the default StorageClass parameters.
    This is required because StorageClass parameters cannot be patched after creation.
    If the StorageClass already exists, the default StorageClass carries the parameters and values
    of that StorageClass. Else, it carries the default parameters and values.
*/}}
{{- define "storageClass.parameters" -}}
    {{- $scName := index . 0 -}}
    {{- $valuesParams := index . 1 -}}

    {{/* Check to see if a default StorageClass already exists */}}
    {{- $sc := lookup "storage.k8s.io/v1" "StorageClass" "" $scName -}}

    {{- if $sc -}}
        {{/* Existing defaults */}}
        {{ range $param, $val := $sc.parameters }}
{{ $param | quote }}: {{ $val | quote }}
        {{- end -}}

    {{- else -}}
        {{/* Current defaults */}}
        {{ range $param, $val := $valuesParams }}
{{ $param | quote }}: {{ $val | quote }}
        {{- end -}}
    {{- end -}}
{{- end -}}