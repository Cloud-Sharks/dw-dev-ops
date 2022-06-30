include .env
init: configure install
install: install_bank install_user install_transaction install_underwriter
uninstall: uninstall_bank uninstall_user uninstall_transaction uninstall_underwriter
upgrade: upgrade_bank upgrade_user upgrade_transaction upgrade_underwriter

define helm
	helm $1 $2-$3 . \
		--values microservice-values/$2.values.yml \
		--set deployment=$3 \
		--set ports.nodePort=$4
endef

configure:
	-kubectl create secret generic microservice-secrets --from-env-file .env

install_bank_green:
	-$(call helm,install,bank,green,30001)

install_bank_blue:
	-$(call helm,install,bank,blue,31001)

install_user:
	-$(call helm,install,user)

install_transaction:
	-$(call helm,install,transaction)

install_underwriter:
	-$(call helm,install,underwriter)

uninstall_bank:
	-helm uninstall bank-microservice

uninstall_user:
	-helm uninstall user-microservice

uninstall_transaction:
	-helm uninstall transaction-microservice

uninstall_underwriter:
	-helm uninstall underwriter-microservice

# upgrade_bank:
# 	-$(call helm,upgrade,bank)

# upgrade_user:
# 	-$(call helm,upgrade,user)

# upgrade_transaction:
# 	-$(call helm,upgrade,transaction)

# upgrade_underwriter:
# 	-$(call helm,upgrade,underwriter)
