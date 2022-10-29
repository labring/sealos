### How to build container image
1. fix makefile build step 
    ```makefile
   .PHONY: build
    build:## Build manager binary.
    CGO_ENABLED=0 go build -o bin/manager main.go
    ```
2. build amd64 bin and arm64 bin
   - amd64 bin
   ```
   GOARCH=amd64 make build
   mv bin/manager bin/controller-${{ matrix.module }}-amd64
   chmod +x bin/controller-${{ matrix.module }}-amd64
   ```
   - arm64 bin
   ```
   GOARCH=arm64 make build
   mv bin/manager bin/controller-${{ matrix.module }}-arm64
   chmod +x bin/controller-${{ matrix.module }}-arm64
   ```
3. fix dockerfile
   ```dockerfile
   FROM gcr.io/distroless/static:nonroot
   ARG TARGETARCH
   
   WORKDIR /
   USER 65532:65532
   
   COPY bin/controller-${{ matrix.module }}-$TARGETARCH /manager
   ENTRYPOINT ["/manager"]
   ```
   tips: .dockerignore not add bin dir
4. docker buildx
   ```shell
   docker buildx build \
      --platform linux/amd64,linux/arm64 \
      --push \
      -t ${DOCKER_REPO}:${{ steps.prepare.outputs.tag_name }} \
      -f Dockerfile \
      .
   ```
