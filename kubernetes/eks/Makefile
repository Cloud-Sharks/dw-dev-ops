apply: apply_bank apply_user apply_transaction apply_underwriter
delete: delete_bank delete_user delete_transaction delete_underwriter

apply_bank:
	helm install bank-microservice . \
			--values secret.values.yml \
			--values microservice-values/bank.values.yml

apply_user:
	helm install user-microservice . \
		--values secret.values.yml \
		--values microservice-values/user.values.yml

apply_transaction:
	helm install transaction-microservice . \
		--values secret.values.yml \
		--values microservice-values/transaction.values.yml

apply_underwriter:
	helm install underwriter-microservice . \
		--values secret.values.yml \
		--values microservice-values/underwriter.values.yml

delete_bank:
	helm uninstall bank-microservice

delete_user:
	helm uninstall user-microservice

delete_transaction:
	helm uninstall transaction-microservice

delete_underwriter:
	helm uninstall underwriter-microservice