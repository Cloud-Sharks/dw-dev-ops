.ONESHELL:
apply_dev:
	cd dev

	KEY_NAME=tfoutput
	JSON_OUTPUT=tfoutput.json

	terraform apply
	terraform output -json > $$JSON_OUTPUT

	BUCKET_NAME=`aws s3 ls | grep -oP '\bdw-infra-.+?\b'`
	aws s3 mv $$JSON_OUTPUT s3://$$BUCKET_NAME/$$JSON_OUTPUT