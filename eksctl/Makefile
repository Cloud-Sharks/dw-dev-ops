include .env
init: create_cluster create_node_group create_fargate_profile install_ascp lbInstall upload_kube_config
createPolicies: create_iam_policies
lbInstall: set_context create_service_accounts apply_load_balancer

create_cluster:
	eksctl create cluster \
		--name ${clusterName} \
		--region ${region} \
		--full-ecr-access \
		--alb-ingress-access \
		--without-nodegroup \
		--vpc-nat-mode Single \

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
		--node-type t3.small \
		--nodes 2 \
		--nodes-min 1 \
		--nodes-max 5 \
		--full-ecr-access \
		--alb-ingress-access

	eksctl create nodegroup \
		--name ${privateNgName} \
		--node-private-networking \
		--cluster ${clusterName} \
		--region ${region} \
		--node-type t2.small \
		--nodes-min 1 \
		--nodes-max 5 \
		--full-ecr-access \
		--alb-ingress-access

create_fargate_profile:
	eksctl create fargateprofile \
		--cluster ${clusterName} \
		--region ${region} \
		--name ${fargateProfileName} \
		--namespace ${fargateNamespace}

#TODO: Add repo commands and pipe result into /dev/null
install_ascp:
	helm install -n kube-system csi-secrets-store secrets-store-csi-driver/secrets-store-csi-driver --set syncSecret.enabled=true

clean:
	eksctl delete cluster \
		--name ${clusterName} \
		--region ${region} \
		--force

create_iam_policies:
	aws iam create-policy \
		--policy-name ${albPolicyName} \
		--policy-document file://${albPolicyDocument}

	aws iam create-policy \
		--policy-name ${containerSecretPolicyName} \
		--policy-document file://${containerSecretPolicyDocument}

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

# Container Secret Service Account
	eksctl create iamserviceaccount \
		--cluster=${clusterName} \
		--region=${region} \
		--namespace=${containerSecretNamespace} \
		--name=${containerSecretServiceAccountName} \
		--attach-policy-arn=arn:aws:iam::${accountId}:policy/${containerSecretPolicyName} \
		--override-existing-serviceaccounts \
		--approve

#TODO: Add repo commands and pipe result into /dev/null
apply_load_balancer:
	helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
		-n kube-system \
		--set clusterName=${clusterName} \
		--set serviceAccount.create=false \
		--set serviceAccount.name=${albServiceAccountName}

upload_kube_config:
	BUCKET_NAME=`aws s3 ls | grep -oE '\b${s3BucketPrefix}.*\b'` && \
	kubectl config view --minify > kubeconfig.yml && \
	aws s3 cp kubeconfig.yml s3://$$BUCKET_NAME/kubeconfig.yml
