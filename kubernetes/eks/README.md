# Aline Kubernetes Deployment

Helm deployment of the Aline Financial Application

## Deployment

- Change directory to root directory of this readme
- Copy the text from `.env.example` into a new file called `.env`
- Fill out the values
- Apply the configuration to the cluster with `eksctl apply -R -f eks-config`
- Run `make install` to install all the microservices
