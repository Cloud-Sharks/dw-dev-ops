# Aline Kubernetes Deployment

Helm deployment of the Aline Financial Application

## Deployment

- Change directory to root directory of this readme
- Copy the text from `secret.values.yml.example` into a new file called `secret.values.yml`
- Fill out the values
- Apply the configuration to the cluster with `eksctl apply -R -f eks-config`
- Run `Make install` to install the microservices
