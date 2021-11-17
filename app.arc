@aws
profile dev
region ca-central-1
memory 128
concurrency 1

@app
ethgas

@scheduled
deploy-s3 rate(10 minutes)
check-gas rate(1 minute)

@tables
ethgas
  pk *String
  sk **String
  PointInTimeRecovery true
