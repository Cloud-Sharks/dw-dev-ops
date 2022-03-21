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

resource "aws_instance" "bastion" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = var.public_subnet_id
  key_name               = var.key_name
  vpc_security_group_ids = var.security_group_ids
  user_data              = <<EOF
#!/bin/bash
echo "EDITOR=vim" >> .bashrc
sudo apt update && sudo apt upgrade -y
sudo apt install mysql-client-core-8.0
EOF

  tags = merge({ Name = "DW Bastion" }, var.tags)
}
