# e2e 如何编写

## 为什么要进行 e2e 测试

因为有些测试需要在一定环境下面运行，不能简单的通过运行函数测试，需要多个组件协作，最后得出结果看符不符合预期。k8s 中 CRD 就有这种属性，需要部署到 k8s 集群之后看是否有自己期望的结果。

有能力的同学可以直接看 laf 的 [e2e测试code](https://github.com/labring/laf/blob/main/core/controllers/database/tests/e2e/db_create_test.go)

## quick start

有一个场景，user 创建后需要创建对应这个用户的 account ，需要去测试 user 创建后是否创建了 account

创建一个测试文件夹 test ,下面是文件结构

```
---testdata
      |----api // 放测试需要的func
      |----e2e //放测试文件

```

编写一个测试文件e2e/account_test.go

## 1、创建user

### 1.1 写出创建user的yaml

```go
const userYaml = `
apiVersion: user.sealos.io/v1
kind: User
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
  csrExpirationSeconds: 1000000000
`
```

### 1.2 创建user

```

func TestAccount(t *testing.T) {
	t.Run("accout should be ok", func(t *testing.T) {
			t.Log("create user ")
			api.CreateUser("", UserName)
	})
})

// 把name和namespace 渲染到yaml中并且 apply 到 k8s 中
func CreateUser(namespace string, name string) {
	baseapi.MustKubeApplyFromTemplate(userYaml, map[string]string{
		"namespace": namespace,
		"name":      name,
	})
}
```

## 2、检验 account 是否随着 user 创建被创建

```
// e2e/account_test.go
t.Log("check account is exist")
_, err := api.GetAccount(AccountSystemNamespace, UserName)
if err != nil {
		t.Fatalf(err.Error())
}

func GetAccount(namespace string, name string) (*userv1.Account, error) {
	gvr := userv1.GroupVersion.WithResource("accounts")
	var account userv1.Account
	if err := baseapi.GetObject(namespace, name, gvr, &account); err != nil {
		return nil, err
	}
	return &account, nil
}
```

## 3、最后需要清除创建的资源，清除生成的account和user

```
// e2e/account_test.go
t.Cleanup(func() {
		t.Log("delete account")
		api.DeleteAccount(AccountSystemNamespace, UserName)
		api.DeleteUser("", UserName)
	})
}

// api/user.go，
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
```