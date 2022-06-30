include .env
init: configure install

install_green: install_bank_green install_user_green install_transaction_green install_underwriter_green
install_blue: install_bank_blue install_user_blue install_transaction_blue install_underwriter_blue

uninstall_green: uninstall_bank_green uninstall_user_green uninstall_transaction_green uninstall_underwriter_green
uninstall_blue: uninstall_bank_blue uninstall_user_blue uninstall_transaction_blue uninstall_underwriter_blue

upgrade_green: upgrade_bank_green upgrade_user_green upgrade_transaction_green upgrade_underwriter_green
upgrade_blue: upgrade_bank_blue upgrade_user_blue upgrade_transaction_blue upgrade_underwriter_blue

define helm
	helm $1 $2-$3 . \
		--values microservice-values/$2.values.yml \
		--set deployment=$3 \
		--set ports.nodePort=$4
endef

configure:
	-kubectl create secret generic microservice-secrets --from-env-file .env

################################################################################
# Install
################################################################################

install_bank_green:
	-$(call helm,install,bank,green,30001)

install_bank_blue:
	-$(call helm,install,bank,blue,31001)

install_user_green:
	-$(call helm,install,user,green,30000)

install_user_blue:
	-$(call helm,install,user,blue,31000)

install_transaction_green:
	-$(call helm,install,transaction,green,30002)

install_transaction_blue:
	-$(call helm,install,transaction,blue,31002)

install_underwriter_green:
	-$(call helm,install,underwriter,green,30003)

install_underwriter_blue:
	-$(call helm,install,underwriter,blue,31003)

################################################################################
# Upgrade
################################################################################

upgrade_bank_green:
	-$(call helm,upgrade,bank,green,30001)

upgrade_bank_blue:
	-$(call helm,upgrade,bank,blue,31001)

upgrade_user_green:
	-$(call helm,upgrade,user,green,30000)

upgrade_user_blue:
	-$(call helm,upgrade,user,blue,31000)

upgrade_transaction_green:
	-$(call helm,upgrade,transaction,green,30002)

upgrade_transaction_blue:
	-$(call helm,upgrade,transaction,blue,31002)

upgrade_underwriter_green:
	-$(call helm,upgrade,underwriter,green,30003)

upgrade_underwriter_blue:
	-$(call helm,upgrade,underwriter,blue,31003)

################################################################################
# Uninstall
################################################################################

uninstall_bank_green:
	-helm uninstall bank-green

uninstall_bank_blue:
	-helm uninstall bank-blue

uninstall_user_blue:
	-helm uninstall user-blue

uninstall_user_green:
	-helm uninstall user-green

uninstall_transaction_blue:
	-helm uninstall transaction-blue

uninstall_transaction_green:
	-helm uninstall transaction-green

uninstall_underwriter_blue:
	-helm uninstall underwriter-blue

uninstall_underwriter_green:
	-helm uninstall underwriter-green