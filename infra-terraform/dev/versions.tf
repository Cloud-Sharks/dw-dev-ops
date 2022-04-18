terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.2.0"
    }
  }

  backend "s3" {
    bucket  = "dw-infra-bucket"
    key     = "terraform/state/tf-state-dev"
    region  = "us-east-1"
    profile = "dw-jenkins"
  }

  required_version = ">= 0.14.9"
}
