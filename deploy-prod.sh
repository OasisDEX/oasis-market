rm -rf ./build

PUBLIC_URL='https://oasis.app/expired/trade' yarn build

# Push to ghpages branch
cp ./build/200.html ./build/404.html
gh-pages -d ./build

# Deploy to AWS
sudo apt update
sudo apt install python-pip
pip install --upgrade --user awscli
export PATH=$HOME/.local/bin:$PATH

aws configure set default.region $AWS_REGION
aws configure set default.output json
aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID
aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY

aws s3 sync ./build s3://$AWS_BUCKET_NAME/expired/trade/ --delete
aws cloudfront create-invalidation --distribution-id $AWS_CF_ID --paths "/*"

