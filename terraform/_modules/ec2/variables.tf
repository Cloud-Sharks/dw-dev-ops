variable "ec2_configs" {
  type = map(object({
    name          = string
    ports         = set(number)
    instance_type = string
    volume_size   = number
    domains       = set(string)
  }))
}

variable "public_subnet_id" {
  type        = string
  description = "Public Subnet to host instances in"
}

variable "vpc_id" {
  type        = string
  description = "Name of the VPC to create the security groups in"
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "hosted_zone" {
  type        = string
  description = "Value of the zone to host domains in"
}

variable "key_name" {
  type        = string
  description = "Name of the key pair to ssh into instances with"
}
