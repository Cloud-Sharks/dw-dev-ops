variable "environment" {
  type        = string
  description = "Deployment Environment"
}

variable "tags" {
  type    = map(string)
  default = {}
}
