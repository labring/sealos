package main

import (
	"github.com/labring/sealos/service/pay/router"
)

func main() {
	router.RegisterPayRouter()

	//cert, err := tls.LoadX509KeyPair("./key/pay.pem", "./key/pay.key")
	//if err != nil {
	//	log.Fatalf("failed to load certificates and keys: %v", err)
	//}
	//cfg := &tls.Config{Certificates: []tls.Certificate{cert}}
	//
	//listener, err := tls.Listen("tcp", ":8080", cfg)
	//if err != nil {
	//	log.Fatal(err)
	//}
	//defer listener.Close()
}
