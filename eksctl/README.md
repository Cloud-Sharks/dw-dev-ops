# EKS Cluster Setup

## Prerequisites

- Make sure to initialize the terraform infrastructure first

## Deployment

- Change directory to root directory of this readme
- If no policy was created, run `make create_policies`. It will fail if a policy already exists which is okay
- Run `make init` to install nodegroups, a fargate profile and an aws load balancer to the cluster
