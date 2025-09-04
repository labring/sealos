{{- define "vm.namespace" -}}
  {{- include "vm.validate.args" . -}}
  {{- $Release := (.helm).Release | default .Release -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $Values.namespaceOverride | default ($Values.global).namespaceOverride | default $Release.Namespace -}}
{{- end -}}

{{- define "vm.validate.args" -}}
  {{- $Chart := (.helm).Chart | default .Chart -}}
  {{- $Capabilities := (.helm).Capabilities | default .Capabilities -}}
  {{- if semverCompare "<3.14.0" $Capabilities.HelmVersion.Version }}
    {{- fail "This chart requires helm version 3.14.0 or higher" }}
  {{- end }}
  {{- if empty $Chart -}}
    {{- fail "invalid template data" -}}
  {{- end -}}
{{- end -}}

{{- /* Expand the name of the chart. */ -}}
{{- define "vm.name" -}}
  {{- include "vm.validate.args" . -}}
  {{- $Chart := (.helm).Chart | default .Chart -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $nameOverride := $Values.nameOverride | default ($Values.global).nameOverride | default $Chart.Name -}}
  {{- if or ($Values.global).disableNameTruncation $Values.disableNameTruncation -}}
    {{- $nameOverride -}}
  {{- else -}}
    {{- $nameOverride | trunc 63 | trimSuffix "-" -}}
  {{- end -}}
{{- end -}}

{{- /*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/ -}}
{{- define "vm.fullname" -}}
  {{- include "vm.validate.args" . -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $Chart := (.helm).Chart | default .Chart -}}
  {{- $Release := (.helm).Release | default .Release -}}
  {{- $fullname := "" -}}
  {{- if $Values.fullnameOverride -}}
    {{- $fullname = $Values.fullnameOverride -}}
  {{- else if ($Values.global).fullnameOverride -}}
    {{- $fullname = $Values.global.fullnameOverride -}}
  {{- else -}}
    {{- $name := default $Chart.Name $Values.nameOverride -}}
    {{- if contains $name $Release.Name -}}
      {{- $fullname = $Release.Name -}}
    {{- else -}}
      {{- $fullname = (printf "%s-%s" $Release.Name $name) }}
    {{- end -}}
  {{- end -}}
  {{- $fullname = tpl $fullname . -}}
  {{- if or ($Values.global).disableNameTruncation $Values.disableNameTruncation -}}
    {{- $fullname -}}
  {{- else -}}
    {{- $fullname | trunc 63 | trimSuffix "-" -}}
  {{- end -}}
{{- end }}

{{- define "vm.cr.fullname" -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $_ := set . "overrideKey" "name" -}}
  {{- $fullname := include "vm.internal.key" . -}}
  {{- $_ := unset . "overrideKey" -}}
  {{- if empty $fullname -}}
    {{- $fullname = include "vm.fullname" . -}}
  {{- end -}}
  {{- $fullname = tpl $fullname . -}}
  {{- if or ($Values.global).disableNameTruncation $Values.disableNameTruncation -}}
    {{- $fullname -}}
  {{- else -}}
    {{- $fullname | trunc 63 | trimSuffix "-" -}}
  {{- end -}}
{{- end -}}

{{- define "vm.managed.fullname" -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $_ := set . "overrideKey" "name" -}}
  {{- $fullname := include "vm.internal.key" . -}}
  {{- $_ := unset . "overrideKey" -}}
  {{- if empty $fullname -}}
    {{- $fullname = include "vm.fullname" . -}}
  {{- end -}}
  {{- with include "vm.internal.key.default" . -}}
    {{- $prefix := ternary . (printf "vm%s" .) (or (hasPrefix "vm" .) (hasPrefix "vl" .)) -}}
    {{- $fullname = printf "%s-%s" $prefix $fullname -}}
  {{- end -}}
  {{- $fullname = tpl $fullname . -}}
  {{- if or ($Values.global).disableNameTruncation $Values.disableNameTruncation -}}
    {{- $fullname -}}
  {{- else -}}
    {{- $fullname | trunc 63 | trimSuffix "-" -}}
  {{- end -}}
{{- end -}}

{{- define "vm.plain.fullname" -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $_ := set . "overrideKey" "fullnameOverride" -}}
  {{- $fullname := include "vm.internal.key" . -}}
  {{- $_ := unset . "overrideKey" -}}
  {{- if empty $fullname -}}
    {{- $fullname = include "vm.fullname" . -}}
    {{- with include "vm.internal.key.default" . -}}
      {{- $fullname = printf "%s-%s" $fullname . -}}
    {{- end -}}
  {{- end -}}
  {{- $fullname = tpl $fullname . -}}
  {{- if or ($Values.global).disableNameTruncation $Values.disableNameTruncation -}}
    {{- $fullname -}}
  {{- else -}}
    {{- $fullname | trunc 63 | trimSuffix "-" -}}
  {{- end -}}
{{- end -}}

{{- define "vm.internal.key" -}}
  {{- include "vm.validate.args" . -}}
  {{- $overrideKey := .overrideKey | default "fullnameOverride" -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $key := "" -}}
  {{- if .appKey -}}
    {{- $appKey := ternary (list .appKey) .appKey (kindIs "string" .appKey) -}}
    {{- $ctx := . -}}
    {{- $values := $Values -}}
    {{- range $ak := $appKey }}
      {{- $values = ternary (default dict) (index $values $ak | default dict) (empty $values) -}}
      {{- $ctx = ternary (default dict) (index $ctx $ak | default dict) (empty $ctx) -}}
      {{- if and (empty $values) (empty $ctx) -}}
        {{- fail (printf "No data for appKey %s" (join "->" $appKey)) -}}
      {{- end -}}
      {{- if and (kindIs "map" $values) (index $values $overrideKey) -}}
        {{- $key = index $values $overrideKey -}}
      {{- else if and (kindIs "map" $ctx) (index $ctx $overrideKey) -}}
        {{- $key = index $ctx $overrideKey -}}
      {{- end -}}
    {{- end }}
    {{- if and (empty $key) .fallback -}}
      {{- $key = include "vm.internal.key.default" . -}}
    {{- end -}}
  {{- end -}}
  {{- $key -}}
{{- end -}}

{{- define "vm.internal.key.default" -}}
  {{- with .appKey -}}
  {{- $key := ternary (list .) . (kindIs "string" .) -}}
  {{- last (without $key "spec") -}}
  {{- end -}}
{{- end -}}

{{- /* Create chart name and version as used by the chart label. */ -}}
{{- define "vm.chart" -}}
  {{- include "vm.validate.args" . -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $Chart := (.helm).Chart | default .Chart -}}
  {{- $chart := printf "%s-%s" $Chart.Name $Chart.Version | replace "+" "_" -}}
  {{- if or ($Values.global).disableNameTruncation $Values.disableNameTruncation -}}
    {{- $chart -}}
  {{- else -}}
    {{- $chart | trunc 63 | trimSuffix "-" -}}
  {{- end }}
{{- end }}

