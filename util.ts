import papaparse from "papaparse";
import fs from "fs";

/*
Account Name:'Amazon'
Amount:'16.11'
Category:'Books'
Date:'10/02/2021'
Description:'Audible.com'
Labels:''
Notes:''
Original Description:'Audible'
Transaction Type:'debit'
*/

export interface MintTransaction {
  AccountName: string;
  Amount: string;
  Category: string;
  Date: string;
  Description: string;
  Labels: string;
  Notes: string;
  OriginalDescription: string;
  TransactionType: string;

  // additional fields for LM import
  LunchMoneyTags: string[];
  LunchMoneyAccountId: number;
  LunchMoneyAccountName: string;
  LunchMoneyCategoryId: number;
  LunchMoneyCategoryName: string;
  LunchMoneyExtId: string;
  LunchMoneyAmount: string;
  LunchMoneyDate: string;
}

export const readJSONFile = (path: string): any | null => {
  if (fs.existsSync(path)) {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  }

  return null;
};

// TODO should type the resulting object here for better checking downstream
export const readCSV = async (filePath: string): Promise<MintTransaction[]> => {
  const csvFile = fs.readFileSync(filePath);
  const csvData = csvFile.toString();

  return new Promise((resolve) => {
    papaparse.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      // 'Original Description' => 'OriginalDescription'
      transformHeader: (header: string) => header.replace(/\s/g, ""),
      complete: (results) => {
        resolve(results.data);
      },
    } as papaparse.ParseConfig<MintTransaction>);
  });
};

export const writeCSV = (csvRows: any, filePath: string) => {
  const csvContent = papaparse.unparse(csvRows);
  fs.writeFileSync(filePath, csvContent);
};

export function prettyJSON(json: Object, returnString = false): string {
  return JSON.stringify(json, null, 2);
}
