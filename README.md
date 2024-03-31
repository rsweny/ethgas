# ethgas
Record and display average ETH gas prices over time

## Local Dev
```bash
npm i
npm start
```
Then visit the URL presented.

## Hydrate source code

npx arc init

## Deploy staging

1) Edit app.arc and set your AWS profile user
2) Run "npx arc env -e staging --add BLOCKNATIVE_API_KEY "my_secret_key"
3) Run "npx arc env -e staging --add ETHERSCAN_API_KEY "my_secret_key"
4) npx arc deploy

## Deploy prod

npx arc deploy production

## More Info

index.html should be copied to the same bucket as constants.S3_BUCKET

Deployed site: https://gaseth.s3.ca-central-1.amazonaws.com/index.html

https://arc.codes/docs/en/get-started/why-architect
