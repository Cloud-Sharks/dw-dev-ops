include .env

login:
	aws ecr get-login-password --region ${ECR_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com
