@aws
profile default
region ca-central-1
memory 128
concurrency 1
timeout 10
runtime nodejs16.x

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
