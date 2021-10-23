import _ from "underscore";
import dateFns from "date-fns";
import stringSimilarity from "string-similarity";
import { LunchMoney } from "lunch-money";
import { MintTransaction, prettyJSON } from "./util.js";
import fs from "fs";

export async function transformAccountCategories(
  transactions: MintTransaction[],
  lunchMoneyClient: LunchMoney,
  categoryMappingPath: string
) {
  const lunchMoneyRawCategories = await lunchMoneyClient.getCategories();
  const lunchMoneyCategories = lunchMoneyRawCategories
    .filter((c) => !c.is_group)
    .map((c) => c.name);

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
  let userCategoryMapping = null;
  if (fs.existsSync(categoryMappingPath)) {
    userCategoryMapping = JSON.parse(
      fs.readFileSync(categoryMappingPath, "utf8")
    ).categories;

    console.log(`User provided category mapping discovered`);
  }

  const categoriesToMap: { [key: string]: any } = _.chain(mintCategories)
    // exclude exact matches with lunch money categories
    .difference(lunchMoneyCategories)
    .compact()
    // exclude categories that are already mapped
    .difference(_.keys(userCategoryMapping))
    // attempt to pick the best match in LM for Mint categories
    // bestMatch: {
    //   rating:0.5333333333333333,
    //   target:'Business Expenses'
    // }
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

  if (Object.keys(categoriesToMap).length > 0) {
    if (userCategoryMapping) {
      console.log(
        `Additional categories must be mapped.\n${prettyJSON(categoriesToMap)}`
      );
    } else {
      console.log(
        `A category_mapping.json has been created to map ${
          _.keys(categoriesToMap).length
        } mint categories to lunch money:\n`
      );

      fs.writeFileSync(
        categoryMappingPath,
        prettyJSON({
          categories: categoriesToMap,
          lunchMoneyOptions: lunchMoneyCategories,
        }),
        "utf8"
      );

      process.exit(1);
    }
  }

  // TODO we are mutating the array here, we should use a copy
  for (const transaction of transactions) {
    if (categoriesToMap[transaction.Category] !== undefined) {
      transaction.Notes += `\n\nOriginal Mint category: ${transaction.Category}`;
      transaction.Category = categoriesToMap[transaction.Category];
    }
  }

  return transactions;
}

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

export async function createImportAccounts(
  transactions: MintTransaction[],
  lunchMoneyClient: LunchMoney
) {
  const mintAccountsAfterTransformation = _.chain(transactions)
    .map((t) => t.AccountName)
    .uniq()
    .value();

  // assets is only non-plaid assets
  const manualLmAssets = await lunchMoneyClient.getAssets();
  const existingAccountNames = _.map(manualLmAssets, (r) => r.display_name);
  debugger;

  console.log(`Creating ${existingAccountNames.length} accounts.`);

  // return Promise.all(
  //   _.map(accounts, (account: any) => {
  //     return lunchMoneyClient.createAccount(account);
  //   })
  // );
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

  console.log(
    `Found ${
      allActiveMintAccounts.length
    } active accounts:\n\n${allActiveMintAccounts.join("\n")}\n`
  );

  return transactions;
}
