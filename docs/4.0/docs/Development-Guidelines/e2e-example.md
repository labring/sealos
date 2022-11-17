## e2e example

### why need e2e test
Because some tests need to be run under a certain environment, they cannot simply run function tests, and require the cooperation of multiple components, and the final results do not meet expectations. The crd in k8s has this property, and it needs to be deployed to the k8s cluster to see if there is the expected result to meet the test requirements.
Capable man can directly read laf's [e2e test code](https://github.com/labring/laf/blob/main/core/controllers/database/tests/e2e/db_create_test.go)

> Now the account module and user module have not been completed. After completion, you can load crd to your own k8s environment through `sealos run account & user`, and then run the following example code to directly experience the charm of e2e testing

### quick start

There is a scenario where the account corresponding to the user needs to be created after the user is created, and it is necessary to test whether the account is created after the user is created

Create a test folder test, the following is the file structure

```
---test
      |----api // put the func needed for testing
      |----e2e //put test file
```

write a test file e2e/account_test.go

#### 1、create user

```
e2e/account_test.go
func TestAccount(t *testing.T) {
	t.Run("accout should be ok", func(t *testing.T) {
			t.Log("create user ")
			api.CreateUser("", UserName)
	})
})

// api/user.go
const userYaml = `
apiVersion: user.sealos.io/v1
kind: User
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
  csrExpirationSeconds: 1000000000
`
func CreateUser(namespace string, name string) {
	baseapi.MustKubeApplyFromTemplate(userYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
}


// k8s.go
func KubeApplyFromTemplate(yaml string, params map[string]string) (string, error) {
	out := os.Expand(yaml, func(k string) string { return params[k] })
	return KubeApply(out)
}

func MustKubeApplyFromTemplate(yaml string, params map[string]string) {
	_, err := KubeApplyFromTemplate(yaml, params)
	if err != nil {
		panic(err)
	}
}

func KubeApply(yaml string) (string, error) {
	cmd := `kubectl apply -f - <<EOF` + yaml + `EOF`
	out, err := Exec(cmd)
	if err != nil {
		return out, err
	}
	return out, nil
}
```

#### 2、Check whether the account is created according to the user

```
// e2e/account_test.go
t.Log("check account is exist")
_, err := api.GetAccount(AccountSystemNamespace, UserName)
if err != nil {
		t.Fatalf(err.Error())
}

// api/account.go
func GetAccount(namespace string, name string) (*userv1.Account, error) {
	gvr := userv1.GroupVersion.WithResource("accounts")
	var account userv1.Account
	if err := baseapi.GetObject(namespace, name, gvr, &account); err != nil {
		return nil, err
	}
	return &account, nil
}

func GetObject(namespace string, name string, gvr schema.GroupVersionResource, out interface{}) error {
	client := GetDefaultDynamicClient()
	obj, err := client.Resource(gvr).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		return err
	}
	err = runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, out)
	if err != nil {
		return err
	}
	return nil
}
```



#### 3、finally you need to clear the created resources

```
// e2e/account_test.go
t.Cleanup(func() {
		t.Log("delete account")
		err := api.DeleteAccount(AccountSystemNamespace, UserName)
		if err != nil {
			t.Log(err)
		}

		t.Log("delete user")
		err = api.DeleteUser("", UserName)
		if err != nil {
			t.Log(err)
		}
	})
}

// api/user.go
func DeleteUser(namespace string, name string) error {
	_, err := baseapi.KubeDeleteFromTemplate(userYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}

// api/account.go
func DeleteAccount(namespace string, name string) error {
	_, err := baseapi.KubeDeleteFromTemplate(accountYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
	if err != nil {
		return err
	}
	return nil
}
```

