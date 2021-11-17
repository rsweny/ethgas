let arc = require('@architect/functions');
let aws = require('aws-sdk');
let { S3_BUCKET } = require('@architect/shared/constants');

// learn more about scheduled functions here: https://arc.codes/scheduled
exports.handler = async function scheduled (event) {
  const gasData = {};
  const today = new Date();
  const year = today.getUTCFullYear();
  const hour = today.getUTCHours();
  gasData.lastUpdated = today.toISOString();
  for (let i = 0; i < 24; i++) {
    gasData[i] = [];
    for (let j = 0; j < 7; j++) {
       gasData[i].push({ a: 0, l: 0, h: 0, f: 0 });
    }
  }

  let db = await arc.tables();
  for (let i = 0; i < 7; i++) {
    await populateWeek(db, gasData, i);
  }
  
  // upload daily summary data
  if (hour > 22)
  {
    const gasYearData = await populateYear(db, gasData, year);
    const codeYearStr = `gasYearData[${year}] = ${JSON.stringify(gasYearData)};\n`;
    await uploadFileToS3(S3_BUCKET, `gasyeardata${year}.js`, Buffer.from(codeYearStr));

    const dateStr = today.toISOString().substring(0,10);
    const gasDayData = await populateDay(db, dateStr);
    const codeDayStr = JSON.stringify(gasDayData);
    await uploadFileToS3(S3_BUCKET, `${year}/${dateStr}.json`, Buffer.from(codeDayStr));
  }

  // upload hourly data
  const codeStr = `const gasYearData = {};\nconst gasData = ${JSON.stringify(gasData)};\n`;
  return uploadFileToS3(S3_BUCKET, 'gasdata.js', Buffer.from(codeStr));
}

async function populateWeek(db, gasData, daysAgoIndex) {
  try {
    const d = new Date();
    d.setTime(d.getTime() - 86400*1000*daysAgoIndex);
    const dateStr = d.toISOString().substring(0,10);
    let res = await db.ethgas.query({
        KeyConditionExpression: 'pk = :dateStr',
        ExpressionAttributeValues: {
          ':dateStr': dateStr,
        }
    });
    for (let i = 0; i < res.Items.length; i++) {
      gasData[res.Items[i].sk][6-daysAgoIndex] = { a: res.Items[i].avg, l: res.Items[i].low, h: res.Items[i].high, f: res.Items[i].avgTip };
    }
  } catch(e) {
    console.log('populateDay Error');
    console.log(e);
  }
}

async function populateDay(db, dateStr) {
  const gasDayData = {};
  try {
    
    let res = await db.ethgas.query({
        KeyConditionExpression: 'pk = :dateStr',
        ExpressionAttributeValues: {
          ':dateStr': dateStr,
        }
    });
    for (let i = 0; i < res.Items.length; i++) {
      gasDayData[res.Items[i].sk] = { a: res.Items[i].avg, l: res.Items[i].low, h: res.Items[i].high, f: res.Items[i].avgTip };
    }
  } catch(e) {
    console.log('populateDay Error');
    console.log(e);
  }
  return gasDayData;
}

async function populateYear(db, gasData, year) {
  const gasYearData = {};
  try {
    const yr = `sum-${year}`;
    let res = await db.ethgas.query({
        KeyConditionExpression: 'pk = :yr',
        ExpressionAttributeValues: {
          ':yr': yr,
        }
    });

    for (let i = 0; i < res.Items.length; i++) {
      const d = res.Items[i].sk;
      const month = d.substring(5,7);
      const day = d.substring(8);
      if (!gasYearData[month]) gasYearData[month] = {};
      gasYearData[month][day] = { d: res.Items[i].sk, a: res.Items[i].avg, l: res.Items[i].low, h: res.Items[i].high, f: res.Items[i].avgTip };
    }
  } catch(e) {
    console.log('populateYear Error');
    console.log(e);
  }
  return gasYearData;
}

async function uploadFileToS3(bucket, key, data) {
  const s3 = new aws.S3({ apiVersion: '2006-03-01' });
  const params = {
    Bucket : bucket,
    Key : key,
    Body : data
  }

  try {
      const response = await s3.upload(params).promise();
      console.log('S3 Response: ', response);
      return response;
  } catch (err) {
      console.log(err, err.stack);
      return err;
  }
}