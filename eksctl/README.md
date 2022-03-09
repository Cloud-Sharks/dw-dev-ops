# EKS Cluster Setup

- Change directory to root directory of this readme
- If no policy was created, run `make lbInit`. It will fail if a policy already exists which is okay
- Run `make init` to install nodegroups, a fargate profile and an aws load balancer to the cluster
