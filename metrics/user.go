package main

import (
	"context"
	"encoding/json"
	v12 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"log"
	"net/http"
	"os"
	ctrl "sigs.k8s.io/controller-runtime"
	"strconv"
	"strings"
	"time"
)

var (
	userCount = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "user_info_total",
		Help: "Total number of User CRs",
	})
	userPodCount = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "user_pod_total",
		Help: "Total number of User Pods",
	})
	userRechargeCount = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "user_recharge_count",
		Help: "Total number of user recharge transactions",
	})

	userRechargeAmount = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "user_recharge_amount",
		Help: "Total amount of user recharge transactions",
	})
)

var UserPodCountInterval = 600
var UserCountInterval = 600

func init() {
	prometheus.MustRegister(userCount)
	prometheus.MustRegister(userPodCount)
	prometheus.MustRegister(userRechargeCount)
	prometheus.MustRegister(userRechargeAmount)
	var err error
	if os.Getenv("USER_COUNT_INTERVAL") != "" {
		UserCountInterval, err = strconv.Atoi(os.Getenv("USER_COUNT_INTERVAL"))
		if err != nil {
			log.Fatalf("USER_COUNT_INTERVAL must be a number")
		}
	}
	if os.Getenv("USER_POD_COUNT_INTERVAL") != "" {
		UserPodCountInterval, err = strconv.Atoi(os.Getenv("USER_POD_COUNT_INTERVAL"))
		if err != nil {
			log.Fatalf("USER_POD_COUNT_INTERVAL must be a number")
		}
	}
}

func main() {
	http.Handle("/metrics", promhttp.Handler())

	go func() {
		for {
			userCount.Set(getUserCount())
			count, amount := getUserRechargeCountAndAmount()
			userRechargeCount.Set(float64(count))
			log.Println("userRechargeAmount", amount)
			log.Println("userRechargeAmount", float64(amount)/1_000_000)
			userRechargeAmount.Set(float64(amount) / 1_000_000)
			userPodCount.Set(getUserPodCount())
			time.Sleep(time.Duration(UserCountInterval) * time.Second)
		}
	}()

	log.Fatal(http.ListenAndServe(":8000", nil))
}

func getUserCount() float64 {
	clientset, err := kubernetes.NewForConfig(ctrl.GetConfigOrDie())
	if err != nil {
		log.Fatalf("Failed to create Kubernetes clientset: %v", err)
	}
	group := "user.sealos.io"
	version := "v1"
	plural := "users"

	userList, err := clientset.RESTClient().Get().
		AbsPath("/apis", group, version, plural).DoRaw(context.Background())

	if err != nil {
		log.Printf("Failed to get User CRD list: %v", err)
		return 0
	}

	var userCRDList map[string]interface{}
	if err := json.Unmarshal(userList, &userCRDList); err != nil {
		log.Printf("Failed to unmarshal User CRD list: %v", err)
		return 0
	}

	items, ok := userCRDList["items"].([]interface{})
	if !ok {
		log.Printf("Failed to extract items from User CRD list")
		return 0
	}
	return float64(len(items))
}

func getUserPodCount() float64 {
	clientset, err := kubernetes.NewForConfig(ctrl.GetConfigOrDie())
	if err != nil {
		log.Fatalf("Failed to create Kubernetes clientset: %v", err)
	}

	podList, err := clientset.CoreV1().Pods("").List(context.Background(), v1.ListOptions{})
	if err != nil {
		log.Printf("Failed to get pod list: %v", err)
		return 0
	}

	var totalPods int64
	for _, pod := range podList.Items {
		if strings.HasPrefix(pod.Namespace, "ns-") {
			totalPods++
		}
	}

	return float64(totalPods)
}

func getUserRechargeCountAndAmount() (int64, int64) {
	dbCtx := context.Background()
	dbClient, err := database.NewMongoDB(dbCtx, os.Getenv(database.MongoURL))
	if err != nil {
		log.Fatalf("connect mongo client failed: %v", err)
		return 0, 0
	}
	defer func() {
		err := dbClient.Disconnect(dbCtx)
		if err != nil {
			log.Fatalf("disconnect mongo client failed: %v", err)
		}
	}()

	count, amount, err := dbClient.GetBillingCount(v12.Recharge)
	if err != nil {
		log.Fatalf("get billing count failed: %v", err)
	}
	return count, amount
}
