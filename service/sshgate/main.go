package main

import (
	"context"
	"net"
	"os"
	"time"
	_ "time/tzdata"

	"github.com/labring/sealos/service/sshgate/config"
	"github.com/labring/sealos/service/sshgate/gateway"
	"github.com/labring/sealos/service/sshgate/hostkey"
	"github.com/labring/sealos/service/sshgate/informer"
	"github.com/labring/sealos/service/sshgate/logger"
	"github.com/labring/sealos/service/sshgate/pprof"
	"github.com/labring/sealos/service/sshgate/recovery"
	"github.com/labring/sealos/service/sshgate/registry"
	proxyproto "github.com/pires/go-proxyproto"
	"github.com/sirupsen/logrus"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

func init() {
	tz := os.Getenv("TZ")
	if tz != "" {
		return
	}

	loc, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		panic(err)
	}
	time.Local = loc
}

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logrus.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize logger with configuration
	logger.InitLog(
		logger.WithDebug(cfg.Debug),
		logger.WithLevel(cfg.LogLevel),
		logger.WithFormat(cfg.LogFormat),
	)

	// Start pprof server if enabled
	if cfg.PprofEnabled {
		recovery.Go(logrus.WithField("component", "pprof"), func() {
			_ = pprof.RunPprofServer(cfg.PprofPort)
		})
	}

	// Create Kubernetes client
	clientset, err := createKubernetesClient()
	if err != nil {
		logrus.Fatalf("Failed to create Kubernetes client: %v", err)
	}

	// Create devbox registry
	reg := registry.New()

	// Setup and start informers
	infMgr := informer.New(clientset, reg,
		informer.WithResyncPeriod(cfg.InformerResyncPeriod),
	)

	ctx := context.Background()
	if err := infMgr.Start(ctx); err != nil {
		logrus.Fatalf("Failed to start informers: %v", err)
	}

	// Load SSH server host key
	hostKey, err := hostkey.Load(cfg.SSHHostKeySeed)
	if err != nil {
		logrus.Fatalf("Failed to load host key: %v", err)
	}

	// Create gateway with embedded options
	gw := gateway.New(hostKey, reg, gateway.WithOptions(cfg.Gateway))

	// Start SSH server
	//nolint:noctx
	listener, err := net.Listen("tcp", cfg.SSHListenAddr)
	if err != nil {
		logrus.Fatal(err)
	}

	// Wrap listener with proxy protocol support if enabled
	if cfg.EnableProxyProtocol {
		listener = &proxyproto.Listener{
			Listener:   listener,
			ConnPolicy: cfg.ProxyProtocolConnPolicy(),
		}
		logrus.Printf("SSH Gateway listening on %s (proxy protocol enabled)", cfg.SSHListenAddr)
	} else {
		logrus.Printf("SSH Gateway listening on %s", cfg.SSHListenAddr)
	}

	log := logrus.WithFields(nil)

	for {
		conn, err := listener.Accept()
		if err != nil {
			logrus.Printf("Accept error: %v", err)
			continue
		}

		recovery.Go(log, func() {
			gw.HandleConnection(conn)
		})
	}
}

// createKubernetesClient creates a Kubernetes clientset
func createKubernetesClient() (*kubernetes.Clientset, error) {
	// Try in-cluster config first
	config, err := rest.InClusterConfig()
	if err != nil {
		// Fallback to kubeconfig
		kubeconfig := os.Getenv("KUBECONFIG")
		if kubeconfig == "" {
			kubeconfig = os.Getenv("HOME") + "/.kube/config"
		}

		config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
		if err != nil {
			return nil, err
		}
	}

	return kubernetes.NewForConfig(config)
}
