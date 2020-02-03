rm -rf ./build

PUBLIC_URL='https://staging.oasis.app/expired/trade' yarn build

# Deploy to AWS
sudo apt update
sudo apt install python-pip
pip install --upgrade --user awscli
export PATH=$HOME/.local/bin:$PATH

aws configure set default.region $STAGE_AWS_REGION
aws configure set default.output json
aws configure set aws_access_key_id $STAGE_AWS_ACCESS_KEY_ID
aws configure set aws_secret_access_key $STAGE_AWS_SECRET_ACCESS_KEY

aws s3 sync ./build s3://$STAGE_AWS_BUCKET_NAME/expired/trade/ --delete
aws cloudfront create-invalidation --distribution-id $STAGE_AWS_CF_ID --paths "/*"

