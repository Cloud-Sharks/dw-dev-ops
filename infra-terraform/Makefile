.ONESHELL:
apply_dev:
	cd dev

	KEY_NAME=tfoutput
	JSON_OUTPUT=tfoutput.json

	terraform apply
	terraform output -json > $$JSON_OUTPUT
	aws secretsmanager put-secret-value --secret-id $$KEY_NAME --secret-string file://$$JSON_OUTPUT|| \
		aws secretsmanager create-secret --name $$KEY_NAME --secret-string file://$$JSON_OUTPUT
	rm $$JSON_OUTPUT