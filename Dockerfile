FROM --platform=$BUILDPLATFORM golang:1.17 as builder

ARG TARGETARCH

WORKDIR /work
COPY . /work

RUN GOOS=linux GOARCH=$TARGETARCH make build

