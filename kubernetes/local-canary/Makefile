init: configure install

install_v1: install_bank_v1 install_user_v1 install_transaction_v1 install_underwriter_v1
install_v2: install_bank_v2 install_user_v2 install_transaction_v2 install_underwriter_v2

uninstall_v1: uninstall_bank_v1 uninstall_user_v1 uninstall_transaction_v1 uninstall_underwriter_v1
uninstall_v2: uninstall_bank_v2 uninstall_user_v2 uninstall_transaction_v2 uninstall_underwriter_v2

upgrade_v1: upgrade_bank_v1 upgrade_user_v1 upgrade_transaction_v1 upgrade_underwriter_v1
upgrade_v2: upgrade_bank_v2 upgrade_user_v2 upgrade_transaction_v2 upgrade_underwriter_v2

uninstall_all: uninstall_bank_v1 uninstall_bank_v2 uninstall_user_v1 uninstall_user_v2 uninstall_transaction_v1 uninstall_transaction_v2 uninstall_underwriter_v1 uninstall_underwriter_v2
install_all: install_bank_v1 install_bank_v2 install_user_v1 install_user_v2 install_transaction_v1 install_transaction_v2 install_underwriter_v1 install_underwriter_v2

define helm
	helm $1 $2-microservice-$3 . \
		--namespace default \
		--set version=$3 \
		--set namespace=$3 \
		--values microservice-values/$2.values.yml
endef

delete_secrets:
	-kubectl delete secret microservice-secrets -n v1
	-kubectl delete secret microservice-secrets -n v2

configure:
	-kubectl create ns v1
	-kubectl create ns v2

	-kubectl create secret generic microservice-secrets --from-env-file .env -n v1
	-kubectl create secret generic microservice-secrets --from-env-file .env -n v2

	helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
	helm repo update

	-helm install nginx-ingress ingress-nginx/ingress-nginx --version 4.2.0
	kubectl apply -R -f config

install_bank_v1:
	-$(call helm,install,bank,v1)

install_bank_v2:
	-$(call helm,install,bank,v2)

install_user_v1:
	-$(call helm,install,user,v1)

install_user_v2:
	-$(call helm,install,user,v2)

install_transaction_v1:
	-$(call helm,install,transaction,v1)

install_transaction_v2:
	-$(call helm,install,transaction,v2)

install_underwriter_v1:
	-$(call helm,install,underwriter,v1)

install_underwriter_v2:
	-$(call helm,install,underwriter,v2)

upgrade_bank_v1:
	-$(call helm,upgrade,bank,v1)

upgrade_bank_v2:
	-$(call helm,upgrade,bank,v2)

upgrade_user_v1:
	-$(call helm,upgrade,user,v1)

upgrade_user_v2:
	-$(call helm,upgrade,user,v2)

upgrade_transaction_v1:
	-$(call helm,upgrade,transaction,v1)

upgrade_transaction_v2:
	-$(call helm,upgrade,transaction,v2)

upgrade_underwriter_v1:
	-$(call helm,upgrade,underwriter,v1)

upgrade_underwriter_v2:
	-$(call helm,upgrade,underwriter,v2)

uninstall_bank_v1:
	-helm uninstall bank-microservice-v1 --namespace default

uninstall_bank_v2:
	-helm uninstall bank-microservice-v2 --namespace default

uninstall_user_v1:
	-helm uninstall user-microservice-v1 --namespace default

uninstall_user_v2:
	-helm uninstall user-microservice-v2 --namespace default

uninstall_transaction_v1:
	-helm uninstall transaction-microservice-v1 --namespace default

uninstall_transaction_v2:
	-helm uninstall transaction-microservice-v2 --namespace default

uninstall_underwriter_v1:
	-helm uninstall underwriter-microservice-v1 --namespace default

uninstall_underwriter_v2:
	-helm uninstall underwriter-microservice-v2 --namespace default
