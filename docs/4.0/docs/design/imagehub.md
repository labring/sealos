# imagehub

## Function splitting

Provide image hub functionality on the sealos cloud and on the sealos command line

- p0 image hub basic presentation and CRUD functionality
    - p0 baseInfo and user-supplied detailInfo display
    - p0 search support, priority: repo name, keyword
    - p1 Maintain a latest tag image for each repo by last upload time
    - p2 Support for adding images to the cloud UI, providing a page for users to add images and DetailInfo
    - p2 Support for modifying image info on cloud based on the original info of an image, based on the previous function
    - p2 applyCRD when the user does not provide information such as imageID/imageArch, ~~ get the image information through buildah ~~
- p0 support for sealos push image to generate imageDetailInfo based on the files in the image
- p1 support imageCRD add/delete when border case of RepoCRD add/delete
- p1 support for org creation, sharing, pull/push permissions for creator and binding users, and pull permissions for others; i.e. org<->user for n-to-n relationships
- p2 image compatibility: when the image itself does not have README.md, sealos push image -o README.md parsing is supported, no need for developers to rebuild the image
- p2 sealos search image, can be implemented using registry's _catalog interface (to be discussed)?

## image hub design

### CRD structure design and definition

Imitate the docker hub structure, using sealos push labring/mysql-op:v1 as an example

**Org up for tenant permission control (via k8s binding and access control), down for repository collections**

- "labring" Organization Org
    - repositories list

**Repo maintains image tag list, needs to support automatic determination of whether an image is empty/exists when it is added or deleted to create it**

- "mysql-op" repositories Repo
    - tags list

**Img stores the image baseInfo and detailInfo, in the sealos push it will read the file in the image and load detailInfo, in the cluster CMD adding ImgCRD will need to be user defined**

- "labring/mysql-op:v1" Image Img
    - baseInfo
        - name: org + repo + tag
    - detailInfo
        - docs: md file.
        - keywords: srting list. used for searching in imagehub, needs to be added to the list
        - icon: url. Currently only public URLs are supported, default icons are supported on the front end
        - Description: string.
        - URL: url.
        - id: buildah inspect.
        - arch: buildah inspect.

### webhook & etc


## Mirror detailInfo related

### Mirror file retrieval

- Fetched during sealos push, see mount and merge operations during sealos push

### Mirror README.md convention

- The README.md convention is placed under the OS root directory

### User access to the sealos image hub process

- Login to register the cloud
- Check hub token or pw
- User command line execution: sealos login [hub.sealos.io](http://hub.sealos.io/) -u -p or -token
    - Download kubeconf to ${workdir}/.sealos/
- sealos push
    - [parse README.md in image](http://xn--imagereadme-418q735xn00bcz8c.md/), get img detail
    - client-go adds img crd using kubeconf
- diffuse
    - sealos search image
    - image compatibility: support sealos push image -o README.md parsing when the image itself does not have README.md

Translated with www.DeepL.com/Translator (free version)