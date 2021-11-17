# ethgas
Record and display average ETH gas prices over time

## Local Dev
```bash
npm i
npm start
```
Then visit the URL presented.

## Hydrate source code

npx arc deploy --dry-run

## Deploy staging

npx arc deploy

## Deploy prod

npx arc deploy production

## More Info

index.html should be copied to the same bucket as constants.S3_BUCKET

Deployed site: https://gaseth.s3.ca-central-1.amazonaws.com/index.html

https://arc.codes/docs/en/get-started/why-architect
