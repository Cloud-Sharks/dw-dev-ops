include .env
init: create_iam_policies create_cluster create_node_group install_services install_externaldns install_fluentbit
install_services: add_helm_repos create_service_accounts install_load_balancer

SHELL := /bin/bash

.ONESHELL:
create_cluster:
	aws secretsmanager get-secret-value --region ${region} --secret-id dw-tf-output --query "SecretString" --output text > tfoutput.json || exit 1

	PUBLIC_SUBNETS=`cat tfoutput.json | jq -r .public_subnet_ids[] | xargs echo | sed 's: :,:g'`
	PRIVATE_SUBNETS=`cat tfoutput.json | jq -r .private_subnet_ids[] | xargs echo | sed 's: :,:g'`
	rm tfoutput.json

	eksctl create cluster \
		--name ${clusterName} \
		--region ${region} \
		--vpc-public-subnets=$$PUBLIC_SUBNETS \
		--vpc-private-subnets=$$PRIVATE_SUBNETS \
		--without-nodegroup

	eksctl utils update-cluster-logging --region ${region} --cluster ${clusterName} --enable-types all --approve

set_context:
	eksctl utils write-kubeconfig \
		--region ${region} \
		--cluster ${clusterName} \
		--set-kubeconfig-context

create_node_group:
	eksctl create nodegroup \
		--name ${publicNgName} \
		--cluster ${clusterName} \
		--region ${region} \
		--node-type t3a.medium \
		--nodes 3 \
		--nodes-min 1 \
		--nodes-max 4 \
		--full-ecr-access \
		--alb-ingress-access

create_fargate_profile:
	eksctl create fargateprofile \
		--cluster ${clusterName} \
		--region ${region} \
		--name ${fargateProfileName} \
		--namespace ${fargateNamespace}

clean:
	eksctl delete cluster \
		--name ${clusterName} \
		--region ${region} \
		--force \
		--wait

create_iam_policies:
	-aws iam create-policy \
		--policy-name ${albPolicyName} \
		--policy-document file://${albPolicyDocument}

	-aws iam create-policy \
		--policy-name ${fluentBitPolicyName} \
		--policy-document file://${fluentBitPolicyDocument}

	-aws iam create-policy \
		--policy-name ${externalDnsPolicyName} \
		--policy-document file://${externalDnsPolicyDocument}

create_service_accounts:
	eksctl utils associate-iam-oidc-provider \
		--region=${region} \
		--cluster=${clusterName} \
		--approve

# Load Balancer Service Account
	eksctl create iamserviceaccount \
		--cluster=${clusterName} \
		--region=${region} \
		--namespace=kube-system \
		--name=${albServiceAccountName} \
		--attach-policy-arn=arn:aws:iam::${accountId}:policy/${albPolicyName} \
		--override-existing-serviceaccounts \
		--approve

# Fluentbit Service Account
	eksctl create iamserviceaccount \
		--cluster=${clusterName} \
		--region=${region} \
		--namespace=${fluentbitNamespace} \
		--name=${fluentbitServiceAccountName} \
		--attach-policy-arn=arn:aws:iam::${accountId}:policy/${fluentBitPolicyName} \
		--override-existing-serviceaccounts \
		--approve

# External DNS Service Account
	eksctl create iamserviceaccount \
		--cluster ${clusterName} \
		--region=${region} \
		--namespace ${externalDnsNamespace} \
		--name ${externalDnsServiceAccountName} \
		--attach-policy-arn arn:aws:iam::${accountId}:policy/${externalDnsPolicyName} \
		--approve

add_helm_repos:
	-helm repo add eks https://aws.github.io/eks-charts
	-helm repo add secrets-store-csi-driver https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts
	helm repo update

install_load_balancer:
	helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
		-n kube-system \
		--set clusterName=${clusterName} \
		--set serviceAccount.create=false \
		--set serviceAccount.name=${albServiceAccountName}

install_externaldns:
	kubectl apply -f yaml/external-dns.yml

.ONESHELL:
install_fluentbit:
	kubectl apply -f yaml/amazon-cloudwatch-ns.yml

	ClusterName=${clusterName}
	RegionName=${region}
	FluentBitHttpPort='2020'
	FluentBitReadFromHead='Off'

	[[ $$FluentBitReadFromHead = 'On' ]] && FluentBitReadFromTail='Off'|| FluentBitReadFromTail='On'
	[[ -z $$FluentBitHttpPort ]] && FluentBitHttpServer='Off' || FluentBitHttpServer='On'

	kubectl create configmap fluent-bit-cluster-info \
		-n amazon-cloudwatch \
		--from-literal=cluster.name=$$ClusterName \
		--from-literal=http.server=$$FluentBitHttpServer \
		--from-literal=http.port=$$FluentBitHttpPort \
		--from-literal=read.head=$$FluentBitReadFromHead \
		--from-literal=read.tail=$$FluentBitReadFromTail \
		--from-literal=logs.region=$$RegionName

	kubectl apply -f yaml/fluentbit.yml

update_env:
	aws s3 cp .env s3://dw-infra-bucket/env/.eksctl.env