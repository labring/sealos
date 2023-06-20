## Notification

Notification center of Sealos Cloud,Other controllers will send notification CR to user namespace.

```go
type NotificationSpec struct {
    Title      string json:"title"  
    Message    string json:"message" 
    TimeStamp  int64  json:"timestamp"
    From       string json:"from,omitempty" // from which controller send the notification
    Importance Type   json:"importance,omitempty"
}
```

Frontend need to know the notification is read or unread，will using label to select,label key is `isRead`,value is True/False.

How to deploy
```shell
kubectl apply -f deploy/manifests/deploy.yaml
```