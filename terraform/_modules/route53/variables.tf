variable "ec2_configs" {
  type = map(object({
    name          = string
    ports         = set(number)
    instance_type = string
    volume_size   = number
    domains       = set(string)
  }))
}

variable "hosted_zone" {
  type        = string
  description = "Value of the zone to host domains in"
}

variable "vpc_id" {
  type        = string
  description = "Name of the VPC to create the security groups in"
}
