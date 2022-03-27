.ONESHELL:
apply_dev:
	cd dev

	KEY_NAME=tfoutput
	JSON_OUTPUT=tfoutput.json

	terraform apply -auto-approve
	terraform output -json > $$JSON_OUTPUT

	BUCKET_NAME=`dw-infra-bucket`
	aws s3 mv $$JSON_OUTPUT s3://$$BUCKET_NAME/$$JSON_OUTPUT