// github:lunch-money/lunch-money-js

import { LunchMoney } from "lunch-money";
import { readCSV } from "./util.js";
import {
  useArchiveForOldAccounts,
  transformAccountCategories,
  createImportAccounts,
  addExtIds,
  addMintTag,
} from "./accounts.js";
import dotenv from "dotenv";
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
  startImportDate,
  "./account_mapping.json"
);

const lunchMoney = new LunchMoney({ token: process.env.LUNCH_MONEY_API_KEY });

const mintTransactionsWithTransformedCategories =
  await transformAccountCategories(
    mintTransactionsWithArchiveAccount,
    lunchMoney,
    "./category_mapping.json"
  );

const mintTransactionsWithExtId = addExtIds(
  addMintTag(mintTransactionsWithTransformedCategories)
);

debugger;
// write out the transactions to a file with papaparse for inspection and backup

createImportAccounts(mintTransactionsWithTransformedCategories, lunchMoney);
