// github:lunch-money/lunch-money-js

import { LunchMoney } from "lunch-money";
import stringSimilarity from "string-similarity";
import { MintTransaction, prettyPrintJSON, readCSV } from "./util.js";
import {
  useArchiveForOldAccounts,
  transformAccountCategories,
} from "./accounts.js";
import dotenv from "dotenv";
import _ from "underscore";
import humanInterval from "human-interval";
import dateFns from "date-fns";

dotenv.config();

if (!process.env.LUNCH_MONEY_API_KEY) {
  console.error("Lunch Money API key not set");
  process.exit(1);
}

const mintTransactions = await readCSV("./data.csv");

// TODO this should be an input parameter
function determineStartImportDate() {
  let range = humanInterval("1 year");

  if (!range) {
    console.log("Invalid date to search for active accounts");
    process.exit(1);
  }

  // range is in milliseconds
  range /= 1000;

  const oneYearAgo = dateFns.subSeconds(new Date(), range);

  return oneYearAgo;
}

const startImportDate = determineStartImportDate();

const mintTransactionsWithArchiveAccount = useArchiveForOldAccounts(
  mintTransactions,
  startImportDate
);

const lunchMoney = new LunchMoney({ token: process.env.LUNCH_MONEY_API_KEY });

const lmRawCategories = await lunchMoney.getCategories();
const lmCategories = lmRawCategories.map((c) => c.name);

const mintTransactionsWithTransformedCategories = transformAccountCategories(
  mintTransactionsWithArchiveAccount,
  lmCategories
);

// assets is only non-plaid assets
const manualAssets = await lunchMoney.getAssets();
const automaticAssets = await lunchMoney.getPlaidAccounts();

const allAssetNames = _.union(
  _.map(manualAssets, (r) => r.display_name || r.name),
  _.map(automaticAssets, (r) => r.name)
);

const mintToLunchMoneyCategoryMapping = {};

debugger;
// const mintCategories = csv.data
//   .map(row => {

// {
//   header: true,
//   skipEmptyLines: true,
//   encoding: 'utf8'
// }

debugger;
console.log("sdfsfd");

// extract all accounts and categories from the CSV

// get lunch money accounts and categories

// should append account name where it isn't mapped
