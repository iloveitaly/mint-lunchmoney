import LunchMoney, { Asset } from 'lunch-money'
import stringSimilarity from 'string-similarity'
import papaparse from 'papaparse'
import dotenv from 'dotenv'

dotenv.config()

if (!process.env.LUNCH_MONEY_API_KEY) {
  console.error('Lunch Money API key not set')
  process.exit(1)
}

const lunchMoney = new LunchMoney({ token: process.env.LUNCH_MONEY_API_KEY })
// lunchMoney.getCategories()

// import csv file into memory via papaparse
const csv = papaparse.parse('./data.csv', {
  header: true
})

// {
//   header: true,
//   skipEmptyLines: true,
//   encoding: 'utf8'
// }

debugger
console.log('sdfsfd')

// extract all accounts and categories from the CSV

// get lunch money accounts and categories

// should append account name where it isn't mapped
