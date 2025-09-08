
{{/*
Rendering the pod template of gateway component.
*/}}
{{- define "gateway.podTemplate" -}}
{{- $o11y := .Values.global.o11y -}}
template:
  metadata:
    annotations:
    {{- if .Values.gateway.podAnnotations }}
      {{- toYaml .Values.gateway.podAnnotations | nindent 6 }}
    {{- end }}
    labels:
      sidecar.istio.io/inject: "false"
      {{- with .Values.gateway.revision }}
      istio.io/rev: {{ . }}
      {{- end }}
      {{- with .Values.gateway.podLabels }}
        {{- toYaml . | nindent 6 }}
      {{- end }}
      {{- include "gateway.selectorLabels" . | nindent 6 }}
  spec:
    {{- with .Values.gateway.imagePullSecrets }}
    imagePullSecrets:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    serviceAccountName: {{ include "gateway.serviceAccountName" . }}
    {{- if .Values.global.priorityClassName }}
    priorityClassName: "{{ .Values.global.priorityClassName }}"
    {{- end }}
    securityContext:
    {{- if .Values.gateway.securityContext }}
      {{- toYaml .Values.gateway.securityContext | nindent 6 }}
    {{- else if and .Values.gateway.unprivilegedPortSupported (and (not .Values.gateway.hostNetwork) (semverCompare ">=1.22-0" .Capabilities.KubeVersion.GitVersion)) }}
      # Safe since 1.22: https://github.com/kubernetes/kubernetes/pull/103326
      sysctls:
      - name: net.ipv4.ip_unprivileged_port_start
        value: "0"
    {{- end }}
    containers:
      - name: higress-gateway
        image: "{{ .Values.gateway.hub | default .Values.global.hub }}/{{ .Values.gateway.image | default "gateway" }}:{{ .Values.gateway.tag | default .Chart.AppVersion }}"
        args:
          - proxy
          - router
          - --domain
          - $(POD_NAMESPACE).svc.cluster.local
          - --proxyLogLevel={{- default "warning" .Values.global.proxy.logLevel }}
          - --proxyComponentLogLevel={{- default "misc:error" .Values.global.proxy.componentLogLevel }}
          - --log_output_level={{- default "default:info" .Values.global.logging.level }}
          - --serviceCluster=higress-gateway
        securityContext:
        {{- if .Values.gateway.containerSecurityContext }}
          {{- toYaml .Values.gateway.containerSecurityContext | nindent 10 }}
        {{- else if and .Values.gateway.unprivilegedPortSupported (and (not .Values.gateway.hostNetwork) (semverCompare ">=1.22-0" .Capabilities.KubeVersion.GitVersion)) }}
          # Safe since 1.22: https://github.com/kubernetes/kubernetes/pull/103326
          capabilities:
            drop:
            - ALL
          allowPrivilegeEscalation: false
          privileged: false
          # When enabling lite metrics, the configuration template files need to be replaced.
          {{- if not .Values.global.liteMetrics }}
          readOnlyRootFilesystem: true
          {{- end }}
          runAsUser: 1337
          runAsGroup: 1337
          runAsNonRoot: true
        {{- else }}
          capabilities:
            drop:
            - ALL
            add:
            - NET_BIND_SERVICE
          runAsUser: 0
          runAsGroup: 1337
          runAsNonRoot: false
          allowPrivilegeEscalation: true
        {{- end }}
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: spec.nodeName
        - name: POD_NAME
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
        - name: INSTANCE_IP
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: status.podIP
        - name: HOST_IP
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: status.hostIP
        - name: SERVICE_ACCOUNT
          valueFrom:
            fieldRef:
              fieldPath: spec.serviceAccountName
        - name: PROXY_XDS_VIA_AGENT
          value: "true"
        - name: ENABLE_INGRESS_GATEWAY_SDS
          value: "false"
        - name: JWT_POLICY
          value: {{ include "controller.jwtPolicy" . }}
        - name: ISTIO_META_HTTP10
          value: "1"
        - name: ISTIO_META_CLUSTER_ID
          value: "{{ $.Values.clusterName | default `Kubernetes` }}"
        - name: INSTANCE_NAME
          value: "higress-gateway"
        {{- if .Values.global.liteMetrics }}
        - name: LITE_METRICS
          value: "on"
        {{- end }}
        {{- if include "skywalking.enabled" . }}
        - name: ISTIO_BOOTSTRAP_OVERRIDE
          value: /etc/istio/custom-bootstrap/custom_bootstrap.json
        {{- end }}
        {{- with .Values.gateway.networkGateway }}
        - name: ISTIO_META_REQUESTED_NETWORK_VIEW
          value: "{{.}}"
        {{- end }}
        {{- range $key, $val := .Values.gateway.env }}
        - name: {{ $key }}
          value: {{ $val | quote }}
        {{- end }}
        ports:
        - containerPort: 15020
          protocol: TCP
          name: istio-prom
        - containerPort: 15090
          protocol: TCP
          name: http-envoy-prom
        {{- if or .Values.global.local .Values.global.kind }}
        - containerPort: {{ .Values.gateway.httpPort }}
          hostPort:  {{ .Values.gateway.httpPort }}
          name: http
          protocol: TCP
        - containerPort:  {{ .Values.gateway.httpsPort }}
          hostPort:  {{ .Values.gateway.httpsPort }}
          name: https
          protocol: TCP
        {{- end }}
        readinessProbe:
          failureThreshold: {{ .Values.gateway.readinessFailureThreshold }}
          httpGet:
            path: /healthz/ready
            port: 15021
            scheme: HTTP
          initialDelaySeconds: {{ .Values.gateway.readinessInitialDelaySeconds }}
          periodSeconds: {{ .Values.gateway.readinessPeriodSeconds }}
          successThreshold: {{ .Values.gateway.readinessSuccessThreshold }}
          timeoutSeconds: {{ .Values.gateway.readinessTimeoutSeconds }}
        {{- if not (or .Values.global.local .Values.global.kind) }}
        resources:
          {{- toYaml .Values.gateway.resources | nindent 10 }}
        {{- end }}
        volumeMounts:
        - mountPath: /var/run/secrets/workload-spiffe-uds
          name: workload-socket
        - mountPath: /var/run/secrets/credential-uds
          name: credential-socket
        - mountPath: /var/run/secrets/workload-spiffe-credentials
          name: workload-certs
        {{- if eq (include "controller.jwtPolicy" .) "third-party-jwt" }}
        - name: istio-token
          mountPath: /var/run/secrets/tokens
          readOnly: true
        {{- end }}
        - name: config
          mountPath: /etc/istio/config
        - name: higress-ca-root-cert
          mountPath: /var/run/secrets/istio
        - name: istio-data
          mountPath: /var/lib/istio/data
        - name: podinfo
          mountPath: /etc/istio/pod
        - name: proxy-socket
          mountPath: /etc/istio/proxy
        {{- if include "skywalking.enabled" . }}
        - mountPath: /etc/istio/custom-bootstrap
          name: custom-bootstrap-volume
        {{- end }}
        {{- if .Values.global.volumeWasmPlugins }}
        - mountPath: /opt/plugins
          name: local-wasmplugins-volume
        {{- end }}
        {{- if $o11y.enabled }}
        - mountPath: /var/log/proxy
          name: log
        {{- end }}
      {{- if $o11y.enabled }}
        {{- $config := $o11y.promtail }}
      - name: promtail
        image: {{ $config.image.repository }}:{{ $config.image.tag }}
        imagePullPolicy: IfNotPresent
        args:
          - -config.file=/etc/promtail/promtail.yaml
        env:
          - name: 'HOSTNAME'
            valueFrom:
              fieldRef:
                fieldPath: 'spec.nodeName'
        ports:
          - containerPort: {{ $config.port }}
            name: http-metrics
            protocol: TCP
        readinessProbe:
          failureThreshold: 3
          httpGet:
            path: /ready
            port: {{ $config.port }}
            scheme: HTTP
          initialDelaySeconds: 10
          periodSeconds: 10
          successThreshold: 1
          timeoutSeconds: 1
        volumeMounts:
          - name: promtail-config
            mountPath: "/etc/promtail"
          - name: log
            mountPath: /var/log/proxy
          - name: tmp
            mountPath: /tmp
      {{- end }}
    {{- if .Values.gateway.hostNetwork }}
    hostNetwork: {{ .Values.gateway.hostNetwork }}
    dnsPolicy: ClusterFirstWithHostNet
    {{- end }}
    {{- with .Values.gateway.nodeSelector }}
    nodeSelector:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.gateway.affinity }}
    affinity:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with .Values.gateway.tolerations }}
    tolerations:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    volumes:
    - emptyDir: {}
      name: workload-socket
    - emptyDir: {}
      name: credential-socket
    - emptyDir: {}
      name: workload-certs
    {{- if eq (include "controller.jwtPolicy" .) "third-party-jwt" }}
    - name: istio-token
      projected:
        sources:
          - serviceAccountToken:
              audience: istio-ca
              expirationSeconds: 43200
              path: istio-token
    {{- end }}
    - name: higress-ca-root-cert
      configMap:
        name: higress-ca-root-cert
    - name: config
      configMap:
        name: higress-config
    {{- if include "skywalking.enabled" . }}
    - configMap:
        defaultMode: 420
        name: higress-custom-bootstrap
      name: custom-bootstrap-volume
    {{- end }}
    - name: istio-data
      emptyDir: {}
    - name: proxy-socket
      emptyDir: {}
    {{- if $o11y.enabled }}
    - name: log
      emptyDir: {}
    - name: tmp
      emptyDir: {}
    - name: promtail-config
      configMap:
        name: higress-promtail
    {{- end }}
    - name: podinfo
      downwardAPI:
        defaultMode: 420
        items:
        - fieldRef:
            apiVersion: v1
            fieldPath: metadata.labels
          path: labels
        - fieldRef:
            apiVersion: v1
            fieldPath: metadata.annotations
          path: annotations
        - path: cpu-request
          resourceFieldRef:
            containerName: higress-gateway
            divisor: 1m
            resource: requests.cpu
        - path: cpu-limit
          resourceFieldRef:
            containerName: higress-gateway
            divisor: 1m
            resource: limits.cpu
    {{- if .Values.global.volumeWasmPlugins }}
    - name: local-wasmplugins-volume
      hostPath:
        path: /opt/plugins
        type: Directory
    {{- end }}
{{- end -}}
