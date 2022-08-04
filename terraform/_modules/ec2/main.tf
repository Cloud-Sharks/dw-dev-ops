################################################################################
# Security Groups
################################################################################

resource "aws_security_group" "groups" {
  for_each = var.ec2_configs

  name   = each.value.name
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = each.value.ports
    iterator = ports

    content {
      from_port   = ports.value
      to_port     = ports.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = merge({ Name = each.value.name }, var.tags)
}

################################################################################
# Instance AMI
################################################################################

data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["099720109477"] # Canonical
}

################################################################################
# Instance
################################################################################

resource "aws_instance" "instances" {
  for_each               = var.ec2_configs
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = each.value.instance_type
  subnet_id              = var.public_subnet_id
  vpc_security_group_ids = [for g in aws_security_group.groups : g.id if g.tags_all.Name == each.value.name]
  key_name               = var.key_name

  root_block_device {
    volume_size = each.value.volume_size
    tags        = merge({ Name = each.value.name }, var.tags)
  }

  tags = merge({ Name = each.value.name }, var.tags)
}

################################################################################
# Route 53
################################################################################

data "aws_instance" "instance_data" {
  for_each = var.ec2_configs

  filter {
    name   = "tag:Name"
    values = [each.value.name]
  }

  filter {
    name   = "instance-state-name"
    values = ["pending", "running"]
  }

  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }

  depends_on = [
    aws_instance.instances
  ]
}

locals {
  domain_ip_pairs = flatten([
    for ec2_key, config in var.ec2_configs : [
      for domain in config.domains : {
        domain_name = domain
        ip_address  = data.aws_instance.instance_data[ec2_key].public_ip
      }
    ]
  ])
}

data "aws_route53_zone" "main" {
  name = var.hosted_zone
}

resource "aws_route53_record" "record" {
  count   = length(local.domain_ip_pairs)
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${local.domain_ip_pairs[count.index].domain_name}.${var.hosted_zone}"
  records = [local.domain_ip_pairs[count.index].ip_address]
  type    = "A"
  ttl     = 300
}
