import { MintTransaction } from "./util.js";
import dateFns from "date-fns";

function addExtIds(transactions: MintTransaction[]) {
  let mintIdIterator = 0;

  for (const transaction of transactions) {
    transaction.LunchMoneyExtId = `MINT-${mintIdIterator}`;
    mintIdIterator++;
  }

  return transactions;
}

function addMintTag(transactions: MintTransaction[]) {
  for (const transaction of transactions) {
    transaction.LunchMoneyTags = ["mint"];
  }

  return transactions;
}

function trimNotes(transactions: MintTransaction[]) {
  for (const transaction of transactions) {
    transaction.Notes = transaction.Notes.trim();
  }

  return transactions;
}

function flipSigns(transactions: MintTransaction[]) {
  for (const transaction of transactions) {
    if (transaction.TransactionType === "debit") {
      transaction.LunchMoneyAmount = `-${transaction.Amount}`;
    } else {
      transaction.LunchMoneyAmount = transaction.Amount;
    }
  }

  return transactions;
}

function transformDates(transactions: MintTransaction[]) {
  for (const transaction of transactions) {
    transaction.LunchMoneyDate = dateFns.format(
      // https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md
      dateFns.parse(transaction.Date, "MM/dd/yyyy", new Date()),
      "yyyy-MM-dd"
    );
  }

  return transactions;
}

export function applyStandardTransformations(transactions: MintTransaction[]) {
  return addExtIds(
    addMintTag(trimNotes(flipSigns(transformDates(transactions))))
  );
}
