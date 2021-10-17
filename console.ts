import repl from "repl";
import dotenv from "dotenv";
import { LunchMoney } from "lunch-money";

dotenv.config();

const local = repl.start("> ");
const lunchMoney = new LunchMoney({
  token: process.env.LUNCH_MONEY_API_KEY || "",
});

local.context.lunchMoney = lunchMoney;
