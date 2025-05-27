// Tipler
export type Currency = "TRY" | "USD" | "EUR" | "XAU";
export type TransactionType =
  | "EXCHANGE"
  | "TRANSFER"
  | "DEPOSIT"
  | "WITHDRAW"
  | "BUY_GOLD"
  | "SELL_GOLD"
  | "BUY_USD"
  | "SELL_USD"
  | "BUY_EUR"
  | "SELL_EUR"
  | "TRANSFER_SENT"
  | "TRANSFER_RECEIVED";

export interface Account {
  id: string;
  name: string;
  iban: string;
}

export interface Balance {
  userId: string;
  balance: number;
  usdBalance?: number;
  eurBalance?: number;
  goldBalance?: number;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  timestamp: string;
  description: string;
}

export interface User {
  id: string;
  name: string;
  balance: number;
  usdBalance?: number;
  eurBalance?: number;
  goldBalance?: number;
  transactions?: Transaction[];
}

// Başlangıç verileri
export const INITIAL_ACCOUNTS = [
  {
    id: "user1",
    name: "Ahmet Yılmaz",
    balance: 5000,
    usdBalance: 100,
    eurBalance: 250,
    goldBalance: 5,
    transactions: [
      {
        id: "t1",
        type: "DEPOSIT",
        fromCurrency: "TRY",
        toCurrency: "TRY",
        amount: 5000,
        timestamp: "2024-03-20T00:00:00.000Z",
        description: "İlk para yatırma"
      }
    ]
  },
  {
    id: "user2",
    name: "Ayşe Demir",
    balance: 3000,
    usdBalance: 100,
    eurBalance: 250,
    goldBalance: 5,
    transactions: [
      {
        id: "t2",
        type: "DEPOSIT",
        fromCurrency: "TRY",
        toCurrency: "TRY",
        amount: 3000,
        timestamp: "2024-03-20T00:00:00.000Z",
        description: "İlk para yatırma"
      }
    ]
  }
];
