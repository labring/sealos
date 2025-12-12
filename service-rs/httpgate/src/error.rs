use std::fmt;

#[derive(Debug)]
pub enum Error {
    Kube(kube::Error),
    Config(String),
    Proxy(String),
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Kube(e) => write!(f, "Kubernetes error: {e}"),
            Self::Config(msg) => write!(f, "Configuration error: {msg}"),
            Self::Proxy(msg) => write!(f, "Proxy error: {msg}"),
        }
    }
}

impl std::error::Error for Error {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Kube(e) => Some(e),
            _ => None,
        }
    }
}

impl From<kube::Error> for Error {
    fn from(err: kube::Error) -> Self {
        Self::Kube(err)
    }
}

pub type Result<T> = std::result::Result<T, Error>;
