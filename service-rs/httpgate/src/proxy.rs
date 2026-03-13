use std::sync::Arc;

use async_trait::async_trait;
use bytes::Bytes;
use pingora_core::upstreams::peer::{HttpPeer, ALPN};
use pingora_core::{Error, ErrorSource, ErrorType, Result};
use pingora_http::{RequestHeader, ResponseHeader, Version};
use pingora_proxy::{FailToProxy, ProxyHttp, Session};
use regex::Regex;
use tracing::{debug, error, info, warn};

use crate::registry::DevboxRegistry;

/// Upstream protocol type based on incoming request
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UpstreamProtocol {
    /// HTTP/1.1 over cleartext
    Http,
    /// gRPC over HTTP/2 cleartext (detected by H2 + content-type: application/grpc*)
    Grpc,
}

/// Result of backend resolution
enum BackendResult {
    /// Backend resolved successfully with Pod IP
    Ok(String, u16),
    /// Devbox not registered (uniqueID not found)
    NotFound,
    /// Devbox registered but Pod is not running (no Pod IP)
    NotRunning,
}

/// Error response bodies
const BODY_NOT_FOUND: &[u8] = b"devbox not found";
const BODY_NOT_RUNNING: &[u8] = b"devbox not running";

/// Regex to parse host header: <uniqueID>-<port>.xxx
///
/// Pattern: ^(<uniqueID>)-(<port>)\.
/// - uniqueID: lowercase alphanumeric with hyphens, cannot start/end with hyphen
/// - port: numeric or "agent" (special keyword for agent port)
///
/// Note: "devbox-" prefix should be stripped before matching.
///
/// Examples (after devbox- prefix stripped):
///   - "outdoor-before-78648-8080.devbox.xxx" -> ("outdoor-before-78648", 8080)
///   - "my-app-8080.devbox.xxx" -> ("my-app", 8080)
///   - "my-app-agent.devbox.xxx" -> ("my-app", agent_port from config)
static HOST_REGEX: std::sync::LazyLock<Regex> = std::sync::LazyLock::new(|| {
    // [a-z\d] - starts with alphanumeric
    // (?:[-a-z\d]*[a-z\d])? - optionally more chars, must end with alphanumeric
    // -(\d+|agent)\. - port suffix (numeric or "agent")
    Regex::new(r"^([a-z\d](?:[-a-z\d]*[a-z\d])?)-(\d+|agent)\.").unwrap()
});

/// Host parser for extracting uniqueID and port from Host header.
#[derive(Debug, Clone)]
pub struct HostParser {
    /// Agent port (used when port is "agent" instead of a number)
    agent_port: u16,
}

impl HostParser {
    /// Create a new HostParser with the given agent port.
    pub const fn new(agent_port: u16) -> Self {
        Self { agent_port }
    }

    /// Parse the Host header to extract uniqueID and port.
    ///
    /// Expected format: `devbox-<uniqueID>-<port>.xxx[:port]`
    ///
    /// Examples:
    /// - `devbox-outdoor-before-78648-8080.devbox.sealos.io` -> ("outdoor-before-78648", 8080)
    /// - `devbox-my-app-50051.devbox.sealos.io` -> ("my-app", 50051)
    /// - `devbox-my-app-agent.devbox.sealos.io` -> ("my-app", agent_port)
    pub fn parse(&self, host: &str) -> Option<(String, u16)> {
        // Remove port suffix if present (e.g., "xxx:443" -> "xxx")
        let host_without_port = host.split(':').next().unwrap_or(host);

        // Strip devbox- prefix
        let host_stripped = host_without_port.strip_prefix("devbox-")?;

        HOST_REGEX.captures(host_stripped).and_then(|caps| {
            let unique_id = caps.get(1)?.as_str().to_string();
            let port_str = caps.get(2)?.as_str();
            let port: u16 = if port_str == "agent" {
                self.agent_port
            } else {
                port_str.parse().ok()?
            };
            Some((unique_id, port))
        })
    }
}

