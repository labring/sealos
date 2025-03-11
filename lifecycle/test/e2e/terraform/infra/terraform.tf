resource "alicloud_vpc" "vpc" {
  vpc_name          = "${var.name}-vpc"
  cidr_block        = "172.16.0.0/12"
  resource_group_id = var.resource_group_id
}

resource "alicloud_vswitch" "vsw" {
  vswitch_name      = "${var.name}-vsw"
  vpc_id            = alicloud_vpc.vpc.id
  cidr_block        = "172.16.0.0/21"
  zone_id           = var.zone
  //resource_group_id = var.resource_group_id
}

resource "alicloud_security_group" "default" {
  name              = var.name
  vpc_id            = alicloud_vpc.vpc.id
  resource_group_id = var.resource_group_id
}

resource "alicloud_security_group_rule" "allow_all_tcp" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "1/65535"
  priority          = 1
  security_group_id = alicloud_security_group.default.id
  cidr_ip           = "0.0.0.0/0"
}


resource "alicloud_instance" "sealos" {
  instance_name              = "${var.name}-sealos"
  count                      = 1
  availability_zone          = var.zone
  security_groups            = [alicloud_security_group.default.id]
  instance_type              = var.ecs_type
  system_disk_category       = var.disk_category
  system_disk_size           = 50
  password                   = var.ecs_password
  image_id                   = var.image_id
  vswitch_id                 = alicloud_vswitch.vsw.id
  resource_group_id          = var.resource_group_id
  internet_max_bandwidth_out = 100
  instance_charge_type       = "PostPaid"
  spot_strategy              = "SpotAsPriceGo"
}

resource "alicloud_instance" "kube" {
  instance_name              = "${var.name}-kube-${count.index}"
  count                      = 6
  availability_zone          = var.zone
  security_groups            = [alicloud_security_group.default.id]
  instance_type              = var.ecs_type
  system_disk_category       = var.disk_category
  system_disk_size           = 50
  password                   = var.ecs_password
  image_id                   = var.image_id
  vswitch_id                 = alicloud_vswitch.vsw.id
  resource_group_id          = var.resource_group_id
  internet_max_bandwidth_out = 0
  instance_charge_type       = "PostPaid"
  spot_strategy              = "SpotAsPriceGo"
}

