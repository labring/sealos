{{- define "grafana.pod" -}}
{{- $sts := list "sts" "StatefulSet" "statefulset" -}}
{{- $root := . -}}
{{- with .Values.schedulerName }}
schedulerName: "{{ . }}"
{{- end }}
serviceAccountName: {{ include "grafana.serviceAccountName" . }}
automountServiceAccountToken: {{ .Values.automountServiceAccountToken }}
shareProcessNamespace: {{ .Values.shareProcessNamespace }}
{{- with .Values.securityContext }}
securityContext:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.hostAliases }}
hostAliases:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- if .Values.dnsPolicy }}
dnsPolicy: {{ .Values.dnsPolicy }}
{{- end }}
{{- with .Values.dnsConfig }}
dnsConfig:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.priorityClassName }}
priorityClassName: {{ . }}
{{- end }}
{{- if ( or (and .Values.persistence.enabled .Values.initChownData.enabled) .Values.dashboards .Values.extraInitContainers (and .Values.sidecar.alerts.enabled .Values.sidecar.alerts.initAlerts) (and .Values.sidecar.datasources.enabled .Values.sidecar.datasources.initDatasources) (and .Values.sidecar.notifiers.enabled .Values.sidecar.notifiers.initNotifiers)) }}
initContainers:
{{- end }}
{{- if ( and .Values.persistence.enabled .Values.initChownData.enabled ) }}
  - name: init-chown-data
    {{- $registry := .Values.global.imageRegistry | default .Values.initChownData.image.registry -}}
    {{- if .Values.initChownData.image.sha }}
    image: "{{ $registry }}/{{ .Values.initChownData.image.repository }}:{{ .Values.initChownData.image.tag }}@sha256:{{ .Values.initChownData.image.sha }}"
    {{- else }}
    image: "{{ $registry }}/{{ .Values.initChownData.image.repository }}:{{ .Values.initChownData.image.tag }}"
    {{- end }}
    imagePullPolicy: {{ .Values.initChownData.image.pullPolicy }}
    {{- with .Values.initChownData.securityContext }}
    securityContext:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    command:
      - chown
      - -R
      - {{ .Values.securityContext.runAsUser }}:{{ .Values.securityContext.runAsGroup }}
      - /var/lib/grafana
    {{- with .Values.initChownData.resources }}
    resources:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    volumeMounts:
      - name: storage
        mountPath: "/var/lib/grafana"
        {{- with .Values.persistence.subPath }}
        subPath: {{ tpl . $root }}
        {{- end }}
{{- end }}
{{- if .Values.dashboards }}
  - name: download-dashboards
    {{- $registry := .Values.global.imageRegistry | default .Values.downloadDashboardsImage.registry -}}
    {{- if .Values.downloadDashboardsImage.sha }}
    image: "{{ $registry }}/{{ .Values.downloadDashboardsImage.repository }}:{{ .Values.downloadDashboardsImage.tag }}@sha256:{{ .Values.downloadDashboardsImage.sha }}"
    {{- else }}
    image: "{{ $registry }}/{{ .Values.downloadDashboardsImage.repository }}:{{ .Values.downloadDashboardsImage.tag }}"
    {{- end }}
    imagePullPolicy: {{ .Values.downloadDashboardsImage.pullPolicy }}
    command: ["/bin/sh"]
    args: [ "-c", "mkdir -p /var/lib/grafana/dashboards/default && /bin/sh -x /etc/grafana/download_dashboards.sh" ]
    {{- with .Values.downloadDashboards.resources }}
    resources:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    env:
      {{- range $key, $value := .Values.downloadDashboards.env }}
      - name: "{{ $key }}"
        value: "{{ $value }}"
      {{- end }}
      {{- range $key, $value := .Values.downloadDashboards.envValueFrom }}
      - name: {{ $key | quote }}
        valueFrom:
          {{- tpl (toYaml $value) $ | nindent 10 }}
      {{- end }}
    {{- with .Values.downloadDashboards.securityContext }}
    securityContext:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.downloadDashboards.envFromSecret }}
    envFrom:
      - secretRef:
          name: {{ tpl . $root }}
    {{- end }}
    volumeMounts:
      - name: config
        mountPath: "/etc/grafana/download_dashboards.sh"
        subPath: download_dashboards.sh
      - name: storage
        mountPath: "/var/lib/grafana"
        {{- with .Values.persistence.subPath }}
        subPath: {{ tpl . $root }}
        {{- end }}
      {{- range .Values.extraSecretMounts }}
      - name: {{ .name }}
        mountPath: {{ .mountPath }}
        readOnly: {{ .readOnly }}
      {{- end }}
{{- end }}
{{- if and .Values.sidecar.alerts.enabled .Values.sidecar.alerts.initAlerts }}
  - name: {{ include "grafana.name" . }}-init-sc-alerts
    {{- $registry := .Values.global.imageRegistry | default .Values.sidecar.image.registry -}}
    {{- if .Values.sidecar.image.sha }}
    image: "{{ $registry }}/{{ .Values.sidecar.image.repository }}:{{ .Values.sidecar.image.tag }}@sha256:{{ .Values.sidecar.image.sha }}"
    {{- else }}
    image: "{{ $registry }}/{{ .Values.sidecar.image.repository }}:{{ .Values.sidecar.image.tag }}"
    {{- end }}
    imagePullPolicy: {{ .Values.sidecar.imagePullPolicy }}
    env:
      {{- range $key, $value := .Values.sidecar.alerts.env }}
      - name: "{{ $key }}"
        value: "{{ $value }}"
      {{- end }}
      {{- range $key, $value := .Values.sidecar.alerts.envValueFrom }}
      - name: {{ $key | quote }}
        valueFrom:
          {{- tpl (toYaml $value) $ | nindent 10 }}
      {{- end }}
      {{- if .Values.sidecar.alerts.ignoreAlreadyProcessed }}
      - name: IGNORE_ALREADY_PROCESSED
        value: "true"
      {{- end }}
      - name: METHOD
        value: "LIST"
      - name: LABEL
        value: "{{ tpl .Values.sidecar.alerts.label $root }}"
      {{- with .Values.sidecar.alerts.labelValue }}
      - name: LABEL_VALUE
        value: {{ quote (tpl . $root) }}
      {{- end }}
      {{- if or .Values.sidecar.logLevel .Values.sidecar.alerts.logLevel }}
      - name: LOG_LEVEL
        value: {{ default .Values.sidecar.logLevel .Values.sidecar.alerts.logLevel }}
      {{- end }}
      - name: FOLDER
        value: "/etc/grafana/provisioning/alerting"
      - name: RESOURCE
        value: {{ quote .Values.sidecar.alerts.resource }}
      {{- with .Values.sidecar.enableUniqueFilenames }}
      - name: UNIQUE_FILENAMES
        value: "{{ . }}"
      {{- end }}
      {{- with .Values.sidecar.alerts.searchNamespace }}
      - name: NAMESPACE
        value: {{ . | join "," | quote }}
      {{- end }}
      {{- with .Values.sidecar.alerts.skipTlsVerify }}
      - name: SKIP_TLS_VERIFY
        value: {{ quote . }}
      {{- end }}
      {{- with .Values.sidecar.alerts.script }}
      - name: SCRIPT
        value: {{ quote . }}
      {{- end }}
    {{- with .Values.sidecar.livenessProbe }}
    livenessProbe:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.readinessProbe }}
    readinessProbe:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.resources }}
    resources:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.securityContext }}
    securityContext:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    volumeMounts:
      - name: sc-alerts-volume
        mountPath: "/etc/grafana/provisioning/alerting"
      {{- with .Values.sidecar.alerts.extraMounts }}
      {{- toYaml . | trim | nindent 6 }}
      {{- end }}
{{- end }}
{{- if and .Values.sidecar.datasources.enabled .Values.sidecar.datasources.initDatasources }}
  - name: {{ include "grafana.name" . }}-init-sc-datasources
    {{- $registry := .Values.global.imageRegistry | default .Values.sidecar.image.registry -}}
    {{- if .Values.sidecar.image.sha }}
    image: "{{ $registry }}/{{ .Values.sidecar.image.repository }}:{{ .Values.sidecar.image.tag }}@sha256:{{ .Values.sidecar.image.sha }}"
    {{- else }}
    image: "{{ $registry }}/{{ .Values.sidecar.image.repository }}:{{ .Values.sidecar.image.tag }}"
    {{- end }}
    imagePullPolicy: {{ .Values.sidecar.imagePullPolicy }}
    env:
      {{- range $key, $value := .Values.sidecar.datasources.env }}
      - name: "{{ $key }}"
        value: "{{ $value }}"
      {{- end }}
      {{- range $key, $value := .Values.sidecar.datasources.envValueFrom }}
      - name: {{ $key | quote }}
        valueFrom:
          {{- tpl (toYaml $value) $ | nindent 10 }}
      {{- end }}
      {{- if .Values.sidecar.datasources.ignoreAlreadyProcessed }}
      - name: IGNORE_ALREADY_PROCESSED
        value: "true"
      {{- end }}
      - name: METHOD
        value: "LIST"
      - name: LABEL
        value: "{{ tpl .Values.sidecar.datasources.label $root }}"
      {{- with .Values.sidecar.datasources.labelValue }}
      - name: LABEL_VALUE
        value: {{ quote (tpl . $root) }}
      {{- end }}
      {{- if or .Values.sidecar.logLevel .Values.sidecar.datasources.logLevel }}
      - name: LOG_LEVEL
        value: {{ default .Values.sidecar.logLevel .Values.sidecar.datasources.logLevel }}
      {{- end }}
      - name: FOLDER
        value: "/etc/grafana/provisioning/datasources"
      - name: RESOURCE
        value: {{ quote .Values.sidecar.datasources.resource }}
      {{- with .Values.sidecar.enableUniqueFilenames }}
      - name: UNIQUE_FILENAMES
        value: "{{ . }}"
      {{- end }}
      {{- if .Values.sidecar.datasources.searchNamespace }}
      - name: NAMESPACE
        value: "{{ tpl (.Values.sidecar.datasources.searchNamespace | join ",") . }}"
      {{- end }}
      {{- with .Values.sidecar.skipTlsVerify }}
      - name: SKIP_TLS_VERIFY
        value: "{{ . }}"
      {{- end }}
      {{- with .Values.sidecar.datasources.script }}
      - name: SCRIPT
        value: {{ quote . }}
      {{- end }}
    {{- with .Values.sidecar.resources }}
    resources:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.securityContext }}
    securityContext:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    volumeMounts:
      - name: sc-datasources-volume
        mountPath: "/etc/grafana/provisioning/datasources"
      {{- with .Values.sidecar.datasources.extraMounts }}
      {{- toYaml . | trim | nindent 6 }}
      {{- end }}
{{- end }}
{{- if and .Values.sidecar.notifiers.enabled .Values.sidecar.notifiers.initNotifiers }}
  - name: {{ include "grafana.name" . }}-init-sc-notifiers
    {{- $registry := .Values.global.imageRegistry | default .Values.sidecar.image.registry -}}
    {{- if .Values.sidecar.image.sha }}
    image: "{{ $registry }}/{{ .Values.sidecar.image.repository }}:{{ .Values.sidecar.image.tag }}@sha256:{{ .Values.sidecar.image.sha }}"
    {{- else }}
    image: "{{ $registry }}/{{ .Values.sidecar.image.repository }}:{{ .Values.sidecar.image.tag }}"
    {{- end }}
    imagePullPolicy: {{ .Values.sidecar.imagePullPolicy }}
    env:
      {{- range $key, $value := .Values.sidecar.notifiers.env }}
      - name: "{{ $key }}"
        value: "{{ $value }}"
      {{- end }}
      {{- if .Values.sidecar.notifiers.ignoreAlreadyProcessed }}
      - name: IGNORE_ALREADY_PROCESSED
        value: "true"
      {{- end }}
      - name: METHOD
        value: LIST
      - name: LABEL
        value: "{{ tpl .Values.sidecar.notifiers.label $root }}"
      {{- with .Values.sidecar.notifiers.labelValue }}
      - name: LABEL_VALUE
        value: {{ quote (tpl . $root) }}
      {{- end }}
      {{- if or .Values.sidecar.logLevel .Values.sidecar.notifiers.logLevel }}
      - name: LOG_LEVEL
        value: {{ default .Values.sidecar.logLevel .Values.sidecar.notifiers.logLevel }}
      {{- end }}
      - name: FOLDER
        value: "/etc/grafana/provisioning/notifiers"
      - name: RESOURCE
        value: {{ quote .Values.sidecar.notifiers.resource }}
      {{- with .Values.sidecar.enableUniqueFilenames }}
      - name: UNIQUE_FILENAMES
        value: "{{ . }}"
      {{- end }}
      {{- with .Values.sidecar.notifiers.searchNamespace }}
      - name: NAMESPACE
        value: "{{ tpl (. | join ",") $root }}"
      {{- end }}
      {{- with .Values.sidecar.skipTlsVerify }}
      - name: SKIP_TLS_VERIFY
        value: "{{ . }}"
      {{- end }}
      {{- with .Values.sidecar.notifiers.script }}
      - name: SCRIPT
        value: {{ quote . }}
      {{- end }}
    {{- with .Values.sidecar.livenessProbe }}
    livenessProbe:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.readinessProbe }}
    readinessProbe:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.resources }}
    resources:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.securityContext }}
    securityContext:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    volumeMounts:
      - name: sc-notifiers-volume
        mountPath: "/etc/grafana/provisioning/notifiers"
      {{- with .Values.sidecar.notifiers.extraMounts }}
      {{- toYaml . | trim | nindent 6 }}
      {{- end }}
{{- end}}
{{- with .Values.extraInitContainers }}
  {{- tpl (toYaml .) $root | nindent 2 }}
{{- end }}
{{- if or .Values.image.pullSecrets .Values.global.imagePullSecrets }}
imagePullSecrets:
  {{- include "grafana.imagePullSecrets" (dict "root" $root "imagePullSecrets" .Values.image.pullSecrets) | nindent 2 }}
{{- end }}
{{- if not .Values.enableKubeBackwardCompatibility }}
enableServiceLinks: {{ .Values.enableServiceLinks }}
{{- end }}
containers:
{{- if and .Values.sidecar.alerts.enabled (not .Values.sidecar.alerts.initAlerts) }}
  - name: {{ include "grafana.name" . }}-sc-alerts
    {{- $registry := .Values.global.imageRegistry | default .Values.sidecar.image.registry -}}
    {{- if .Values.sidecar.image.sha }}
    image: "{{ $registry }}/{{ .Values.sidecar.image.repository }}:{{ .Values.sidecar.image.tag }}@sha256:{{ .Values.sidecar.image.sha }}"
    {{- else }}
    image: "{{ $registry }}/{{ .Values.sidecar.image.repository }}:{{ .Values.sidecar.image.tag }}"
    {{- end }}
    imagePullPolicy: {{ .Values.sidecar.imagePullPolicy }}
    env:
      {{- range $key, $value := .Values.sidecar.alerts.env }}
      - name: "{{ $key }}"
        value: "{{ $value }}"
      {{- end }}
      {{- if .Values.sidecar.alerts.ignoreAlreadyProcessed }}
      - name: IGNORE_ALREADY_PROCESSED
        value: "true"
      {{- end }}
      - name: METHOD
        value: {{ .Values.sidecar.alerts.watchMethod }}
      - name: LABEL
        value: "{{ tpl .Values.sidecar.alerts.label $root }}"
      {{- with .Values.sidecar.alerts.labelValue }}
      - name: LABEL_VALUE
        value: {{ quote (tpl . $root) }}
      {{- end }}
      {{- if or .Values.sidecar.logLevel .Values.sidecar.alerts.logLevel }}
      - name: LOG_LEVEL
        value: {{ default .Values.sidecar.logLevel .Values.sidecar.alerts.logLevel }}
      {{- end }}
      - name: FOLDER
        value: "/etc/grafana/provisioning/alerting"
      - name: RESOURCE
        value: {{ quote .Values.sidecar.alerts.resource }}
      {{- if .Values.sidecar.alerts.resourceName }}
      - name: RESOURCE_NAME
        value: {{ quote .Values.sidecar.alerts.resourceName }}
      {{- end }}
      {{- with .Values.sidecar.enableUniqueFilenames }}
      - name: UNIQUE_FILENAMES
        value: "{{ . }}"
      {{- end }}
      {{- with .Values.sidecar.alerts.searchNamespace }}
      - name: NAMESPACE
        value: {{ . | join "," | quote }}
      {{- end }}
      {{- with .Values.sidecar.alerts.skipTlsVerify }}
      - name: SKIP_TLS_VERIFY
        value: {{ quote . }}
      {{- end }}
      {{- with .Values.sidecar.alerts.script }}
      - name: SCRIPT
        value: {{ quote . }}
      {{- end }}
      {{- if and (not .Values.env.GF_SECURITY_ADMIN_USER) (not .Values.env.GF_SECURITY_DISABLE_INITIAL_ADMIN_CREATION) }}
      - name: REQ_USERNAME
        valueFrom:
          secretKeyRef:
            name: {{ (tpl .Values.admin.existingSecret .) | default (include "grafana.fullname" .) }}
            key: {{ .Values.admin.userKey | default "admin-user" }}
      {{- end }}
      {{- if and (not .Values.env.GF_SECURITY_ADMIN_PASSWORD) (not .Values.env.GF_SECURITY_ADMIN_PASSWORD__FILE) (not .Values.env.GF_SECURITY_DISABLE_INITIAL_ADMIN_CREATION) }}
      - name: REQ_PASSWORD
        valueFrom:
          secretKeyRef:
            name: {{ (tpl .Values.admin.existingSecret .) | default (include "grafana.fullname" .) }}
            key: {{ .Values.admin.passwordKey | default "admin-password" }}
      {{- end }}
      {{- if not .Values.sidecar.alerts.skipReload }}
      - name: REQ_URL
        value: {{ .Values.sidecar.alerts.reloadURL }}
      - name: REQ_METHOD
        value: POST
      {{- end }}
      {{- if .Values.sidecar.alerts.watchServerTimeout }}
      {{- if ne .Values.sidecar.alerts.watchMethod "WATCH" }}
        {{- fail (printf "Cannot use .Values.sidecar.alerts.watchServerTimeout with .Values.sidecar.alerts.watchMethod %s" .Values.sidecar.alerts.watchMethod) }}
      {{- end }}
      - name: WATCH_SERVER_TIMEOUT
        value: "{{ .Values.sidecar.alerts.watchServerTimeout }}"
      {{- end }}
      {{- if .Values.sidecar.alerts.watchClientTimeout }}
      {{- if ne .Values.sidecar.alerts.watchMethod "WATCH" }}
        {{- fail (printf "Cannot use .Values.sidecar.alerts.watchClientTimeout with .Values.sidecar.alerts.watchMethod %s" .Values.sidecar.alerts.watchMethod) }}
      {{- end }}
      - name: WATCH_CLIENT_TIMEOUT
        value: "{{ .Values.sidecar.alerts.watchClientTimeout }}"
      {{- end }}
      {{- if .Values.sidecar.alerts.maxTotalRetries }}
      - name: REQ_RETRY_TOTAL
        value: "{{ .Values.sidecar.alerts.maxTotalRetries }}"
      {{- end }}
      {{- if .Values.sidecar.alerts.maxConnectRetries }}
      - name: REQ_RETRY_CONNECT
        value: "{{ .Values.sidecar.alerts.maxConnectRetries }}"
      {{- end }}
      {{- if .Values.sidecar.alerts.maxReadRetries }}
      - name: REQ_RETRY_READ
        value: "{{ .Values.sidecar.alerts.maxReadRetries }}"
      {{- end }}
    {{- with .Values.sidecar.livenessProbe }}
    livenessProbe:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.readinessProbe }}
    readinessProbe:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.resources }}
    resources:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.securityContext }}
    securityContext:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    volumeMounts:
      - name: sc-alerts-volume
        mountPath: "/etc/grafana/provisioning/alerting"
      {{- with .Values.sidecar.alerts.extraMounts }}
      {{- toYaml . | trim | nindent 6 }}
      {{- end }}
{{- end}}
{{- if .Values.sidecar.dashboards.enabled }}
  - name: {{ include "grafana.name" . }}-sc-dashboard
    {{- $registry := .Values.global.imageRegistry | default .Values.sidecar.image.registry -}}
    {{- if .Values.sidecar.image.sha }}
    image: "{{ $registry }}/{{ .Values.sidecar.image.repository }}:{{ .Values.sidecar.image.tag }}@sha256:{{ .Values.sidecar.image.sha }}"
    {{- else }}
    image: "{{ $registry }}/{{ .Values.sidecar.image.repository }}:{{ .Values.sidecar.image.tag }}"
    {{- end }}
    imagePullPolicy: {{ .Values.sidecar.imagePullPolicy }}
    env:
      {{- range $key, $value := .Values.sidecar.dashboards.env }}
      - name: "{{ $key }}"
        value: "{{ $value }}"
      {{- end }}
      {{- range $key, $value := .Values.sidecar.dashboards.envValueFrom }}
      - name: {{ $key | quote }}
        valueFrom:
          {{- tpl (toYaml $value) $ | nindent 10 }}
      {{- end }}
      {{- if .Values.sidecar.dashboards.ignoreAlreadyProcessed }}
      - name: IGNORE_ALREADY_PROCESSED
        value: "true"
      {{- end }}
      - name: METHOD
        value: {{ .Values.sidecar.dashboards.watchMethod }}
      - name: LABEL
        value: "{{ tpl .Values.sidecar.dashboards.label $root }}"
      {{- with .Values.sidecar.dashboards.labelValue }}
      - name: LABEL_VALUE
        value: {{ quote (tpl . $root) }}
      {{- end }}
      {{- if or .Values.sidecar.logLevel .Values.sidecar.dashboards.logLevel }}
      - name: LOG_LEVEL
        value: {{ default .Values.sidecar.logLevel .Values.sidecar.dashboards.logLevel }}
      {{- end }}
      - name: FOLDER
        value: "{{ .Values.sidecar.dashboards.folder }}{{- with .Values.sidecar.dashboards.defaultFolderName }}/{{ . }}{{- end }}"
      - name: RESOURCE
        value: {{ quote .Values.sidecar.dashboards.resource }}
      {{- if .Values.sidecar.dashboards.resourceName }}
      - name: RESOURCE_NAME
        value: {{ quote .Values.sidecar.dashboards.resourceName }}
      {{- end }}
      {{- with .Values.sidecar.enableUniqueFilenames }}
      - name: UNIQUE_FILENAMES
        value: "{{ . }}"
      {{- end }}
      {{- with .Values.sidecar.dashboards.searchNamespace }}
      - name: NAMESPACE
        value: "{{ tpl (. | join ",") $root }}"
      {{- end }}
      {{- with .Values.sidecar.skipTlsVerify }}
      - name: SKIP_TLS_VERIFY
        value: "{{ . }}"
      {{- end }}
      {{- with .Values.sidecar.dashboards.folderAnnotation }}
      - name: FOLDER_ANNOTATION
        value: "{{ . }}"
      {{- end }}
      {{- with .Values.sidecar.dashboards.script }}
      - name: SCRIPT
        value: {{ quote . }}
      {{- end }}
      {{- if not .Values.sidecar.dashboards.skipReload }}
      {{- if and (not .Values.env.GF_SECURITY_ADMIN_USER) (not .Values.env.GF_SECURITY_DISABLE_INITIAL_ADMIN_CREATION) }}
      - name: REQ_USERNAME
        valueFrom:
          secretKeyRef:
            name: {{ (tpl .Values.admin.existingSecret .) | default (include "grafana.fullname" .) }}
            key: {{ .Values.admin.userKey | default "admin-user" }}
      {{- end }}
      {{- if and (not .Values.env.GF_SECURITY_ADMIN_PASSWORD) (not .Values.env.GF_SECURITY_ADMIN_PASSWORD__FILE) (not .Values.env.GF_SECURITY_DISABLE_INITIAL_ADMIN_CREATION) }}
      - name: REQ_PASSWORD
        valueFrom:
          secretKeyRef:
            name: {{ (tpl .Values.admin.existingSecret .) | default (include "grafana.fullname" .) }}
            key: {{ .Values.admin.passwordKey | default "admin-password" }}
      {{- end }}
      - name: REQ_URL
        value: {{ .Values.sidecar.dashboards.reloadURL }}
      - name: REQ_METHOD
        value: POST
      {{- end }}
      {{- if .Values.sidecar.dashboards.watchServerTimeout }}
      {{- if ne .Values.sidecar.dashboards.watchMethod "WATCH" }}
        {{- fail (printf "Cannot use .Values.sidecar.dashboards.watchServerTimeout with .Values.sidecar.dashboards.watchMethod %s" .Values.sidecar.dashboards.watchMethod) }}
      {{- end }}
      - name: WATCH_SERVER_TIMEOUT
        value: "{{ .Values.sidecar.dashboards.watchServerTimeout }}"
      {{- end }}
      {{- if .Values.sidecar.dashboards.watchClientTimeout }}
      {{- if ne .Values.sidecar.dashboards.watchMethod "WATCH" }}
        {{- fail (printf "Cannot use .Values.sidecar.dashboards.watchClientTimeout with .Values.sidecar.dashboards.watchMethod %s" .Values.sidecar.dashboards.watchMethod) }}
      {{- end }}
      - name: WATCH_CLIENT_TIMEOUT
        value: {{ .Values.sidecar.dashboards.watchClientTimeout | quote }}
      {{- end }}
      {{- if .Values.sidecar.dashboards.maxTotalRetries }}
      - name: REQ_RETRY_TOTAL
        value: "{{ .Values.sidecar.dashboards.maxTotalRetries }}"
      {{- end }}
      {{- if .Values.sidecar.dashboards.maxConnectRetries }}
      - name: REQ_RETRY_CONNECT
        value: "{{ .Values.sidecar.dashboards.maxConnectRetries }}"
      {{- end }}
      {{- if .Values.sidecar.dashboards.maxReadRetries }}
      - name: REQ_RETRY_READ
        value: "{{ .Values.sidecar.dashboards.maxReadRetries }}"
      {{- end }}
    {{- with .Values.sidecar.livenessProbe }}
    livenessProbe:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.readinessProbe }}
    readinessProbe:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.resources }}
    resources:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.securityContext }}
    securityContext:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    volumeMounts:
      - name: sc-dashboard-volume
        mountPath: {{ .Values.sidecar.dashboards.folder | quote }}
      {{- with .Values.sidecar.dashboards.extraMounts }}
      {{- toYaml . | trim | nindent 6 }}
      {{- end }}
{{- end}}
{{- if and .Values.sidecar.datasources.enabled (not .Values.sidecar.datasources.initDatasources) }}
  - name: {{ include "grafana.name" . }}-sc-datasources
    {{- $registry := .Values.global.imageRegistry | default .Values.sidecar.image.registry -}}
    {{- if .Values.sidecar.image.sha }}
    image: "{{ $registry }}/{{ .Values.sidecar.image.repository }}:{{ .Values.sidecar.image.tag }}@sha256:{{ .Values.sidecar.image.sha }}"
    {{- else }}
    image: "{{ $registry }}/{{ .Values.sidecar.image.repository }}:{{ .Values.sidecar.image.tag }}"
    {{- end }}
    imagePullPolicy: {{ .Values.sidecar.imagePullPolicy }}
    env:
      {{- range $key, $value := .Values.sidecar.datasources.env }}
      - name: "{{ $key }}"
        value: "{{ $value }}"
      {{- end }}
      {{- range $key, $value := .Values.sidecar.datasources.envValueFrom }}
      - name: {{ $key | quote }}
        valueFrom:
          {{- tpl (toYaml $value) $ | nindent 10 }}
      {{- end }}
      {{- if .Values.sidecar.datasources.ignoreAlreadyProcessed }}
      - name: IGNORE_ALREADY_PROCESSED
        value: "true"
      {{- end }}
      - name: METHOD
        value: {{ .Values.sidecar.datasources.watchMethod }}
      - name: LABEL
        value: "{{ tpl .Values.sidecar.datasources.label $root }}"
      {{- with .Values.sidecar.datasources.labelValue }}
      - name: LABEL_VALUE
        value: {{ quote (tpl . $root) }}
      {{- end }}
      {{- if or .Values.sidecar.logLevel .Values.sidecar.datasources.logLevel }}
      - name: LOG_LEVEL
        value: {{ default .Values.sidecar.logLevel .Values.sidecar.datasources.logLevel }}
      {{- end }}
      - name: FOLDER
        value: "/etc/grafana/provisioning/datasources"
      - name: RESOURCE
        value: {{ quote .Values.sidecar.datasources.resource }}
      {{- if .Values.sidecar.datasources.resourceName }}
      - name: RESOURCE_NAME
        value: {{ quote .Values.sidecar.datasources.resourceName }}
      {{- end }}
      {{- with .Values.sidecar.enableUniqueFilenames }}
      - name: UNIQUE_FILENAMES
        value: "{{ . }}"
      {{- end }}
      {{- with .Values.sidecar.datasources.searchNamespace }}
      - name: NAMESPACE
        value: "{{ tpl (. | join ",") $root }}"
      {{- end }}
      {{- if .Values.sidecar.skipTlsVerify }}
      - name: SKIP_TLS_VERIFY
        value: "{{ .Values.sidecar.skipTlsVerify }}"
      {{- end }}
      {{- with .Values.sidecar.datasources.script }}
      - name: SCRIPT
        value: {{ quote . }}
      {{- end }}
      {{- if and (not .Values.env.GF_SECURITY_ADMIN_USER) (not .Values.env.GF_SECURITY_DISABLE_INITIAL_ADMIN_CREATION) }}
      - name: REQ_USERNAME
        valueFrom:
          secretKeyRef:
            name: {{ (tpl .Values.admin.existingSecret .) | default (include "grafana.fullname" .) }}
            key: {{ .Values.admin.userKey | default "admin-user" }}
      {{- end }}
      {{- if and (not .Values.env.GF_SECURITY_ADMIN_PASSWORD) (not .Values.env.GF_SECURITY_ADMIN_PASSWORD__FILE) (not .Values.env.GF_SECURITY_DISABLE_INITIAL_ADMIN_CREATION) }}
      - name: REQ_PASSWORD
        valueFrom:
          secretKeyRef:
            name: {{ (tpl .Values.admin.existingSecret .) | default (include "grafana.fullname" .) }}
            key: {{ .Values.admin.passwordKey | default "admin-password" }}
      {{- end }}
      {{- if not .Values.sidecar.datasources.skipReload }}
      - name: REQ_URL
        value: {{ .Values.sidecar.datasources.reloadURL }}
      - name: REQ_METHOD
        value: POST
      {{- end }}
      {{- if .Values.sidecar.datasources.watchServerTimeout }}
      {{- if ne .Values.sidecar.datasources.watchMethod "WATCH" }}
        {{- fail (printf "Cannot use .Values.sidecar.datasources.watchServerTimeout with .Values.sidecar.datasources.watchMethod %s" .Values.sidecar.datasources.watchMethod) }}
      {{- end }}
      - name: WATCH_SERVER_TIMEOUT
        value: "{{ .Values.sidecar.datasources.watchServerTimeout }}"
      {{- end }}
      {{- if .Values.sidecar.datasources.watchClientTimeout }}
      {{- if ne .Values.sidecar.datasources.watchMethod "WATCH" }}
        {{- fail (printf "Cannot use .Values.sidecar.datasources.watchClientTimeout with .Values.sidecar.datasources.watchMethod %s" .Values.sidecar.datasources.watchMethod) }}
      {{- end }}
      - name: WATCH_CLIENT_TIMEOUT
        value: "{{ .Values.sidecar.datasources.watchClientTimeout }}"
      {{- end }}
      {{- if .Values.sidecar.datasources.maxTotalRetries }}
      - name: REQ_RETRY_TOTAL
        value: "{{ .Values.sidecar.datasources.maxTotalRetries }}"
      {{- end }}
      {{- if .Values.sidecar.datasources.maxConnectRetries }}
      - name: REQ_RETRY_CONNECT
        value: "{{ .Values.sidecar.datasources.maxConnectRetries }}"
      {{- end }}
      {{- if .Values.sidecar.datasources.maxReadRetries }}
      - name: REQ_RETRY_READ
        value: "{{ .Values.sidecar.datasources.maxReadRetries }}"
      {{- end }}
    {{- with .Values.sidecar.livenessProbe }}
    livenessProbe:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.readinessProbe }}
    readinessProbe:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.resources }}
    resources:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.securityContext }}
    securityContext:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    volumeMounts:
      - name: sc-datasources-volume
        mountPath: "/etc/grafana/provisioning/datasources"
      {{- with .Values.sidecar.datasources.extraMounts }}
      {{- toYaml . | trim | nindent 6 }}
      {{- end }}
{{- end}}
{{- if .Values.sidecar.notifiers.enabled }}
  - name: {{ include "grafana.name" . }}-sc-notifiers
    {{- $registry := .Values.global.imageRegistry | default .Values.sidecar.image.registry -}}
    {{- if .Values.sidecar.image.sha }}
    image: "{{ $registry }}/{{ .Values.sidecar.image.repository }}:{{ .Values.sidecar.image.tag }}@sha256:{{ .Values.sidecar.image.sha }}"
    {{- else }}
    image: "{{ $registry }}/{{ .Values.sidecar.image.repository }}:{{ .Values.sidecar.image.tag }}"
    {{- end }}
    imagePullPolicy: {{ .Values.sidecar.imagePullPolicy }}
    env:
      {{- range $key, $value := .Values.sidecar.notifiers.env }}
      - name: "{{ $key }}"
        value: "{{ $value }}"
      {{- end }}
      {{- if .Values.sidecar.notifiers.ignoreAlreadyProcessed }}
      - name: IGNORE_ALREADY_PROCESSED
        value: "true"
      {{- end }}
      - name: METHOD
        value: {{ .Values.sidecar.notifiers.watchMethod }}
      - name: LABEL
        value: "{{ tpl .Values.sidecar.notifiers.label $root }}"
      {{- with .Values.sidecar.notifiers.labelValue }}
      - name: LABEL_VALUE
        value: {{ quote (tpl . $root) }}
      {{- end }}
      {{- if or .Values.sidecar.logLevel .Values.sidecar.notifiers.logLevel }}
      - name: LOG_LEVEL
        value: {{ default .Values.sidecar.logLevel .Values.sidecar.notifiers.logLevel }}
      {{- end }}
      - name: FOLDER
        value: "/etc/grafana/provisioning/notifiers"
      - name: RESOURCE
        value: {{ quote .Values.sidecar.notifiers.resource }}
      {{- if .Values.sidecar.notifiers.resourceName }}
      - name: RESOURCE_NAME
        value: {{ quote .Values.sidecar.notifiers.resourceName }}
      {{- end }}
      {{- if .Values.sidecar.enableUniqueFilenames }}
      - name: UNIQUE_FILENAMES
        value: "{{ .Values.sidecar.enableUniqueFilenames }}"
      {{- end }}
      {{- with .Values.sidecar.notifiers.searchNamespace }}
      - name: NAMESPACE
        value: "{{ tpl (. | join ",") $root }}"
      {{- end }}
      {{- with .Values.sidecar.skipTlsVerify }}
      - name: SKIP_TLS_VERIFY
        value: "{{ . }}"
      {{- end }}
      {{- with .Values.sidecar.notifiers.script }}
      - name: SCRIPT
        value: {{ quote . }}
      {{- end }}
      {{- if and (not .Values.env.GF_SECURITY_ADMIN_USER) (not .Values.env.GF_SECURITY_DISABLE_INITIAL_ADMIN_CREATION) }}
      - name: REQ_USERNAME
        valueFrom:
          secretKeyRef:
            name: {{ (tpl .Values.admin.existingSecret .) | default (include "grafana.fullname" .) }}
            key: {{ .Values.admin.userKey | default "admin-user" }}
      {{- end }}
      {{- if and (not .Values.env.GF_SECURITY_ADMIN_PASSWORD) (not .Values.env.GF_SECURITY_ADMIN_PASSWORD__FILE) (not .Values.env.GF_SECURITY_DISABLE_INITIAL_ADMIN_CREATION) }}
      - name: REQ_PASSWORD
        valueFrom:
          secretKeyRef:
            name: {{ (tpl .Values.admin.existingSecret .) | default (include "grafana.fullname" .) }}
            key: {{ .Values.admin.passwordKey | default "admin-password" }}
      {{- end }}
      {{- if not .Values.sidecar.notifiers.skipReload }}
      - name: REQ_URL
        value: {{ .Values.sidecar.notifiers.reloadURL }}
      - name: REQ_METHOD
        value: POST
      {{- end }}
      {{- if .Values.sidecar.notifiers.watchServerTimeout }}
      {{- if ne .Values.sidecar.notifiers.watchMethod "WATCH" }}
        {{- fail (printf "Cannot use .Values.sidecar.notifiers.watchServerTimeout with .Values.sidecar.notifiers.watchMethod %s" .Values.sidecar.notifiers.watchMethod) }}
      {{- end }}
      - name: WATCH_SERVER_TIMEOUT
        value: "{{ .Values.sidecar.notifiers.watchServerTimeout }}"
      {{- end }}
      {{- if .Values.sidecar.notifiers.watchClientTimeout }}
      {{- if ne .Values.sidecar.notifiers.watchMethod "WATCH" }}
        {{- fail (printf "Cannot use .Values.sidecar.notifiers.watchClientTimeout with .Values.sidecar.notifiers.watchMethod %s" .Values.sidecar.notifiers.watchMethod) }}
      {{- end }}
      - name: WATCH_CLIENT_TIMEOUT
        value: "{{ .Values.sidecar.notifiers.watchClientTimeout }}"
      {{- end }}
      {{- if .Values.sidecar.notifiers.maxTotalRetries }}
      - name: REQ_RETRY_TOTAL
        value: "{{ .Values.sidecar.notifiers.maxTotalRetries }}"
      {{- end }}
      {{- if .Values.sidecar.notifiers.maxConnectRetries }}
      - name: REQ_RETRY_CONNECT
        value: "{{ .Values.sidecar.notifiers.maxConnectRetries }}"
      {{- end }}
      {{- if .Values.sidecar.notifiers.maxReadRetries }}
      - name: REQ_RETRY_READ
        value: "{{ .Values.sidecar.notifiers.maxReadRetries }}"
      {{- end }}
    {{- with .Values.sidecar.livenessProbe }}
    livenessProbe:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.readinessProbe }}
    readinessProbe:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.resources }}
    resources:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.securityContext }}
    securityContext:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    volumeMounts:
      - name: sc-notifiers-volume
        mountPath: "/etc/grafana/provisioning/notifiers"
      {{- with .Values.sidecar.notifiers.extraMounts }}
      {{- toYaml . | trim | nindent 6 }}
      {{- end }}
{{- end}}
{{- if .Values.sidecar.plugins.enabled }}
  - name: {{ include "grafana.name" . }}-sc-plugins
    {{- $registry := .Values.global.imageRegistry | default .Values.sidecar.image.registry -}}
    {{- if .Values.sidecar.image.sha }}
    image: "{{ $registry }}/{{ .Values.sidecar.image.repository }}:{{ .Values.sidecar.image.tag }}@sha256:{{ .Values.sidecar.image.sha }}"
    {{- else }}
    image: "{{ $registry }}/{{ .Values.sidecar.image.repository }}:{{ .Values.sidecar.image.tag }}"
    {{- end }}
    imagePullPolicy: {{ .Values.sidecar.imagePullPolicy }}
    env:
      {{- range $key, $value := .Values.sidecar.plugins.env }}
      - name: "{{ $key }}"
        value: "{{ $value }}"
      {{- end }}
      {{- if .Values.sidecar.plugins.ignoreAlreadyProcessed }}
      - name: IGNORE_ALREADY_PROCESSED
        value: "true"
      {{- end }}
      - name: METHOD
        value: {{ .Values.sidecar.plugins.watchMethod }}
      - name: LABEL
        value: "{{ tpl .Values.sidecar.plugins.label $root }}"
      {{- if .Values.sidecar.plugins.labelValue }}
      - name: LABEL_VALUE
        value: {{ quote (tpl .Values.sidecar.plugins.labelValue $) }}
      {{- end }}
      {{- if or .Values.sidecar.logLevel .Values.sidecar.plugins.logLevel }}
      - name: LOG_LEVEL
        value: {{ default .Values.sidecar.logLevel .Values.sidecar.plugins.logLevel }}
      {{- end }}
      - name: FOLDER
        value: "/etc/grafana/provisioning/plugins"
      - name: RESOURCE
        value: {{ quote .Values.sidecar.plugins.resource }}
      {{- if .Values.sidecar.plugins.resourceName }}
      - name: RESOURCE_NAME
        value: {{ quote .Values.sidecar.plugins.resourceName }}
      {{- end }}
      {{- with .Values.sidecar.enableUniqueFilenames }}
      - name: UNIQUE_FILENAMES
        value: "{{ . }}"
      {{- end }}
      {{- with .Values.sidecar.plugins.searchNamespace }}
      - name: NAMESPACE
        value: "{{ tpl (. | join ",") $root }}"
      {{- end }}
      {{- with .Values.sidecar.plugins.script }}
      - name: SCRIPT
        value: {{ quote . }}
      {{- end }}
      {{- with .Values.sidecar.skipTlsVerify }}
      - name: SKIP_TLS_VERIFY
        value: "{{ . }}"
      {{- end }}
      {{- if and (not .Values.env.GF_SECURITY_ADMIN_USER) (not .Values.env.GF_SECURITY_DISABLE_INITIAL_ADMIN_CREATION) }}
      - name: REQ_USERNAME
        valueFrom:
          secretKeyRef:
            name: {{ (tpl .Values.admin.existingSecret .) | default (include "grafana.fullname" .) }}
            key: {{ .Values.admin.userKey | default "admin-user" }}
      {{- end }}
      {{- if and (not .Values.env.GF_SECURITY_ADMIN_PASSWORD) (not .Values.env.GF_SECURITY_ADMIN_PASSWORD__FILE) (not .Values.env.GF_SECURITY_DISABLE_INITIAL_ADMIN_CREATION) }}
      - name: REQ_PASSWORD
        valueFrom:
          secretKeyRef:
            name: {{ (tpl .Values.admin.existingSecret .) | default (include "grafana.fullname" .) }}
            key: {{ .Values.admin.passwordKey | default "admin-password" }}
      {{- end }}
      {{- if not .Values.sidecar.plugins.skipReload }}
      - name: REQ_URL
        value: {{ .Values.sidecar.plugins.reloadURL }}
      - name: REQ_METHOD
        value: POST
      {{- end }}
      {{- if .Values.sidecar.plugins.watchServerTimeout }}
      {{- if ne .Values.sidecar.plugins.watchMethod "WATCH" }}
        {{- fail (printf "Cannot use .Values.sidecar.plugins.watchServerTimeout with .Values.sidecar.plugins.watchMethod %s" .Values.sidecar.plugins.watchMethod) }}
      {{- end }}
      - name: WATCH_SERVER_TIMEOUT
        value: "{{ .Values.sidecar.plugins.watchServerTimeout }}"
      {{- end }}
      {{- if .Values.sidecar.plugins.watchClientTimeout }}
      {{- if ne .Values.sidecar.plugins.watchMethod "WATCH" }}
        {{- fail (printf "Cannot use .Values.sidecar.plugins.watchClientTimeout with .Values.sidecar.plugins.watchMethod %s" .Values.sidecar.plugins.watchMethod) }}
      {{- end }}
      - name: WATCH_CLIENT_TIMEOUT
        value: "{{ .Values.sidecar.plugins.watchClientTimeout }}"
      {{- end }}
      {{- if .Values.sidecar.plugins.maxTotalRetries }}
      - name: REQ_RETRY_TOTAL
        value: "{{ .Values.sidecar.plugins.maxTotalRetries }}"
      {{- end }}
      {{- if .Values.sidecar.plugins.maxConnectRetries }}
      - name: REQ_RETRY_CONNECT
        value: "{{ .Values.sidecar.plugins.maxConnectRetries }}"
      {{- end }}
      {{- if .Values.sidecar.plugins.maxReadRetries }}
      - name: REQ_RETRY_READ
        value: "{{ .Values.sidecar.plugins.maxReadRetries }}"
      {{- end }}
    {{- with .Values.sidecar.livenessProbe }}
    livenessProbe:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.readinessProbe }}
    readinessProbe:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.resources }}
    resources:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.sidecar.securityContext }}
    securityContext:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    volumeMounts:
      - name: sc-plugins-volume
        mountPath: "/etc/grafana/provisioning/plugins"
      {{- with .Values.sidecar.plugins.extraMounts }}
      {{- toYaml . | trim | nindent 6 }}
      {{- end }}
{{- end}}
  - name: {{ .Chart.Name }}
    {{- $registry := .Values.global.imageRegistry | default .Values.image.registry -}}
    {{- if .Values.image.sha }}
    image: "{{ $registry }}/{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}@sha256:{{ .Values.image.sha }}"
    {{- else }}
    image: "{{ $registry }}/{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
    {{- end }}
    imagePullPolicy: {{ .Values.image.pullPolicy }}
    {{- if .Values.command }}
    command:
    {{- range .Values.command }}
      - {{ . | quote }}
    {{- end }}
    {{- end }}
    {{- if .Values.args }}
    args:
    {{- range .Values.args }}
      - {{ . | quote }}
    {{- end }}
    {{- end }}
    {{- with .Values.containerSecurityContext }}
    securityContext:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    volumeMounts:
      - name: config
        mountPath: "/etc/grafana/grafana.ini"
        subPath: grafana.ini
      {{- if .Values.ldap.enabled }}
      - name: ldap
        mountPath: "/etc/grafana/ldap.toml"
        subPath: ldap.toml
      {{- end }}
      {{- range .Values.extraConfigmapMounts }}
      - name: {{ tpl .name $root }}
        mountPath: {{ tpl .mountPath $root }}
        subPath: {{ tpl (.subPath | default "") $root }}
        readOnly: {{ .readOnly }}
      {{- end }}
      - name: storage
        mountPath: "/var/lib/grafana"
        {{- with .Values.persistence.subPath }}
        subPath: {{ tpl . $root }}
        {{- end }}
      {{- with .Values.dashboards }}
      {{- range $provider, $dashboards := . }}
      {{- range $key, $value := $dashboards }}
      {{- if (or (hasKey $value "json") (hasKey $value "file")) }}
      - name: dashboards-{{ $provider }}
        mountPath: "/var/lib/grafana/dashboards/{{ $provider }}/{{ $key }}.json"
        subPath: "{{ $key }}.json"
      {{- end }}
      {{- end }}
      {{- end }}
      {{- end }}
      {{- with .Values.dashboardsConfigMaps }}
      {{- range (keys . | sortAlpha) }}
      - name: dashboards-{{ . }}
        mountPath: "/var/lib/grafana/dashboards/{{ . }}"
      {{- end }}
      {{- end }}
      {{- with .Values.datasources }}
      {{- $datasources := . }}
      {{- range (keys . | sortAlpha) }}
      {{- if (or (hasKey (index $datasources .) "secret")) }} {{/*check if current datasource should be handeled as secret */}}
      - name: config-secret
        mountPath: "/etc/grafana/provisioning/datasources/{{ . }}"
        subPath: {{ . | quote }}
      {{- else }}
      - name: config
        mountPath: "/etc/grafana/provisioning/datasources/{{ . }}"
        subPath: {{ . | quote }}
      {{- end }}
      {{- end }}
      {{- end }}
      {{- with .Values.notifiers }}
      {{- $notifiers := . }}
      {{- range (keys . | sortAlpha) }}
      {{- if (or (hasKey (index $notifiers .) "secret")) }} {{/*check if current notifier should be handeled as secret */}}
      - name: config-secret
        mountPath: "/etc/grafana/provisioning/notifiers/{{ . }}"
        subPath: {{ . | quote }}
      {{- else }}
      - name: config
        mountPath: "/etc/grafana/provisioning/notifiers/{{ . }}"
        subPath: {{ . | quote }}
      {{- end }}
      {{- end }}
      {{- end }}
      {{- with .Values.alerting }}
      {{- $alertingmap := .}}
      {{- range (keys . | sortAlpha) }}
      {{- if (or (hasKey (index $.Values.alerting .) "secret") (hasKey (index $.Values.alerting .) "secretFile")) }} {{/*check if current alerting entry should be handeled as secret */}}
      - name: config-secret
        mountPath: "/etc/grafana/provisioning/alerting/{{ . }}"
        subPath: {{ . | quote }}
      {{- else }}
      - name: config
        mountPath: "/etc/grafana/provisioning/alerting/{{ . }}"
        subPath: {{ . | quote }}
      {{- end }}
      {{- end }}
      {{- end }}
      {{- with .Values.dashboardProviders }}
      {{- range (keys . | sortAlpha) }}
      - name: config
        mountPath: "/etc/grafana/provisioning/dashboards/{{ . }}"
        subPath: {{ . | quote }}
      {{- end }}
      {{- end }}
      {{- with .Values.sidecar.alerts.enabled }}
      - name: sc-alerts-volume
        mountPath: "/etc/grafana/provisioning/alerting"
      {{- end}}
      {{- if .Values.sidecar.dashboards.enabled }}
      - name: sc-dashboard-volume
        mountPath: {{ .Values.sidecar.dashboards.folder | quote }}
      {{- if .Values.sidecar.dashboards.SCProvider }}
      - name: sc-dashboard-provider
        mountPath: "/etc/grafana/provisioning/dashboards/sc-dashboardproviders.yaml"
        subPath: provider.yaml
      {{- end}}
      {{- end}}
      {{- if .Values.sidecar.datasources.enabled }}
      - name: sc-datasources-volume
        mountPath: "/etc/grafana/provisioning/datasources"
      {{- end}}
      {{- if .Values.sidecar.plugins.enabled }}
      - name: sc-plugins-volume
        mountPath: "/etc/grafana/provisioning/plugins"
      {{- end}}
      {{- if .Values.sidecar.notifiers.enabled }}
      - name: sc-notifiers-volume
        mountPath: "/etc/grafana/provisioning/notifiers"
      {{- end}}
      {{- range .Values.extraSecretMounts }}
      - name: {{ .name }}
        mountPath: {{ .mountPath }}
        readOnly: {{ .readOnly }}
        subPath: {{ .subPath | default "" }}
      {{- end }}
      {{- range .Values.extraVolumeMounts }}
      - name: {{ .name }}
        mountPath: {{ .mountPath }}
        subPath: {{ .subPath | default "" }}
        readOnly: {{ .readOnly }}
      {{- end }}
      {{- range .Values.extraEmptyDirMounts }}
      - name: {{ .name }}
        mountPath: {{ .mountPath }}
      {{- end }}
    ports:
      - name: {{ .Values.podPortName }}
        containerPort: {{ .Values.service.targetPort }}
        protocol: TCP
      - name: {{ .Values.gossipPortName }}-tcp
        containerPort: 9094
        protocol: TCP
      - name: {{ .Values.gossipPortName }}-udp
        containerPort: 9094
        protocol: UDP
      - name: profiling
        containerPort: 6060
        protocol: TCP
    env:
      - name: POD_IP
        valueFrom:
          fieldRef:
            fieldPath: status.podIP
      {{- if and (not .Values.env.GF_SECURITY_ADMIN_USER) (not .Values.env.GF_SECURITY_DISABLE_INITIAL_ADMIN_CREATION) }}
      - name: GF_SECURITY_ADMIN_USER
        valueFrom:
          secretKeyRef:
            name: {{ (tpl .Values.admin.existingSecret .) | default (include "grafana.fullname" .) }}
            key: {{ .Values.admin.userKey | default "admin-user" }}
      {{- end }}
      {{- if and (not .Values.env.GF_SECURITY_ADMIN_PASSWORD) (not .Values.env.GF_SECURITY_ADMIN_PASSWORD__FILE) (not .Values.env.GF_SECURITY_DISABLE_INITIAL_ADMIN_CREATION) }}
      - name: GF_SECURITY_ADMIN_PASSWORD
        valueFrom:
          secretKeyRef:
            name: {{ (tpl .Values.admin.existingSecret .) | default (include "grafana.fullname" .) }}
            key: {{ .Values.admin.passwordKey | default "admin-password" }}
      {{- end }}
      {{- if .Values.plugins }}
      - name: GF_INSTALL_PLUGINS
        valueFrom:
          configMapKeyRef:
            name: {{ include "grafana.fullname" . }}
            key: plugins
      {{- end }}
      {{- if .Values.smtp.existingSecret }}
      - name: GF_SMTP_USER
        valueFrom:
          secretKeyRef:
            name: {{ .Values.smtp.existingSecret }}
            key: {{ .Values.smtp.userKey | default "user" }}
      - name: GF_SMTP_PASSWORD
        valueFrom:
          secretKeyRef:
            name: {{ .Values.smtp.existingSecret }}
            key: {{ .Values.smtp.passwordKey | default "password" }}
      {{- end }}
      {{- if .Values.imageRenderer.enabled }}
      - name: GF_RENDERING_SERVER_URL
        {{- if .Values.imageRenderer.serverURL }}
        value: {{ .Values.imageRenderer.serverURL | quote }}
        {{- else }}
        value: http://{{ include "grafana.fullname" . }}-image-renderer.{{ include "grafana.namespace" . }}:{{ .Values.imageRenderer.service.port }}/render
        {{- end }}
      - name: GF_RENDERING_CALLBACK_URL
        {{- if .Values.imageRenderer.renderingCallbackURL }}
        value: {{ .Values.imageRenderer.renderingCallbackURL | quote }}
        {{- else }}
        value: {{ .Values.imageRenderer.grafanaProtocol }}://{{ include "grafana.fullname" . }}.{{ include "grafana.namespace" . }}:{{ .Values.service.port }}/{{ .Values.imageRenderer.grafanaSubPath }}
        {{- end }}
      {{- end }}
      - name: GF_PATHS_DATA
        value: {{ (get .Values "grafana.ini").paths.data }}
      - name: GF_PATHS_LOGS
        value: {{ (get .Values "grafana.ini").paths.logs }}
      - name: GF_PATHS_PLUGINS
        value: {{ (get .Values "grafana.ini").paths.plugins }}
      - name: GF_PATHS_PROVISIONING
        value: {{ (get .Values "grafana.ini").paths.provisioning }}
      {{- range $key, $value := .Values.envValueFrom }}
      - name: {{ $key | quote }}
        valueFrom:
          {{- tpl (toYaml $value) $ | nindent 10 }}
      {{- end }}
      {{- range $key, $value := .Values.env }}
      - name: "{{ tpl $key $ }}"
        value: "{{ tpl (print $value) $ }}"
      {{- end }}
    {{- if or .Values.envFromSecret (or .Values.envRenderSecret .Values.envFromSecrets) .Values.envFromConfigMaps }}
    envFrom:
      {{- if .Values.envFromSecret }}
      - secretRef:
          name: {{ tpl .Values.envFromSecret . }}
      {{- end }}
      {{- if .Values.envRenderSecret }}
      - secretRef:
          name: {{ include "grafana.fullname" . }}-env
      {{- end }}
      {{- range .Values.envFromSecrets }}
      - secretRef:
          name: {{ tpl .name $ }}
          optional: {{ .optional | default false }}
        {{- if .prefix }}
        prefix: {{ tpl .prefix $ }}
        {{- end }}
      {{- end }}
      {{- range .Values.envFromConfigMaps }}
      - configMapRef:
          name: {{ tpl .name $ }}
          optional: {{ .optional | default false }}
        {{- if .prefix }}
        prefix: {{ tpl .prefix $ }}
        {{- end }}
      {{- end }}
    {{- end }}
    {{- with .Values.livenessProbe }}
    livenessProbe:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.readinessProbe }}
    readinessProbe:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.lifecycleHooks }}
    lifecycle:
      {{- tpl (toYaml .) $root | nindent 6 }}
    {{- end }}
    {{- with .Values.resources }}
    resources:
      {{- toYaml . | nindent 6 }}
    {{- end }}
{{- with .Values.extraContainers }}
  {{- tpl . $ | nindent 2 }}
{{- end }}
{{- with .Values.nodeSelector }}
nodeSelector:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.affinity }}
affinity:
  {{- tpl (toYaml .) $root | nindent 2 }}
{{- end }}
{{- with .Values.topologySpreadConstraints }}
topologySpreadConstraints:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.tolerations }}
tolerations:
  {{- toYaml . | nindent 2 }}
{{- end }}
volumes:
  - name: config
    configMap:
      name: {{ include "grafana.fullname" . }}
  {{- $createConfigSecret := eq (include "grafana.shouldCreateConfigSecret" .) "true" -}}
  {{- if and .Values.createConfigmap $createConfigSecret }}
  - name: config-secret
    secret:
      secretName: {{ include "grafana.fullname" . }}-config-secret
  {{- end }}
  {{- range .Values.extraConfigmapMounts }}
  - name: {{ tpl .name $root }}
    configMap:
      name: {{ tpl .configMap $root }}
      {{- with .optional }}
      optional: {{ . }}
      {{- end }}
      {{- with .items }}
      items:
        {{- toYaml . | nindent 8 }}
      {{- end }}
  {{- end }}
  {{- if .Values.dashboards }}
  {{- range (keys .Values.dashboards | sortAlpha) }}
  - name: dashboards-{{ . }}
    configMap:
      name: {{ include "grafana.fullname" $ }}-dashboards-{{ . }}
  {{- end }}
  {{- end }}
  {{- if .Values.dashboardsConfigMaps }}
  {{- range $provider, $name := .Values.dashboardsConfigMaps }}
  - name: dashboards-{{ $provider }}
    configMap:
      name: {{ tpl $name $root }}
  {{- end }}
  {{- end }}
  {{- if .Values.ldap.enabled }}
  - name: ldap
    secret:
      {{- if .Values.ldap.existingSecret }}
      secretName: {{ .Values.ldap.existingSecret }}
      {{- else }}
      secretName: {{ include "grafana.fullname" . }}
      {{- end }}
      items:
        - key: ldap-toml
          path: ldap.toml
  {{- end }}
  {{- if and .Values.persistence.enabled (eq .Values.persistence.type "pvc") }}
  - name: storage
    persistentVolumeClaim:
      claimName: {{ tpl (.Values.persistence.existingClaim | default (include "grafana.fullname" .)) . }}
  {{- else if and .Values.persistence.enabled (has .Values.persistence.type $sts) }}
  {{/* nothing */}}
  {{- else }}
  - name: storage
    {{- if .Values.persistence.inMemory.enabled }}
    emptyDir:
      medium: Memory
      {{- with .Values.persistence.inMemory.sizeLimit }}
      sizeLimit: {{ . }}
      {{- end }}
    {{- else }}
    emptyDir: {}
    {{- end }}
  {{- end }}
  {{- if .Values.sidecar.alerts.enabled }}
  - name: sc-alerts-volume
    {{- if .Values.sidecar.alerts.sizeLimit }}
    emptyDir:
      {{- with .Values.sidecar.alerts.sizeLimit }}
      sizeLimit: {{ . }}
      {{- end }}
    {{- else }}
    emptyDir: {}
    {{- end }}
  {{- end }}
  {{- if .Values.sidecar.dashboards.enabled }}
  - name: sc-dashboard-volume
    {{- if .Values.sidecar.dashboards.sizeLimit }}
    emptyDir:
      {{- with .Values.sidecar.dashboards.sizeLimit }}
      sizeLimit: {{ . }}
      {{- end }}
    {{- else }}
    emptyDir: {}
    {{- end }}
  {{- if .Values.sidecar.dashboards.SCProvider }}
  - name: sc-dashboard-provider
    configMap:
      name: {{ include "grafana.fullname" . }}-config-dashboards
  {{- end }}
  {{- end }}
  {{- if .Values.sidecar.datasources.enabled }}
  - name: sc-datasources-volume
    {{- if .Values.sidecar.datasources.sizeLimit }}
    emptyDir:
      {{- with .Values.sidecar.datasources.sizeLimit }}
      sizeLimit: {{ . }}
      {{- end }}
    {{- else }}
    emptyDir: {}
    {{- end }}
  {{- end }}
  {{- if .Values.sidecar.plugins.enabled }}
  - name: sc-plugins-volume
    {{- if .Values.sidecar.plugins.sizeLimit }}
    emptyDir:
      {{- with .Values.sidecar.plugins.sizeLimit }}
      sizeLimit: {{ . }}
      {{- end }}
    {{- else }}
    emptyDir: {}
    {{- end }}
  {{- end }}
  {{- if .Values.sidecar.notifiers.enabled }}
  - name: sc-notifiers-volume
    {{- if .Values.sidecar.notifiers.sizeLimit }}
    emptyDir:
      {{- with .Values.sidecar.notifiers.sizeLimit }}
      sizeLimit: {{ . }}
      {{- end }}
    {{- else }}
    emptyDir: {}
    {{- end }}
  {{- end }}
  {{- range .Values.extraSecretMounts }}
  {{- if .secretName }}
  - name: {{ .name }}
    secret:
      secretName: {{ .secretName }}
      defaultMode: {{ .defaultMode }}
      {{- with .optional }}
      optional: {{ . }}
      {{- end }}
      {{- with .items }}
      items:
        {{- toYaml . | nindent 8 }}
      {{- end }}
  {{- else if .projected }}
  - name: {{ .name }}
    projected:
      {{- toYaml .projected | nindent 6 }}
  {{- else if .csi }}
  - name: {{ .name }}
    csi:
      {{- toYaml .csi | nindent 6 }}
  {{- end }}
  {{- end }}
  {{- range .Values.extraVolumes }}
  - name: {{ .name }}
    {{- if .existingClaim }}
    persistentVolumeClaim:
      claimName: {{ .existingClaim }}
    {{- else if .hostPath }}
    hostPath:
      {{ toYaml .hostPath | nindent 6 }}
    {{- else if .csi }}
    csi:
      {{- toYaml .csi | nindent 6 }}
    {{- else if .configMap }}
    configMap:
      {{- toYaml .configMap | nindent 6 }}
    {{- else if .emptyDir }}
    emptyDir:
      {{- toYaml .emptyDir | nindent 6 }}
    {{- else }}
    emptyDir: {}
    {{- end }}
  {{- end }}
  {{- range .Values.extraEmptyDirMounts }}
  - name: {{ .name }}
    emptyDir: {}
  {{- end }}
  {{- with .Values.extraContainerVolumes }}
  {{- tpl (toYaml .) $root | nindent 2 }}
  {{- end }}
{{- end }}