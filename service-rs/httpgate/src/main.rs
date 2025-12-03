use std::{sync::Arc, time::Duration};

use pingora_core::{
    apps::HttpServerOptions,
    server::{configuration::Opt, Server},
};
use tracing::{error, info};

use httpgate::{
    config::Config,
    proxy::DevboxProxy,
    registry::DevboxRegistry,
    watcher::{DevboxWatcher, PodWatcher},
};

fn init_logging(log_level: &str) {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(format!("httpgate={log_level}").parse().unwrap())
                .add_directive("pingora=warn".parse().unwrap()),
        )
        .init();
}

fn main() {
    // Load configuration
    let config = Config::from_env();

    // Initialize logging
    init_logging(&config.log_level);

    info!(listen_addr = %config.listen_addr, "Starting httpgate");

    // Create shared registry
    let registry = Arc::new(DevboxRegistry::new());

    // Create Pingora server
    let opt = Opt::default();
    let mut server = Server::new(Some(opt)).unwrap();
    server.bootstrap();

    // Create and configure proxy service
    let proxy = DevboxProxy::new(Arc::clone(&registry));
    let mut proxy_service = pingora_proxy::http_proxy_service(&server.configuration, proxy);
    // Enable h2c (HTTP/2 over cleartext) to support gRPC
    if let Some(app) = proxy_service.app_logic_mut() {
        let mut opts = HttpServerOptions::default();
        opts.h2c = true;
        app.server_options = Some(opts);
    }
    proxy_service.add_tcp(&config.listen_addr.to_string());

    server.add_service(proxy_service);

    // Spawn Kubernetes watchers in background
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .expect("Failed to create Tokio runtime");

    // Spawn independent watchers - they operate on separate indices
    let devbox_watcher_registry = Arc::clone(&registry);
    let pod_watcher_registry = Arc::clone(&registry);

    // Spawn Devbox watcher
    runtime.spawn(async move {
        let devbox_watcher = DevboxWatcher::new(devbox_watcher_registry);
        loop {
            if let Err(e) = devbox_watcher.run().await {
                error!(error = %e, "Devbox watcher failed, restarting in 5s");
                tokio::time::sleep(Duration::from_secs(5)).await;
            }
        }
    });

    // Spawn Pod watcher
    runtime.spawn(async move {
        let pod_watcher = PodWatcher::new(pod_watcher_registry);
        loop {
            if let Err(e) = pod_watcher.run().await {
                error!(error = %e, "Pod watcher failed, restarting in 5s");
                tokio::time::sleep(Duration::from_secs(5)).await;
            }
        }
    });

    info!("Proxy server starting");

    // Run server (blocking)
    server.run_forever();
}
