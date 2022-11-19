# imagehub CRD introduction
k8s crd created based on kubebuilder, consists of api and controller, refer to PROJECT for further development.
The api is divided into cr and webhook. imagehub cr includes Image, Repository, Organization, Datapack; webhook includes the Validate check and default fill of cr's cud.

## Image Repository Organization Design
Image will sync information in the controller to Repository, and Repository will sync information to Organization.
All three cr's are created with a table to allow Datapack to find resources by table.
There is no need to create a repo/org cr, the image cr is automatically synchronised with the new one: apply image.yaml to see the uploaded image cr information in the imagehub gui on the sealos cloud.

### e.g
```yaml
apiVersion: imagehub.sealos.io/v1
kind: Image
metadata:
  name: labring.mysql.v8.0.25
  namespace: sealos-imagehub
spec:
  name: labring/mysql:v8.0.25
  detail:
    url: www.mysql.com
    keywords: [ mysql, database, operator ]
    description: MySQL is the world's most popular open source database.
    icon: MySQL icon
    docs: MySQL docs
    ID: MySQL ID
    arch: MySQL arch
```

## Datapack Design
It is worth noting that Datapack is an api for information collections, and is responsible for consolidating and exposing all the information under imagehub.

The Datapack controller will immediately return Status.code=PENDING, after which
The Datapack controller will immediately return Status.code=PENDING, and afterwards the data will be updated to Status according to the other cr aggregation information in the imagehub.

sealos cloud uses the hash of the Datapack's spec as the Datapack's metadata.name, which supports "caching" when multiple users are getting the same Datapack.
### e.g
```yaml
apiVersion: imagehub.sealos.io/v1
kind: DataPack
metadata:
  name: datapack-detail-sample
  namespace: sealos-imagehub
spec:
  type: detail
  names:
    - labring/mysql:v8.0.25
    - labring/mysql:v8.0.31 
```


Translated with www.DeepL.com/Translator (free version)