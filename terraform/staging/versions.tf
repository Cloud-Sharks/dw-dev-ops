terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.2.0"
    }
  }

  backend "s3" {
    bucket  = "terraform-s3-dw"
    key     = "tf-state-staging"
    region  = "us-east-2"
    profile = "default"
  }

  required_version = ">= 0.14.9"
}
