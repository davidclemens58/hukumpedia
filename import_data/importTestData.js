const {promisify} = require('util');
const parse       = promisify(require('csv-parse'));
const {readFile}  = require('fs').promises;
const {Firestore} = require('@google-cloud/firestore');
const {Logging} = require('@google-cloud/logging');
const logName = 'hukumpedia-logs-importTestData';

// Creates a Logging client
const logging = new Logging();
const log = logging.log(logName);

const resource = {
  type: 'global',
};

if (process.argv.length < 3) {
  console.error('Please include a path to a csv file');
  process.exit(1);
}

const db = new Firestore();

function writeToFirestore(records) {
  const batchCommits = [];
  let batch = db.batch();
  records.forEach((record, i) => {
    var docRef = db.collection('rules-test').doc(record.email);
    batch.set(docRef, record);
    if ((i + 1) % 500 === 0) {
      console.log(`Writing record ${i + 1}`);
      batchCommits.push(batch.commit());
      batch = db.batch();
    }
  });
  batchCommits.push(batch.commit());
  return Promise.all(batchCommits);
}

function writeToDatabase(records) {
  records.forEach((record, i) => {
    console.log(`Kitab: ${record.kitab} NO.BAB: ${record.no_bab} NamaBAB: ${record.nama_bab} Pasal: ${record.pasal} No.Ayat: ${record.no_ayat} Bunyi: ${record.bunyi_ayat}`);
  });
  return ;
}

async function importCsv(csvFileName) {
  const fileContents = await readFile(csvFileName, 'utf8');
  const records = await parse(fileContents, { columns: true });
  try {
    await writeToFirestore(records);
  }
  catch (e) {
    console.error(e);
    process.exit(1);
  }
  console.log(`Wrote ${records.length} records`);
  
  // A text log entry
success_message = `Success: importTestData - Wrote ${records.length} records`
const entry = log.entry({resource: resource}, {message: `${success_message}`});
log.write([entry]);
}

importCsv(process.argv[2]).catch(e => console.error(e));
