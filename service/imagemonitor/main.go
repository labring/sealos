package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/cache"
)

func main() {
	// 注册 Prometheus 指标
	prometheus.MustRegister(imagePullFailureGauge)
	prometheus.MustRegister(imagePullSlowAlertGauge)

	// 创建 in-cluster 配置
	config, err := rest.InClusterConfig()
	if err != nil {
		log.Fatalf("Error creating in-cluster config: %v", err)
	}

	clientset, err = kubernetes.NewForConfig(config)
	if err != nil {
		log.Fatalf("Error creating Kubernetes clientset: %v", err)
	}

	// 创建 informer
	factory := informers.NewSharedInformerFactory(clientset, 0)
	podInformer := factory.Core().V1().Pods().Informer()
	_, _ = podInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc:    onPodAddOrUpdate,
		UpdateFunc: func(_, obj any) { onPodAddOrUpdate(obj) },
		DeleteFunc: onPodDelete,
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go podInformer.Run(ctx.Done())

	if !cache.WaitForCacheSync(ctx.Done(), podInformer.HasSynced) {
		//nolint:gocritic
		log.Fatalf("Timed out waiting for caches to sync")
	}

	// HTTP server 和优雅停机
	srv := &http.Server{
		Addr:              ":8080",
		Handler:           promhttp.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
	}
	go func() {
		log.Println("Starting metrics server at :8080")

		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Metrics server error: %v", err)
		}
	}()

	// 捕获信号
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh
	log.Println("Shutdown signal received, exiting...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("Error during server shutdown: %v", err)
	}

	log.Println("Server gracefully stopped")
}
