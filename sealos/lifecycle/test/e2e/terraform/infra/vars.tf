variable "name" {
  default = "kubernetes-tf"
}

variable "zone" {
  default = "cn-hongkong-b"
}

variable "region" {
  default = "cn-hongkong"
}

variable "resource_group_id" {
  default = "rg-aek2rlg23xjy2jq"
}

variable "image_id" {
  default = "ubuntu_22_04_x64_20G_alibase_20230613.vhd"
}

variable "ecs_type" {
  default = "ecs.g7.xlarge"
}

variable "ecs_password" {
  default = "Fanux#123"
}

variable "disk_category" {
  default = "cloud_essd"
}
