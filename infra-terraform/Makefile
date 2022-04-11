.ONESHELL:
define apply
	JSON_OUTPUT=tfoutput.json

	terraform -chdir=$1 apply -auto-approve
	terraform -chdir=$1 output -json > $$JSON_OUTPUT

	aws s3 mv $$JSON_OUTPUT s3://dw-infra-bucket/terraform/$$JSON_OUTPUT
endef

define plan
	terraform -chdir=$1 plan
endef

plan_dev:
	$(call plan,dev)

apply_dev:
	$(call apply,dev)