/// Context passed between proxy request phases
pub struct ProxyCtx {
    /// Backend Pod IP address
    pub backend_ip: String,
    /// Backend port
    pub backend_port: u16,
    /// Upstream protocol type
    pub protocol: UpstreamProtocol,
}

/// Pingora-based HTTP proxy for routing requests to devbox pods.
///
/// Routes requests based on the Host header pattern:
/// - `devbox-<uniqueID>-<port>.xxx` -> `<pod_ip>:<port>`
///
/// Protocol detection:
/// - gRPC/H2: detected by HTTP/2 request with content-type starting with "application/grpc"
/// - HTTP/1.1: all other requests
pub struct DevboxProxy {
    registry: Arc<DevboxRegistry>,
    /// Host parser for extracting uniqueID and port from Host header
    host_parser: HostParser,
}

impl DevboxProxy {
    pub const fn new(registry: Arc<DevboxRegistry>, agent_port: u16) -> Self {
        Self {
            registry,
            host_parser: HostParser::new(agent_port),
        }
    }

    /// Resolve the backend address from uniqueID.
    ///
    /// Performs a two-step lookup:
    /// 1. uniqueID -> DevboxInfo (namespace, devbox_name)
    /// 2. namespace/devbox_name -> pod_ip
    ///
    /// Returns:
    /// - `BackendResult::Ok` if uniqueID is registered and Pod IP is available
    /// - `BackendResult::NotFound` if uniqueID is not registered
    /// - `BackendResult::NotRunning` if uniqueID is registered but Pod IP is not available
    fn resolve_backend(&self, unique_id: &str, port: u16) -> BackendResult {
        // Step 1: Look up devbox info
        let Some(info) = self.registry.get_devbox(unique_id) else {
            return BackendResult::NotFound;
        };

        // Step 2: Look up pod IP
        let Some(pod_ip) = self.registry.get_pod_ip(&info.namespace, &info.devbox_name) else {
            return BackendResult::NotRunning;
        };

        debug!(
            unique_id = %unique_id,
            namespace = %info.namespace,
            devbox_name = %info.devbox_name,
            pod_ip = %pod_ip,
            port = port,
            "Resolved backend"
        );

        BackendResult::Ok(pod_ip, port)
    }

    /// Send a 404 Not Found response
    async fn send_not_found(session: &mut Session) -> Result<bool> {
        let mut header = ResponseHeader::build(404, None)?;
        header.insert_header("Content-Length", BODY_NOT_FOUND.len().to_string())?;
        header.insert_header("Content-Type", "text/plain")?;
        session
            .write_response_header(Box::new(header), false)
            .await?;
        session
            .write_response_body(Some(BODY_NOT_FOUND.into()), true)
            .await?;
        Ok(true)
    }

    /// Send a 503 Service Unavailable response (devbox not running)
    async fn send_service_unavailable(session: &mut Session) -> Result<bool> {
        let mut header = ResponseHeader::build(503, None)?;
        header.insert_header("Content-Length", BODY_NOT_RUNNING.len().to_string())?;
        header.insert_header("Content-Type", "text/plain")?;
        session
            .write_response_header(Box::new(header), false)
            .await?;
        session
            .write_response_body(Some(BODY_NOT_RUNNING.into()), true)
            .await?;
        Ok(true)
    }
}

#[async_trait]
impl ProxyHttp for DevboxProxy {
    type CTX = Option<ProxyCtx>;

    fn new_ctx(&self) -> Self::CTX {
        None
    }

