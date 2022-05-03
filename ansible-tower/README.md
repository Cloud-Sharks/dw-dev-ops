# Ansible Tower (AWX)

## Prerequisites

- Minikube installed
- Kustomize installed

## Setup

> Make sure to run the kubernetes commands in the `awx` namespace

- Run `kustomize build . | kubectl apply -f -` to apply services
  - Might have to run it twice if you get an error
- Run `kubectl get secret -n awx dw-awx-admin-password -o jsonpath="{.data.password}" | base64 --decode` to get the admin password
- Run `minikube service dw-awx-service --url -n awx` to get the url of the service and login with the password
