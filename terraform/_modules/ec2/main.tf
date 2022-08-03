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
  for_each        = var.ec2_configs
  ami             = data.aws_ami.ubuntu.id
  instance_type   = each.value.instance_type
  subnet_id       = var.public_subnet_id
  security_groups = [for g in aws_security_group.groups : g.id if g.tags_all.Name == each.value.name]

  root_block_device {
    volume_size = each.value.volume_size
  }

  tags = merge({ Name = each.value.name }, var.tags)
}
