// github:lunch-money/lunch-money-js

import { LunchMoney, DraftTransaction } from "lunch-money";
import { readCSV, writeCSV } from "./util.js";
import {
  transformAccountCategories,
  addLunchMoneyCategoryIds,
  createLunchMoneyCategories,
} from "./categories.js";
import {
  useArchiveForOldAccounts,
  addLunchMoneyAccountIds,
  createLunchMoneyAccounts,
} from "./accounts.js";
import { applyStandardTransformations } from "./transformations.js";
import dotenv from "dotenv";
import humanInterval from "human-interval";
import dateFns from "date-fns";

dotenv.config();

if (!process.env.LUNCH_MONEY_API_KEY) {
  console.error("Lunch Money API key not set");
  process.exit(1);
}

const mintTransactions = await readCSV("./data.csv");

// TODO this should be an input parameter to the script
// TODO this isn't really the import date, this is only used to determine when transactions should be treated as old
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

await createLunchMoneyCategories(
  mintTransactionsWithTransformedCategories,
  lunchMoney
);

await createLunchMoneyAccounts(
  mintTransactionsWithTransformedCategories,
  lunchMoney
);

const mintTransactionsTransformed = applyStandardTransformations(
  mintTransactionsWithTransformedCategories
);

const mintTransactionsWithLunchMoneyIds = await addLunchMoneyCategoryIds(
  await addLunchMoneyAccountIds(mintTransactionsTransformed, lunchMoney),
  lunchMoney
);

writeCSV(mintTransactionsWithLunchMoneyIds, "./data_transformed.csv");

// TODO should confirm the user actually wants to send everything to LM
// TODO we should extract this out into a separate function
// TODO unsure if we can increase the batch size
// TODO some unknowns about the API that we are guessing on right now:
//    - https://github.com/lunch-money/developers/issues/11
//    - https://github.com/lunch-money/developers/issues/10

const BATCH_SIZE = 100;

console.log(
  `Pushing ${mintTransactionsWithLunchMoneyIds.length} transactions to LunchMoney`
);
console.log(
  `This will be done in ${Math.ceil(
    mintTransactionsWithLunchMoneyIds.length / BATCH_SIZE
  )}`
);

// page through transactions
for (
  let i = 0;
  i * BATCH_SIZE < mintTransactionsWithLunchMoneyIds.length;
  i += 1
) {
  const batch = mintTransactionsWithLunchMoneyIds.slice(
    i * BATCH_SIZE,
    (i + 1) * BATCH_SIZE
  );

  console.log(
    `Pushing batch ${i} transactions (${batch.length}) to LunchMoney`
  );

  const formattedTransactions = batch.map(
    (transaction) =>
      ({
        payee: transaction.Description,
        notes: transaction.Notes,

        date: transaction.LunchMoneyDate,
        category_id: transaction.LunchMoneyCategoryId,
        amount: transaction.LunchMoneyAmount,
        asset_id: transaction.LunchMoneyAccountId,
        external_id: transaction.LunchMoneyExtId,
        tags: transaction.LunchMoneyTags,

        currency: "usd",
        status: "cleared",
      } as DraftTransaction)
  );

  const result = await lunchMoney.createTransactions(
    formattedTransactions,

    // don't apply rules, user can apply manually
    false,

    // check for recurring expenses
    true,

    // treat negative amounts as debit
    true
  );

  if (result.error) {
    debugger;
  }
}
