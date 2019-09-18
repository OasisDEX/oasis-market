rm -rf ./build

yarn build

echo "oasis.app/trade" > ./build/CNAME

cp ./build/200.html ./build/404.html

gh-pages -d ./build
