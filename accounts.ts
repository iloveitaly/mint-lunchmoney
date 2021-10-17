import _ from "underscore";
import dateFns from "date-fns";
import stringSimilarity from "string-similarity";
import { MintTransaction, prettyPrintJSON } from "./util.js";
import fs from "fs";

export function transformAccountCategories(
  transactions: MintTransaction[],
  lunchMoneyCategories: string[]
) {
  const mintCategories = _.chain(transactions)
    .map((row: any) => row.Category)
    .compact()
    .uniq()
    .value();

  const exactMatches = _.intersection(mintCategories, lunchMoneyCategories);

  // TODO should output this metadata via a tuple or something so this could be an API
  if (exactMatches.length > 0) {
    console.log(
      `Found ${exactMatches.length} exact matches:\n\n${exactMatches.join(
        "\n"
      )}\n`
    );
  } else {
    console.log("No exact matches.\n");
  }

  // TODO this should be a CLI argument
  const mappingPath = "./category_mapping.json";
  let userCategoryMapping = null;
  if (fs.existsSync(mappingPath)) {
    userCategoryMapping = JSON.parse(
      fs.readFileSync(mappingPath, "utf8")
    ).categories;

    console.log(`User provided category mapping discovered`);

    // TODO we are mutating the array here, we should use a copy
    for (const transaction of transactions) {
      transaction.Category = userCategoryMapping[transaction.Category];
    }
  }

  const categoriesToMap = _.chain(mintCategories)
    .difference(lunchMoneyCategories)
    .compact()
    // attempt to pick the best match in LM for Mint categories
    // bestMatch: {}
    // rating:0.5333333333333333
    // target:'Business Expenses'
    .map((mintCategoryName: string) => {
      return {
        [mintCategoryName]: stringSimilarity.findBestMatch(
          mintCategoryName,
          lunchMoneyCategories
        ).bestMatch.target,
      };
    })
    // merge array of objects into one object
    .reduce((acc: Object, curr: Object) => _.extend(acc, curr), {})
    .value();

  if (categoriesToMap) {
    if (userCategoryMapping) {
      console.log(`Additional categories must be mapped.\n${categoriesToMap}`);
    } else {
      console.log(
        `Create a category_mapping.json to map ${
          _.keys(categoriesToMap).length
        } mint categories to lunch money:\n`
      );

      prettyPrintJSON({
        categories: categoriesToMap,
        lunchMoneyOptions: lunchMoneyCategories,
      });
    }

    process.exit(1);
  }

  return transactions;
}

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

  for (const transaction of transactions) {
    transaction.Notes += `Original account: ${transaction.AccountName}`;
    transaction.AccountName = "Mint Archive";
  }

  return transactions;
}
