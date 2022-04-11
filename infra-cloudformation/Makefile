.ONESHELL:
define cloudformation
	DEFAULT_VPC_ID=`aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query 'Vpcs[*].VpcId' --output text`

	aws cloudformation $1 \
		--stack-name dw-cf-infra \
		--template-body file:///$$PWD/infrastructure.yml \
		--tags \
			Key=owner,Value=David \
			Key=Environment,Value=Dev \
			Key=Name,Value=dw-cf-infra \
		--parameters \
			ParameterKey=Environment,ParameterValue=dev \
			ParameterKey=VpcCidrBlock,ParameterValue=10.0.0.1/16 \
			ParameterKey=DefaultVpcId,ParameterValue=$$DEFAULT_VPC_ID \
			ParameterKey=BastionImageId,ParameterValue=ami-04505e74c0741db8d
endef

create:
	$(call cloudformation,create-stack)

update:
	$(call cloudformation,update-stack)