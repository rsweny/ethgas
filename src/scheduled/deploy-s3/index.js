const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const s3 = new S3Client({});
let arc = require('@architect/functions');
let { S3_BUCKET } = require('@architect/shared/constants');

// learn more about scheduled functions here: https://arc.codes/scheduled
exports.handler = async function scheduled (event) {
  const gasData = {};
  const today = new Date();
  const hour = today.getUTCHours();
  gasData.lastUpdated = today.toISOString();
  
  // populate and upload the last 7 days by hour
  for (let i = 0; i < 24; i++) {
    gasData[i] = [];
    for (let j = 0; j < 7; j++) {
       gasData[i].push({ a: 0, l: 0, h: 0, f: 0, p: 0, b: 0 });
    }
  }
  let db = await arc.tables();
  for (let i = 0; i < 7; i++) {
    await populateWeekday(db, gasData, i);
  }
  await uploadFileToS3(S3_BUCKET, 'gasdata.json', Buffer.from(JSON.stringify(gasData)));
  
  if (hour > 22) {
    // upload yearly summary data by day
    const year = today.getUTCFullYear();
    const gasYearData = await populateYear(db, year);
    const yearStr = JSON.stringify(gasYearData);
    await uploadFileToS3(S3_BUCKET, `gasyeardata${year}.json`, Buffer.from(yearStr));

    // upload daily summary data by hour
    const dateStr = today.toISOString().substring(0,10);

    const gasDayData = await populateDay(db, dateStr);
    const codeDayStr = JSON.stringify(gasDayData);
    await uploadFileToS3(S3_BUCKET, `${year}/${dateStr}.json`, Buffer.from(codeDayStr));
  }
}

async function populateWeekday(db, gasData, daysAgoIndex) {
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
      gasData[res.Items[i].sk][6-daysAgoIndex] = { a: res.Items[i].avg, l: res.Items[i].low, h: res.Items[i].high, f: res.Items[i].avgTip, p: res.Items[i].peak, b: res.Items[i].blobFee };
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
      gasDayData[res.Items[i].sk] = { a: res.Items[i].avg, l: res.Items[i].low, h: res.Items[i].high, f: res.Items[i].avgTip, p: res.Items[i].peak, b: res.Items[i].blobFee };
    }
  } catch(e) {
    console.log('populateDay Error');
    console.log(e);
  }
  return gasDayData;
}

async function populateYear(db, year) {
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
      const month = parseInt(d.substring(5,7));
      const day = parseInt(d.substring(8));
      if (!gasYearData[month]) gasYearData[month] = {};
      gasYearData[month][day] = { d: res.Items[i].sk, a: res.Items[i].avg, l: res.Items[i].low, h: res.Items[i].high, f: res.Items[i].avgTip, p: res.Items[i].peak, b: res.Items[i].blobFee };
    }
  } catch(e) {
    console.log('populateYear Error');
    console.log(e);
  }
  return gasYearData;
}

async function uploadFileToS3(bucket, key, data) {

  const command = new PutObjectCommand({
    Bucket : bucket,
    Key : key,
    Body : data
  });

  try {
    const response = await s3.send(command);
    console.log('S3 Response: ', response);
    return response;
  } catch (err) {
    console.error(err, err.stack);
    return err;
  }

}