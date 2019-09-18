rm -rf ./build

PUBLIC_URL='https://oasis.app/trade' yarn build

cp ./build/200.html ./build/404.html

gh-pages -d ./build
aws s3 sync ./build s3://$AWS_BUCKET_NAME/trade/ --delete
aws cloudfront create-invalidation --distribution-id $AWS_CF_ID --paths /*
