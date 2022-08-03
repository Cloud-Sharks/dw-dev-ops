variable "ec2_configs" {
  type = map(object({
    name          = string
    ports         = set(number)
    instance_type = string
    volume_size   = number
  }))
}

variable "public_subnet_id" {
  type        = string
  description = "Public Subnet"
}

variable "vpc_id" {
  type        = string
  description = "Name of the VPC to create the security groups in"
}

variable "tags" {
  type    = map(string)
  default = {}
}
