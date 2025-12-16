package main

import (
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/rauth/config"
	"github.com/labring/sealos/service/rauth/logger"
	"github.com/labring/sealos/service/rauth/middleware"
	"github.com/labring/sealos/service/rauth/pkg/auth"
	"github.com/labring/sealos/service/rauth/pkg/handler"
	"github.com/labring/sealos/service/rauth/pkg/k8s"
	log "github.com/sirupsen/logrus"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	logger.InitLog(
		logger.WithDebug(cfg.Debug),
		logger.WithLevel(cfg.LogLevel),
		logger.WithFormat(cfg.LogFormat),
	)

	log.WithFields(log.Fields{
		"port":     cfg.Port,
		"issuer":   cfg.Issuer,
		"service":  cfg.Service,
		"mockMode": cfg.MockMode,
	}).Info("starting rauth server")

	// Initialize Kubernetes client (real or mock)
	var k8sClient k8s.ClientInterface

	if cfg.MockMode {
		k8sClient, err = initMockClient(cfg)
	} else {
		k8sClient, err = k8s.NewClient(cfg.SecretName, cfg.Service)
	}

	if err != nil {
		log.WithError(err).Fatal("failed to create kubernetes client")
	}

	if cfg.MockMode {
		log.Info("using mock kubernetes client")
	} else {
		log.WithField("secretName", cfg.SecretName).Info("kubernetes client initialized")
	}

	// Load or generate private key
	privateKey, err := loadOrGeneratePrivateKey(cfg.PrivateKeyPath)
	if err != nil {
		log.WithError(err).Fatal("failed to load private key")
	}

	// Create token generator
	tokenOption := &auth.TokenOption{
		Issuer:     cfg.Issuer,
		Service:    cfg.Service,
		Expiration: cfg.TokenExpiry,
		PrivateKey: privateKey,
	}

	generator, err := auth.NewTokenGenerator(tokenOption)
	if err != nil {
		log.WithError(err).Fatal("failed to create token generator")
	}

	// Create authenticator
	authenticator := auth.NewAuthenticator(k8sClient, generator)

	// Set admin credentials if configured
	if cfg.AdminUsername != "" && cfg.AdminPassword != "" {
		authenticator.SetAdminCredentials(cfg.AdminUsername, cfg.AdminPassword)
		log.WithField("username", cfg.AdminUsername).Info("global admin account configured")
	}

	// Create HTTP handler
	h := handler.NewHandler(authenticator)

	// Setup Gin router
	if cfg.LogLevel != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(middleware.GinRecovery())
	router.Use(middleware.GinLogger())

	router.GET("/token", h.TokenHandler)
	router.GET("/health", h.HealthHandler)
	router.GET("/healthz", h.HealthHandler)
	router.HEAD("/health", h.HealthHandler)
	router.HEAD("/healthz", h.HealthHandler)

	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		log.Info("shutting down server...")

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := server.Shutdown(ctx); err != nil {
			log.WithError(err).Error("server shutdown error")
		}
	}()

	// Start server
	log.WithField("addr", server.Addr).Info("server starting")

	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		log.WithError(err).Fatal("server error")
	}

	log.Info("server stopped")
}

func initMockClient(cfg *config.Config) (k8s.ClientInterface, error) {
	if cfg.MockConfigPath != "" {
		log.WithField("path", cfg.MockConfigPath).Info("loading mock credentials from config file")
		return k8s.NewMockClientFromConfig(cfg.MockConfigPath)
	}

	log.Info("loading mock credentials from environment")

	return k8s.NewMockClientFromEnv(), nil
}

func loadOrGeneratePrivateKey(path string) (*rsa.PrivateKey, error) {
	if path == "" {
		log.Info("no private key path provided, generating new key")
		return nil, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read private key file: %w", err)
	}

	block, _ := pem.Decode(data)
	if block == nil {
		return nil, errors.New("failed to decode PEM block")
	}

	privateKey, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("failed to parse private key: %w", err)
		}

		var ok bool

		privateKey, ok = key.(*rsa.PrivateKey)
		if !ok {
			return nil, errors.New("private key is not RSA")
		}
	}

	log.WithField("path", path).Info("loaded private key from file")

	return privateKey, nil
}