    async fn request_filter(&self, session: &mut Session, ctx: &mut Self::CTX) -> Result<bool> {
        // Extract Host header (HTTP/1.1) or :authority pseudo-header (HTTP/2/gRPC)
        let host = session
            .req_header()
            .headers
            .get("host")
            .and_then(|h| h.to_str().ok())
            .or_else(|| session.req_header().uri.authority().map(|a| a.as_str()))
            .unwrap_or("");

        // Parse uniqueID and port from host
        let Some((unique_id, port)) = self.host_parser.parse(host) else {
            warn!(host = %host, "Failed to parse host header");
            return Self::send_not_found(session).await;
        };

        // Detect protocol: use gRPC/H2 when request is HTTP/2 AND content-type starts with "application/grpc"
        let is_h2 = session.req_header().version == Version::HTTP_2;
        let is_grpc_content_type = session
            .req_header()
            .headers
            .get("content-type")
            .and_then(|ct| ct.to_str().ok())
            .map(str::to_ascii_lowercase)
            .is_some_and(|ct| ct.starts_with("application/grpc"));

        let protocol = if is_h2 && is_grpc_content_type {
            UpstreamProtocol::Grpc
        } else {
            UpstreamProtocol::Http
        };

        // Resolve backend from registry
        let (backend_ip, backend_port) = match self.resolve_backend(&unique_id, port) {
            BackendResult::Ok(ip, port) => (ip, port),
            BackendResult::NotFound => {
                warn!(
                    host = %host,
                    unique_id = %unique_id,
                    "Devbox not found"
                );
                return Self::send_not_found(session).await;
            }
            BackendResult::NotRunning => {
                warn!(
                    host = %host,
                    unique_id = %unique_id,
                    "Devbox not running (no Pod IP)"
                );
                return Self::send_service_unavailable(session).await;
            }
        };

        info!(
            host = %host,
            protocol = ?protocol,
            backend = %format!("{}:{}", backend_ip, backend_port),
            "Routing request"
        );

        *ctx = Some(ProxyCtx {
            backend_ip,
            backend_port,
            protocol,
        });

        Ok(false) // Continue to upstream
    }

    async fn upstream_peer(
        &self,
        _session: &mut Session,
        ctx: &mut Self::CTX,
    ) -> Result<Box<HttpPeer>> {
        let ctx = ctx
            .as_ref()
            .expect("Context should be set in request_filter");

        let mut peer = HttpPeer::new(
            (ctx.backend_ip.as_str(), ctx.backend_port),
            false, // No TLS (cleartext)
            String::new(),
        );

        // Configure HTTP/2 for gRPC (h2c - HTTP/2 over cleartext)
        if ctx.protocol == UpstreamProtocol::Grpc {
            peer.options.alpn = ALPN::H2;
        }

        Ok(Box::new(peer))
    }

    async fn upstream_request_filter(
        &self,
        _session: &mut Session,
        _upstream_request: &mut RequestHeader,
        _ctx: &mut Self::CTX,
    ) -> Result<()> {
        // Add standard proxy headers
        // upstream_request
        //     .insert_header("X-Forwarded-Proto", "https")
        //     .unwrap();

        Ok(())
    }

