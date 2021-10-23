import _ from "underscore";
import dateFns from "date-fns";
import { LunchMoney } from "lunch-money";
import { MintTransaction, readJSONFile } from "./util.js";
import fs from "fs";

export function addExtIds(transactions: MintTransaction[]) {
  let mintIdIterator = 0;

  for (const transaction of transactions) {
    transaction.LunchMoneyExtId = `MINT-${mintIdIterator}`;
    mintIdIterator++;
  }

  return transactions;
}

export function addMintTag(transactions: MintTransaction[]) {
  for (const transaction of transactions) {
    transaction.LunchMoneyTags = ["mint"];
  }

  return transactions;
}

export function trimNotes(transactions: MintTransaction[]) {
  for (const transaction of transactions) {
    transaction.Notes = transaction.Notes.trim();
  }

  return transactions;
}

export async function addLunchMoneyAccountIds(
  transactions: MintTransaction[],
  lunchMoneyClient: LunchMoney
) {
  const manualLmAssets = await lunchMoneyClient.getAssets();
  const manualLmAssetMapping = _.reduce(
    manualLmAssets,
    (acc: { [key: string]: number }, asset) => {
      acc[(asset.display_name || asset.name).normalize("NFKC")] = asset.id;
      return acc;
    },
    {}
  );

  for (const transaction of transactions) {
    transaction.LunchMoneyAccountId =
      manualLmAssetMapping[transaction.LunchMoneyAccountName.normalize("NFKC")];
  }

  return transactions;
}

export async function createLunchMoneyAccounts(
  transactions: MintTransaction[],
  lunchMoneyClient: LunchMoney
) {
  const mintAccountsAfterTransformation = _.chain(transactions)
    .map((t) => t.LunchMoneyAccountName.normalize("NFKC"))
    .uniq()
    .value();

  // assets is only non-plaid assets
  const manualLmAssets = await lunchMoneyClient.getAssets();
  const existingAccountNames = manualLmAssets.map((r) =>
    (r.display_name || r.name).normalize("NFKC")
  );

  // there's a 'cash transaction' account in all LM accounts
  existingAccountNames.push("Cash");

  const accountsToCreate = _.difference(
    mintAccountsAfterTransformation,
    existingAccountNames
  );

  // TODO right now LM does not allow you to create accounts programmatically
  // https://feedback.lunchmoney.app/developer-api/p/create-asset-api
  if (!_.isEmpty(accountsToCreate)) {
    console.log(`Create these accounts:\n\n${accountsToCreate.join("\n")}`);
    process.exit(1);
  }
}

export function useArchiveForOldAccounts(
  transactions: MintTransaction[],
  oldTransactionDate: Date,
  transactionMappingPath: string
): MintTransaction[] {
  const [oldTransactions, recentTransactions] = _.partition(transactions, (t) =>
    dateFns.isBefore(
      dateFns.parse(t.Date, "MM/dd/yyyy", new Date()),
      oldTransactionDate
    )
  );

  const allActiveMintAccounts = _.chain(recentTransactions)
    .map((t) => t.AccountName)
    .compact()
    .uniq()
    .value();

  const allInactiveMintAccounts = _.chain(oldTransactions)
    .map((t) => t.AccountName)
    .compact()
    .uniq()
    .difference(allActiveMintAccounts)
    .value();

  console.log(
    `Merging the following accounts into a 'Mint Archive' account:\n\n${allInactiveMintAccounts.join(
      "\n"
    )}\n`
  );

  console.log(
    `Found ${
      allActiveMintAccounts.length
    } active accounts:\n\n${allActiveMintAccounts.join("\n")}\n`
  );

  const userSpecifiedArchiveAccounts =
    readJSONFile(transactionMappingPath)?.archive || [];

  const accountsToArchive = allInactiveMintAccounts.concat(
    userSpecifiedArchiveAccounts
  );

  const accountsToSkip = ["Uncategorized", "Cash"];

  for (const transaction of transactions) {
    if (accountsToSkip.includes(transaction.AccountName)) {
      transaction.LunchMoneyAccountName = transaction.AccountName;
      continue;
    }

    if (accountsToArchive.includes(transaction.AccountName)) {
      transaction.Notes += `\n\nOriginal Mint account: ${transaction.AccountName}`;
      transaction.LunchMoneyAccountName = "Mint Archive";
    } else {
      transaction.LunchMoneyAccountName = `${transaction.AccountName} (Mint)`;
    }
  }

  return transactions;
}
