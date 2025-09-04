{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "prometheus-node-exporter.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "prometheus-node-exporter.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "prometheus-node-exporter.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "prometheus-node-exporter.labels" -}}
helm.sh/chart: {{ include "prometheus-node-exporter.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/component: metrics
app.kubernetes.io/part-of: {{ include "prometheus-node-exporter.name" . }}
{{ include "prometheus-node-exporter.selectorLabels" . }}
{{- with .Chart.AppVersion }}
app.kubernetes.io/version: {{ . | quote }}
{{- end }}
{{- with .Values.commonLabels }}
{{ tpl (toYaml .) $ }}
{{- end }}
{{- if .Values.releaseLabel }}
release: {{ .Release.Name }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "prometheus-node-exporter.selectorLabels" -}}
app.kubernetes.io/name: {{ include "prometheus-node-exporter.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}


{{/*
Create the name of the service account to use
*/}}
{{- define "prometheus-node-exporter.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "prometheus-node-exporter.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
The image to use
*/}}
{{- define "prometheus-node-exporter.image" -}}
{{- if .Values.image.sha }}
{{- fail "image.sha forbidden. Use image.digest instead" }}
{{- else if .Values.image.digest }}
{{- if .Values.global.imageRegistry }}
{{- printf "%s/%s:%s@%s" .Values.global.imageRegistry .Values.image.repository (default (printf "v%s" .Chart.AppVersion) .Values.image.tag) .Values.image.digest }}
{{- else }}
{{- printf "%s/%s:%s@%s" .Values.image.registry .Values.image.repository (default (printf "v%s" .Chart.AppVersion) .Values.image.tag) .Values.image.digest }}
{{- end }}
{{- else }}
{{- if .Values.global.imageRegistry }}
{{- printf "%s/%s:%s" .Values.global.imageRegistry .Values.image.repository (default (printf "v%s" .Chart.AppVersion) .Values.image.tag) }}
{{- else }}
{{- printf "%s/%s:%s" .Values.image.registry .Values.image.repository (default (printf "v%s" .Chart.AppVersion) .Values.image.tag) }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Allow the release namespace to be overridden for multi-namespace deployments in combined charts
*/}}
{{- define "prometheus-node-exporter.namespace" -}}
{{- if .Values.namespaceOverride }}
{{- .Values.namespaceOverride }}
{{- else }}
{{- .Release.Namespace }}
{{- end }}
{{- end }}

{{/*
Create the namespace name of the service monitor
*/}}
{{- define "prometheus-node-exporter.monitor-namespace" -}}
{{- if .Values.namespaceOverride }}
{{- .Values.namespaceOverride }}
{{- else }}
{{- if .Values.prometheus.monitor.namespace }}
{{- .Values.prometheus.monitor.namespace }}
{{- else }}
{{- .Release.Namespace }}
{{- end }}
{{- end }}
{{- end }}

{{/* Sets default scrape limits for servicemonitor */}}
{{- define "servicemonitor.scrapeLimits" -}}
{{- with .sampleLimit }}
sampleLimit: {{ . }}
{{- end }}
{{- with .targetLimit }}
targetLimit: {{ . }}
{{- end }}
{{- with .labelLimit }}
labelLimit: {{ . }}
{{- end }}
{{- with .labelNameLengthLimit }}
labelNameLengthLimit: {{ . }}
{{- end }}
{{- with .labelValueLengthLimit }}
labelValueLengthLimit: {{ . }}
{{- end }}
{{- end }}

{{/*
Formats imagePullSecrets. Input is (dict "Values" .Values "imagePullSecrets" .{specific imagePullSecrets})
*/}}
{{- define "prometheus-node-exporter.imagePullSecrets" -}}
{{- range (concat .Values.global.imagePullSecrets .imagePullSecrets) }}
  {{- if eq (typeOf .) "map[string]interface {}" }}
- {{ toYaml . | trim }}
  {{- else }}
- name: {{ . }}
  {{- end }}
{{- end }}
{{- end -}}

{{/*
Create the namespace name of the pod monitor
*/}}
{{- define "prometheus-node-exporter.podmonitor-namespace" -}}
{{- if .Values.namespaceOverride }}
{{- .Values.namespaceOverride }}
{{- else }}
{{- if .Values.prometheus.podMonitor.namespace }}
{{- .Values.prometheus.podMonitor.namespace }}
{{- else }}
{{- .Release.Namespace }}
{{- end }}
{{- end }}
{{- end }}

{{/* Sets default scrape limits for podmonitor */}}
{{- define "podmonitor.scrapeLimits" -}}
{{- with .sampleLimit }}
sampleLimit: {{ . }}
{{- end }}
{{- with .targetLimit }}
targetLimit: {{ . }}
{{- end }}
{{- with .labelLimit }}
labelLimit: {{ . }}
{{- end }}
{{- with .labelNameLengthLimit }}
labelNameLengthLimit: {{ . }}
{{- end }}
{{- with .labelValueLengthLimit }}
labelValueLengthLimit: {{ . }}
{{- end }}
{{- end }}

{{/* Sets sidecar volumeMounts */}}
{{- define "prometheus-node-exporter.sidecarVolumeMounts" -}}
{{- range $_, $mount := $.Values.sidecarVolumeMount }}
- name: {{ $mount.name }}
  mountPath: {{ $mount.mountPath }}
  readOnly: {{ $mount.readOnly }}
{{- end }}
{{- range $_, $mount := $.Values.sidecarHostVolumeMounts }}
- name: {{ $mount.name }}
  mountPath: {{ $mount.mountPath }}
  readOnly: {{ $mount.readOnly }}
{{- if $mount.mountPropagation }}
  mountPropagation: {{ $mount.mountPropagation }}
{{- end }}
{{- end }}
{{- end }}

{{/*
The default node affinity to exclude 
- AWS Fargate 
- Azure virtual nodes
*/}}
{{- define "prometheus-node-exporter.defaultAffinity" -}}
nodeAffinity:
  requiredDuringSchedulingIgnoredDuringExecution:
    nodeSelectorTerms:
    - matchExpressions:
      - key: eks.amazonaws.com/compute-type
        operator: NotIn
        values:
        - fargate
      - key: type
        operator: NotIn
        values:
        - virtual-kubelet
{{- end -}}
{{- define "prometheus-node-exporter.mergedAffinities" -}}
{{- $defaultAffinity := include "prometheus-node-exporter.defaultAffinity" . | fromYaml -}}
{{- with .Values.affinity -}}
  {{- if .nodeAffinity -}}
    {{- $_ := set $defaultAffinity "nodeAffinity" (mergeOverwrite $defaultAffinity.nodeAffinity .nodeAffinity) -}}
  {{- end -}}
  {{- if .podAffinity -}}
    {{- $_ := set $defaultAffinity "podAffinity" .podAffinity -}}
  {{- end -}}
  {{- if .podAntiAffinity -}}
    {{- $_ := set $defaultAffinity "podAntiAffinity" .podAntiAffinity -}}
  {{- end -}}
{{- end -}}
{{- toYaml $defaultAffinity -}}
{{- end -}}