    /// Handle fatal proxy errors by returning an error response with a message body.
    ///
    /// This overrides the default behavior which returns empty 502 responses.
    async fn fail_to_proxy(
        &self,
        session: &mut Session,
        e: &Error,
        _ctx: &mut Self::CTX,
    ) -> FailToProxy {
        let code = match e.etype() {
            ErrorType::HTTPStatus(code) => *code,
            _ => match e.esource() {
                ErrorSource::Upstream => 502,
                ErrorSource::Downstream => match e.etype() {
                    ErrorType::WriteError | ErrorType::ReadError | ErrorType::ConnectionClosed => {
                        /* conn already dead */
                        0
                    }
                    _ => 400,
                },
                ErrorSource::Internal | ErrorSource::Unset => 500,
            },
        };

        if code > 0 {
            // Return the error message with httpgate prefix
            let body = Bytes::from(format!("httpgate: {e}"));

            if let Err(send_err) = session.respond_error_with_body(code, body).await {
                error!("Failed to send error response to downstream: {send_err}");
            }
        }

        FailToProxy {
            error_code: code,
            can_reuse_downstream: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Test agent port value
    const TEST_AGENT_PORT: u16 = 9757;

    fn test_parser() -> HostParser {
        HostParser::new(TEST_AGENT_PORT)
    }

    // Host parsing tests (devbox- prefix)

    #[test]
    fn test_parse_host_standard_format() {
        let parser = test_parser();
        let result = parser.parse("devbox-outdoor-before-78648-8080.devbox.sealos.io");
        assert_eq!(result, Some(("outdoor-before-78648".to_string(), 8080)));
    }

    #[test]
    fn test_parse_host_simple_id() {
        let parser = test_parser();
        let result = parser.parse("devbox-my-app-8080.devbox.sealos.io");
        assert_eq!(result, Some(("my-app".to_string(), 8080)));
    }

    #[test]
    fn test_parse_host_single_word() {
        let parser = test_parser();
        let result = parser.parse("devbox-myapp-443.devbox.sealos.io");
        assert_eq!(result, Some(("myapp".to_string(), 443)));
    }

    #[test]
    fn test_parse_host_with_numbers() {
        let parser = test_parser();
        let result = parser.parse("devbox-app123-test456-3000.devbox.sealos.io");
        assert_eq!(result, Some(("app123-test456".to_string(), 3000)));
    }

    #[test]
    fn test_parse_host_with_port_suffix() {
        let parser = test_parser();
        let result = parser.parse("devbox-outdoor-before-78648-8080.devbox.sealos.io:443");
        assert_eq!(result, Some(("outdoor-before-78648".to_string(), 8080)));
    }

    #[test]
    fn test_parse_host_agent_port() {
        let parser = test_parser();
        let result = parser.parse("devbox-my-app-agent.devbox.sealos.io");
        assert_eq!(result, Some(("my-app".to_string(), TEST_AGENT_PORT)));
    }

    #[test]
    fn test_parse_host_agent_port_complex_id() {
        let parser = test_parser();
        let result = parser.parse("devbox-outdoor-before-78648-agent.devbox.sealos.io");
        assert_eq!(
            result,
            Some(("outdoor-before-78648".to_string(), TEST_AGENT_PORT))
        );
    }

    // Invalid format tests

    #[test]
    fn test_parse_host_invalid_no_port() {
        let parser = test_parser();
        assert!(parser
            .parse("devbox-outdoor-before.devbox.sealos.io")
            .is_none());
    }

    #[test]
    fn test_parse_host_invalid_format() {
        let parser = test_parser();
        // No prefix
        assert!(parser.parse("invalid.example.com").is_none());
        assert!(parser.parse("").is_none());
        // Missing devbox- prefix
        assert!(parser
            .parse("outdoor-before-78648-8080.devbox.sealos.io")
            .is_none());
        // Invalid uniqueID format (starts/ends with hyphen)
        assert!(parser.parse("devbox--invalid-8080.devbox.io").is_none());
        assert!(parser.parse("devbox-invalid--8080.devbox.io").is_none());
    }

    #[test]
    fn test_resolve_backend_with_pod_ip() {
        let registry = Arc::new(DevboxRegistry::new());
        registry.register_devbox(
            "outdoor-before-78648".to_string(),
            "ns-admin".to_string(),
            "devbox1".to_string(),
        );
        registry.update_pod_ip("ns-admin", "devbox1", "10.107.173.213".to_string());

        let proxy = DevboxProxy::new(registry, TEST_AGENT_PORT);

        let result = proxy.resolve_backend("outdoor-before-78648", 8080);
        assert!(matches!(
            result,
            BackendResult::Ok(ip, 8080) if ip == "10.107.173.213"
        ));
    }

    #[test]
    fn test_resolve_backend_no_pod_ip() {
        let registry = Arc::new(DevboxRegistry::new());
        registry.register_devbox(
            "outdoor-before-78648".to_string(),
            "ns-admin".to_string(),
            "devbox1".to_string(),
        );
        // Pod IP not set

        let proxy = DevboxProxy::new(registry, TEST_AGENT_PORT);

        let result = proxy.resolve_backend("outdoor-before-78648", 8080);
        assert!(matches!(result, BackendResult::NotRunning));
    }

    #[test]
    fn test_resolve_backend_not_found() {
        let registry = Arc::new(DevboxRegistry::new());
        let proxy = DevboxProxy::new(registry, TEST_AGENT_PORT);

        let result = proxy.resolve_backend("unknown-id-123", 8080);
        assert!(matches!(result, BackendResult::NotFound));
    }
}
