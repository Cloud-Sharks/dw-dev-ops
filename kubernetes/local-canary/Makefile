init: configure install

install_v1: install_bank_v1 install_user_v1 install_transaction_v1 install_underwriter_v1
install_v2: install_bank_v2 install_user_v2 install_transaction_v2 install_underwriter_v2

uninstall_v1: uninstall_bank_v1 uninstall_user_v1 uninstall_transaction_v1 uninstall_underwriter_v1
uninstall_v2: uninstall_bank_v2 uninstall_user_v2 uninstall_transaction_v2 uninstall_underwriter_v2

uninstall_all: uninstall_bank_v1 uninstall_bank_v2 uninstall_user_v1 uninstall_user_v2 uninstall_transaction_v1 uninstall_transaction_v2 uninstall_underwriter_v1 uninstall_underwriter_v2
install_all: install_bank_v1 install_bank_v2 install_user_v1 install_user_v2 install_transaction_v1 install_transaction_v2 install_underwriter_v1 install_underwriter_v2

define helm
	helm $1 $2-microservice-$3 . \
		--set version=$3 \
		--values microservice-values/$2.values.yml
endef

configure:
	-kubectl create secret generic microservice-secrets --from-env-file .env

	helm repo add nginx-stable https://helm.nginx.com/stable
	helm repo update

	-helm install nginx-ingress nginx-stable/nginx-ingress
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

uninstall_bank_v1:
	-helm uninstall bank-microservice-v1

uninstall_bank_v2:
	-helm uninstall bank-microservice-v2

uninstall_user_v1:
	-helm uninstall user-microservice-v1

uninstall_user_v2:
	-helm uninstall user-microservice-v2

uninstall_transaction_v1:
	-helm uninstall transaction-microservice-v1

uninstall_transaction_v2:
	-helm uninstall transaction-microservice-v2

uninstall_underwriter_v1:
	-helm uninstall underwriter-microservice-v1

uninstall_underwriter_v2:
	-helm uninstall underwriter-microservice-v2
