# Terraform Base infractructure

Base infrastructure to deploy the Aline Financial application

# Requirements

- Terraform 4.2.0 or greater

# Setup

## Install

- Run `terraform init` to install modules

## Configure

- Go into [assets/secret](assets/secret)
- Make a copy of every file that ends with `.example`, but omit `.example`.
  - Example: `.ecs.env.example` becomes `.ecs.env`
- Fill out the blanks with the appropiate values

# Deployment

- Run `terraform apply` to create resources
