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
}

// TODO should type the resulting object here for better checking downstream
export const readCSV = async (filePath: string): Promise<MintTransaction[]> => {
  const csvFile = fs.readFileSync(filePath);
  const csvData = csvFile.toString();

  return new Promise((resolve) => {
    papaparse.parse(csvData, {
      header: true,
      // 'Original Description' => 'OriginalDescription'
      transformHeader: (header: string) => header.replace(/\s/g, ""),
      complete: (results) => {
        resolve(results.data);
      },
    } as papaparse.ParseConfig<MintTransaction>);
  });
};

export function prettyPrintJSON(json: Object): void {
  console.log(JSON.stringify(json, null, 2));
}