{{- /* Create the name of the service account to use */ -}}
{{- define "vm.sa.name" -}}
  {{- include "vm.validate.args" . -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- if $Values.serviceAccount.create }}
    {{- default (include "vm.fullname" .) $Values.serviceAccount.name }}
  {{- else -}}
    {{- default "default" $Values.serviceAccount.name -}}
  {{- end }}
{{- end }}

{{- define "vm.metaLabels" -}}
  {{- include "vm.validate.args" . -}}
  {{- $Release := (.helm).Release | default .Release -}}
  {{- $labels := .extraLabels | default dict -}}
  {{- $_ := set $labels "helm.sh/chart" (include "vm.chart" .) -}}
  {{- $_ := set $labels "app.kubernetes.io/managed-by" $Release.Service -}}
  {{- toYaml $labels -}}
{{- end -}}

{{- define "vm.podLabels" -}}
  {{- include "vm.validate.args" . -}}
  {{- $Release := (.helm).Release | default .Release -}}
  {{- $labels := fromYaml (include "vm.selectorLabels" .) -}}
  {{- $labels = mergeOverwrite $labels (.extraLabels | default dict) -}}
  {{- $_ := set $labels "app.kubernetes.io/managed-by" $Release.Service -}}
  {{- toYaml $labels -}}
{{- end -}}

{{- /* Common labels */ -}}
{{- define "vm.labels" -}}
  {{- include "vm.validate.args" . -}}
  {{- $labels := fromYaml (include "vm.selectorLabels" .) -}}
  {{- $labels = mergeOverwrite $labels (fromYaml (include "vm.metaLabels" .)) -}}
  {{- with (include "vm.image.tag" .) }}
    {{- $_ := set $labels "app.kubernetes.io/version" (regexReplaceAll "(.*)(@sha.*)" . "${1}") -}}
  {{- end -}}
  {{- toYaml $labels -}}
{{- end -}}

{{- define "vm.release" -}}
  {{- include "vm.validate.args" . -}}
  {{- $Release := (.helm).Release | default .Release -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $release := default $Release.Name $Values.argocdReleaseOverride -}}
  {{- if or ($Values.global).disableNameTruncation $Values.disableNameTruncation -}}
    {{- $release -}}
  {{- else -}}
    {{- $release | trunc 63 | trimSuffix "-" -}}
  {{- end -}}
{{- end -}}

{{- define "vm.app.name" -}}
  {{- $_ := set . "overrideKey" "name" -}}
  {{- $_ := set . "fallback" true -}}
  {{- tpl (include "vm.internal.key" .) . -}}
  {{- $_ := unset . "overrideKey" -}}
  {{- $_ := unset . "fallback" -}}
{{- end -}}

{{- /* Selector labels */ -}}
{{- define "vm.selectorLabels" -}}
  {{- $labels := .extraLabels | default dict -}}
  {{- $_ := set $labels "app.kubernetes.io/name" (include "vm.name" .) -}}
  {{- $_ := set $labels "app.kubernetes.io/instance" (include "vm.release" .) -}}
  {{- with (include "vm.app.name" .) -}}
    {{- if eq $.style "managed" -}}
      {{- $_ := set $labels "app.kubernetes.io/component" (printf "%s-%s" (include "vm.name" $) .) -}}
    {{- else -}}
      {{- $_ := set $labels "app" . -}}
    {{- end -}}
  {{- end -}}
  {{- toYaml $labels -}}
{{- end }}
