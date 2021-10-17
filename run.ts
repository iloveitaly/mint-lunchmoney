// github:lunch-money/lunch-money-js
// import LunchMoney from 'lunch-money'
import { LunchMoney } from "lunch-money";
import stringSimilarity from "string-similarity";
import papaparse, { ParseRemoteConfig } from "papaparse";
import dotenv from "dotenv";
import * as fs from "fs";
import path from "path";
import _ from "underscore";
import humanInterval from "human-interval";
import dateFns from "date-fns";
dotenv.config();

if (!process.env.LUNCH_MONEY_API_KEY) {
  console.error("Lunch Money API key not set");
  process.exit(1);
}

const lunchMoney = new LunchMoney({ token: process.env.LUNCH_MONEY_API_KEY });
const lmRawCategories = await lunchMoney.getCategories();
const lmCategories = lmRawCategories.map((c) => c.name);

const readCSV = async (filePath: string) => {
  const csvFile = fs.readFileSync(filePath);
  const csvData = csvFile.toString();
  return new Promise((resolve) => {
    papaparse.parse(csvData, {
      header: true,
      complete: (results) => {
        console.log("Complete", results.data.length, "records.");
        resolve(results.data);
      },
    });
  });
};

// import csv file into memory via papaparse
// path.resolve(process.cwd(), '.data.csv'),
// const papaConfig: ParseRemoteConfig = {
//   download: true,
//   header: true,
//   complete: (results: any) => {
//     console.log('callback')
//   }
// }
// const csv = await Papa.parse(
//   csvFileStream, {
//     header: true
//     // complete: (results: any) => {
//     //   console.log(results.data)
//     // }
//   }
//   // papaConfig
// )

const mintCSV = await readCSV("./data.csv");
const range = humanInterval("1 year");
if (!range) {
  console.log("Invalid date to search for active accounts");
  process.exit(1);
}
const oneYearAgo = dateFns.subSeconds(new Date(), range);

// find all accounts associated with transactions over the last year
debugger;
const allActiveAccountNames = _.chain(mintCSV)
  .filter(
    (row) => dateFns.parse(row.Date, "MM/dd/yyyy", new Date()) > oneYearAgo
  )
  .map((r) => r["Account Name"])
  .uniq()
  .value();

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
  console.log(
    JSON.stringify(
      {
        categories: categoriesToMap,
        lunchMoneyOptions: lmCategories,
      },
      null,
      2
    )
  );

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
