let arc = require('@architect/functions');
let { BLOCKNATIVE_GAS_API_URL, ETHERSCAN_GAS_API_URL } = require('@architect/shared/constants');

const isNumber = (value) => {
   return typeof value === 'number' && isFinite(value);
}

// learn more about scheduled functions here: https://arc.codes/scheduled
exports.handler = async function scheduled (event) {

  const d = new Date();
  let curBaseFee;
  let curGasFee;
  let minerTip;
  let blobFee;
  try {
      const headers = { "Authorization": process.env.BLOCKNATIVE_API_KEY }
      const res = await fetch(BLOCKNATIVE_GAS_API_URL, { headers, signal: AbortSignal.timeout(3000) })
      let gasData = await res.json();
      console.log("base: " + gasData.blockPrices[0].baseFeePerGas + " blob: " + gasData.blockPrices[0].blobBaseFeePerGas + " tip: " + gasData.blockPrices[0].estimatedPrices[1].maxPriorityFeePerGas);
      curBaseFee = gasData.blockPrices[0].baseFeePerGas;
      blobFee = gasData.blockPrices[0].blobBaseFeePerGas;
      minerTip = gasData.blockPrices[0].estimatedPrices[1].maxPriorityFeePerGas
      curGasFee = curBaseFee + minerTip
  } catch(e) {
      console.log("BlockNative API err", e)
      const res = await fetch(ETHERSCAN_GAS_API_URL);
      gasData = await res.json();
      console.log(gasData);
      curBaseFee = Number(gasData.result.suggestBaseFee);
      curGasFee = Number(gasData.result.ProposeGasPrice);
      minerTip = curGasFee - curBaseFee;
  }

  if (isNumber(curBaseFee) && isNumber(curGasFee) && isNumber(minerTip)) {
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

    if (result.Items?.length)
    {
      const n = result.Items[0].count + 1;
      const oldAvg = result.Items[0].avg;
      const oldAvgTip = result.Items[0].avgTip;
      const oldAvgBlob = result.Items[0].blobFee;
      const high = Math.max(result.Items[0].high, Math.round(curBaseFee));
      const peak = Math.max(result.Items[0].peak, Math.round(curGasFee));
      const low = Math.min(result.Items[0].low, Math.round(curBaseFee));

      let avg = curBaseFee/n + oldAvg*(n-1)/n;
      let avgTip = minerTip/n + oldAvgTip*(n-1)/n;
      blobFee = isNumber(blobFee) ? blobFee/n + oldAvgBlob*(n-1)/n : oldAvgBlob;
      if (n > 45) {
        avg = Math.round(avg);
        avgTip = Math.round(avgTip);
        blobFee = Math.round(blobFee);
      } else {
        avg = Math.round(avg * 100) / 100;
        avgTip = Math.round(avgTip * 100) / 100;
        blobFee = Math.round(blobFee * 100) / 100;
      }

      // once per day write a daily summary entry
      if (hour == 23 && n == 50) {
        await writeDaySummary(db, d.getUTCFullYear(), today);
      }

      const entry = { pk: today, sk: String(hour), count: n, high, low, peak, avg, avgTip, blobFee };
      console.log(entry);
      return db.ethgas.put(entry);
    } 
    else 
    {
      return db.ethgas.put({
        pk: today,
        sk: String(hour),
        count: 1,
        high: Math.round(curBaseFee),
        low: Math.round(curBaseFee),
        peak: curGasFee,
        avg: curBaseFee,
        avgTip: minerTip,
        blobFee: blobFee || 1
      });
    }
  }
}

async function writeDaySummary(db, year, dateStr) {
  const summaryKey = `sum-${year}`;
  let summaryResult = await db.ethgas.query({
    KeyConditionExpression: 'pk = :dateStr',
    ExpressionAttributeValues: {
      ':dateStr': dateStr,
    }
  });

  console.log(summaryResult.Items);
  let sumAvg = 0;
  let sumAvgTip = 0;
  let sumHigh = 0;
  let sumLow = 100000;
  let peak = 0;
  let sumBlobFee = 0;
  const numHours = summaryResult.Items.length;
  for (let i = 0; i < numHours; i++) {
    sumLow = Math.min(sumLow, summaryResult.Items[i].low);
    sumHigh = Math.max(sumHigh, summaryResult.Items[i].high);
    if (summaryResult.Items[i].peak > peak) peak = summaryResult.Items[i].peak;
    sumAvg += summaryResult.Items[i].avg;
    sumAvgTip += summaryResult.Items[i].avgTip;
    sumBlobFee += summaryResult.Items[i].blobFee || 0;
  }
  sumAvg = Math.round(sumAvg / numHours);
  sumAvgTip = Math.round(sumAvgTip / numHours);
  sumBlobFee = Math.round(sumBlobFee / numHours);

  await db.ethgas.put({
    pk: summaryKey,
    sk: dateStr,
    high: sumHigh,
    low: sumLow,
    avg: sumAvg,
    avgTip: sumAvgTip,
    peak,
    blobFee: sumBlobFee
  });
} 
