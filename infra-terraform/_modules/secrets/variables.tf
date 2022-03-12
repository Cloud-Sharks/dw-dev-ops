variable "environment" {
  type        = string
  description = "Deployment Environment"
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "secret_key" {
  type        = string
  description = "Secret key"
}

variable "secret_json" {
  type        = string
  description = "Path to the json secret to store"
}
