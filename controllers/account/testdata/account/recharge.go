package main

import (
	"context"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"os"
	"strconv"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	baseapi "github.com/labring/sealos/test/testdata/api"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
)

func main() {
	args := os.Args
	if len(args) != 3 {
		panic("args error,len(args) != 3")
	}
	amount, err := strconv.Atoi(args[2])
	if err != nil {
		panic(err)
	}
	if err := RechargeAccount(args[1], "sealos-system", int64(amount)); err != nil {
		panic(err)
	}
}

func RechargeAccount(AccountName, namespace string, amount int64) error {
	account, err := GetAccount(namespace, AccountName)
	if err != nil {
		return err
	}
	account.Status.Balance += amount
	client := baseapi.GetDefaultDynamicClient()
	gvr := userv1.GroupVersion.WithResource("accounts")
	unstructured2, err := runtime.DefaultUnstructuredConverter.ToUnstructured(account)
	if err != nil {
		return err
	}
	un := &unstructured.Unstructured{Object: unstructured2}
	_, err = client.Resource(gvr).Namespace(namespace).UpdateStatus(context.Background(), un, metav1.UpdateOptions{})
	if err != nil {
		return err
	}
	return nil
}

func GetAccount(namespace string, name string) (*accountv1.Account, error) {
	gvr := accountv1.GroupVersion.WithResource("accounts")
	var account accountv1.Account
	if err := baseapi.GetObject(namespace, name, gvr, &account); err != nil {
		return nil, err
	}
	return &account, nil
}
