use std::net::SocketAddr;

#[derive(Debug, Clone)]
pub struct Config {
    /// Address to listen on (e.g., "0.0.0.0:8080")
    pub listen_addr: SocketAddr,

    /// Log level (e.g., "info", "debug", "warn")
    pub log_level: String,

    /// Agent port (used when port is "agent" instead of a number)
    pub agent_port: u16,
}

impl Config {
    pub fn from_env() -> Self {
        let listen_addr = std::env::var("LISTEN_ADDR")
            .unwrap_or_else(|_| "0.0.0.0:8080".to_string())
            .parse()
            .expect("Invalid LISTEN_ADDR format");

        let log_level = std::env::var("LOG_LEVEL").unwrap_or_else(|_| "info".to_string());

        let agent_port = std::env::var("AGENT_PORT")
            .unwrap_or_else(|_| "9757".to_string())
            .parse()
            .expect("Invalid AGENT_PORT format");

        Self {
            listen_addr,
            log_level,
            agent_port,
        }
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            listen_addr: "0.0.0.0:8080".parse().unwrap(),
            log_level: "info".to_string(),
            agent_port: 9757,
        }
    }
}
