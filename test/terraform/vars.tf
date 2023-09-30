variable "name" {
  default = "kubernetes-tf"
}

variable "zone" {
  default = "cn-hongkong-b"
}

variable "region" {
  default = "cn-hongkong"
}

variable "image_id" {
  #  default = "ubuntu_22_04_arm64_20G_alibase_20230712.vhd"
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
