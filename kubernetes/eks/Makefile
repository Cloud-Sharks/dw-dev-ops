include .env
install: install_bank install_user install_transaction install_underwriter
uninstall: uninstall_bank uninstall_user uninstall_transaction uninstall_underwriter
upgrade: upgrade_bank upgrade_user upgrade_transaction upgrade_underwriter

install_bank:
	helm install bank-microservice . \
			--set aws.ecrRepository=${ECR_REPOSITORY} \
			--values microservice-values/bank.values.yml

install_user:
	helm install user-microservice . \
		--set aws.ecrRepository=${ECR_REPOSITORY} \
		--values microservice-values/user.values.yml

install_transaction:
	helm install transaction-microservice . \
		--set aws.ecrRepository=${ECR_REPOSITORY} \
		--set aws.ecrRepository=${ECR_REPOSITORY} \
		--values microservice-values/transaction.values.yml

install_underwriter:
	helm install underwriter-microservice . \
		--set aws.ecrRepository=${ECR_REPOSITORY} \
		--values microservice-values/underwriter.values.yml

uninstall_bank:
	helm uninstall bank-microservice

uninstall_user:
	helm uninstall user-microservice

uninstall_transaction:
	helm uninstall transaction-microservice

uninstall_underwriter:
	helm uninstall underwriter-microservice

upgrade_bank:
	helm upgrade bank-microservice . \
		--set aws.ecrRepository=${ECR_REPOSITORY} \
		--values microservice-values/bank.values.yml

upgrade_user:
	helm upgrade user-microservice . \
		--set aws.ecrRepository=${ECR_REPOSITORY} \
		--values microservice-values/user.values.yml

upgrade_transaction:
	helm upgrade transaction-microservice . \
		--set aws.ecrRepository=${ECR_REPOSITORY} \
		--values microservice-values/transaction.values.yml

upgrade_underwriter:
	helm upgrade underwriter-microservice . \
			--set aws.ecrRepository=${ECR_REPOSITORY} \
			--values microservice-values/underwriter.values.yml

