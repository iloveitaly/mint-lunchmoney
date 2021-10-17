// github:lunch-money/lunch-money-js

import { LunchMoney } from "lunch-money";
import stringSimilarity from "string-similarity";
import { MintTransaction, prettyPrintJSON, readCSV } from "./util.js";
import dotenv from "dotenv";
import _ from "underscore";
import humanInterval from "human-interval";
import dateFns from "date-fns";

dotenv.config();

if (!process.env.LUNCH_MONEY_API_KEY) {
  console.error("Lunch Money API key not set");
  process.exit(1);
}

const mintCSV = await readCSV("./data.csv");

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

const lunchMoney = new LunchMoney({ token: process.env.LUNCH_MONEY_API_KEY });

const lmRawCategories = await lunchMoney.getCategories();
const lmCategories = lmRawCategories.map((c) => c.name);

// assets is only non-plaid assets
const manualAssets = await lunchMoney.getAssets();
const automaticAssets = await lunchMoney.getPlaidAccounts();

const allAssetNames = _.union(
  _.map(manualAssets, (r) => r.display_name || r.name),
  _.map(automaticAssets, (r) => r.name)
);

function filterTransactions(
  transactions: MintTransaction[],
  filterDate: Date,
  filterDirection: "before" | "after"
) {
  const beforeOrAfter =
    filterDirection == "before" ? dateFns.isBefore : dateFns.isAfter;
  return transactions.filter((t) => {
    const date = dateFns.parse(t.Date, "MM/dd/yyyy", new Date());
    return beforeOrAfter(date, filterDate);
  });
}

// find all accounts associated with transactions over the last year
const allActiveMintAccounts = _.chain(mintCSV)
  .filter(
    (row) => dateFns.parse(row.Date, "MM/dd/yyyy", new Date()) > startImportDate
  )
  .map((r) => r.AccountName)
  .compact()
  .uniq()
  .value();

const allInactiveMintAccounts = _.chain(
  filterTransactions(mintCSV, startImportDate, "before")
)
  .map((r) => r.AccountName)
  .compact()
  .uniq()
  .difference(allActiveMintAccounts)
  .value();

debugger;

const mintCategories = _.chain(mintCSV)
  .map((row: any) => row.Category)
  .uniq()
  .value();

const categoriesToMap = _.chain(mintCategories)
  .difference(lmCategories)
  .compact()
  // attempt to pick the best match in LM for Mint categories
  // bestMatch: {}
  // rating:0.5333333333333333
  // target:'Business Expenses'
  .map((categoryName: string) => {
    return {
      [categoryName]: stringSimilarity.findBestMatch(categoryName, lmCategories)
        .bestMatch.target,
    };
  })
  // merge array of objects into one object
  .reduce((acc: Object, curr: Object) => _.extend(acc, curr), {})
  .value();

if (categoriesToMap) {
  prettyPrintJSON({
    categories: categoriesToMap,
    lunchMoneyOptions: lmCategories,
  });
  process.exit(1);
}

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
