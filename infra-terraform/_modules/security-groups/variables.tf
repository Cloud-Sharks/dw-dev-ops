variable "vpc_id" {
  type        = string
  description = "Name of the VPC to create the security groups in"
}

variable "tags" {
  type    = map(string)
  default = {}
}
