let arc = require('@architect/functions');
const fetch = require('node-fetch');
let { GAS_API_URL } = require('@architect/shared/constants');

// learn more about scheduled functions here: https://arc.codes/scheduled
exports.handler = async function scheduled (event) {

  const res = await fetch(GAS_API_URL);
  const gasData = await res.json();
  console.log(gasData);

  if (gasData?.result?.suggestBaseFee) {
    const curBaseFee = Number(gasData.result.suggestBaseFee);
    const curGasFee = Number(gasData.result.ProposeGasPrice);
    const minerTip = curGasFee - curBaseFee;
    
    const d = new Date();
    const today = d.toISOString().substring(0,10);
    const hour = d.getUTCHours();
    let db = await arc.tables();
    let result = await db.ethgas.query({
        KeyConditionExpression: 'pk = :today and sk = :hour',
        ExpressionAttributeValues: {
          ':today': today,
          ':hour': String(hour),
        }
    })

    console.log(result);

    if (result.Items?.length)
    {
      const n = result.Items[0].count + 1;
      const oldAvg = result.Items[0].avg;
      const oldAvgTip = result.Items[0].avgTip;
      const high = Math.max(result.Items[0].high, Math.round(curGasFee));
      const low = Math.min(result.Items[0].low, Math.round(curGasFee));

      // once per day write a daily summary entry
      if (hour == 23 && n == 10) {
        await writeDaySummary(db, d, today)
      }

      return db.ethgas.put({
        pk: today,
        sk: String(hour),
        count: n,
        high,
        low,
        avg: Math.round( curGasFee/n + oldAvg*(n-1)/n ),
        avgTip: Math.round( minerTip/n + oldAvgTip*(n-1)/n )
      });
    } 
    else 
    {
      return db.ethgas.put({
        pk: today,
        sk: String(hour),
        count: 1,
        high: curGasFee,
        low: curGasFee,
        avg: curGasFee,
        avgTip: minerTip,
      });
    }
  }
}

async function writeDaySummary(db, d, today) {
  const year = d.getUTCFullYear();
  const summaryKey = `sum-${year}`;
  let summaryResult = await db.ethgas.query({
      KeyConditionExpression: 'pk = :today',
      ExpressionAttributeValues: {
        ':today': today,
      }
  });

  console.log(summaryResult.Items);
  let sumAvg = 0;
  let sumAvgTip = 0;
  let sumHigh = 0;
  let sumLow = 100000;
  const numHours = summaryResult.Items.length;
  for (let i = 0; i < numHours; i++) {
    sumLow = Math.min(sumLow, summaryResult.Items[i].low);
    sumHigh = Math.max(sumHigh, summaryResult.Items[i].high);
    sumAvg += summaryResult.Items[i].avg;
    sumAvgTip += summaryResult.Items[i].avgTip;
  }
  sumAvg = Math.round(sumAvg / numHours);
  sumAvgTip = Math.round(sumAvgTip / numHours);

  await db.ethgas.put({
    pk: summaryKey,
    sk: today,
    high: sumHigh,
    low: sumLow,
    avg: sumAvg,
    avgTip: sumAvgTip,
  });
} 
