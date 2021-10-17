import { MintTransaction } from "./util";
import _ from "underscore";

globalThis.print = function (str) {
  console.log(str);
};

export function useArchiveForOldAccounts(
  transactions: MintTransaction[],
  oldTransactionDate: Date
): MintTransaction[] {
  const [oldTransactions, recentTransactions] = _.partition(transactions, (t) =>
    dateFns.isBefore(
      dateFns.parse(t.Date, "MM/dd/yyyy", new Date()),
      oldTransactionDate
    )
  );

  const allActiveMintAccounts = _.chain(oldTransactions)
    .map((t) => t.AccountName)
    .compact()
    .uniq()
    .value();

  const allInactiveMintAccounts = _.chain(recentTransactions)
    .map((t) => t.AccountName)
    .compact()
    .uniq()
    .difference(allActiveMintAccounts)
    .value();

  print(
    `Merging the following accounts into a 'Mint Archive' account:\n${allInactiveMintAccounts}`
  );
}
