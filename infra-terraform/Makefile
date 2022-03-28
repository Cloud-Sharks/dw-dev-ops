.ONESHELL:
apply_dev:
	cd dev

	JSON_OUTPUT=tfoutput.json

	terraform apply -auto-approve
	terraform output -json > $$JSON_OUTPUT

	aws s3 mv $$JSON_OUTPUT s3://dw-infra-bucket/terraform/$$JSON_OUTPUT