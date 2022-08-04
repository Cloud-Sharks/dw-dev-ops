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
