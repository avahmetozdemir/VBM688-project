import { NextResponse } from "next/server";
import {
  User,
  Balance,
  ExchangeRate,
  Currency,
  Transaction,
  INITIAL_ACCOUNTS,
  TransactionType
} from "@/lib/types";

// Demo veriler
let accounts = [...INITIAL_ACCOUNTS];

// API Fonksiyonları
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const userId = searchParams.get("userId");
  const userName = searchParams.get("userName");
  switch (action) {
    case "balances":
      const balances = accounts.map((account) => ({
        currency: "TRY" as Currency,
        amount: account.balance
      }));
      return NextResponse.json({
        balances,
        message: "Bakiyeler başarıyla getirildi"
      });

    case "exchangeRates":
      const rates = [
        { from: "USD" as Currency, to: "TRY" as Currency, rate: 32.5 },
        { from: "EUR" as Currency, to: "TRY" as Currency, rate: 35.5 },
        { from: "XAU" as Currency, to: "TRY" as Currency, rate: 2150 }
      ];
      return NextResponse.json({
        rates,
        message: "Kurlar başarıyla getirildi"
      });

    case "accountInfo":
      if (!userId && !userName) {
        return NextResponse.json(
          { error: "userId veya userName gerekli" },
          { status: 400 }
        );
      }

      if (userName) {
        console.log("Aranan kullanıcı adı:", userName);
        const account = accounts.find((acc) => {
          console.log("Kontrol edilen hesap:", acc.name);
          return acc.name.toLowerCase() === userName.toLowerCase();
        });
        console.log("Bulunan hesap:", account);
        return NextResponse.json({ account });
      }

      if (userId) {
        const account = accounts.find((acc) => acc.id === userId);
        return NextResponse.json({ account });
      }

      return NextResponse.json(
        { error: "userId veya userName gerekli" },
        { status: 400 }
      );

    case "transactions":
      if (!userId) {
        return NextResponse.json(
          { error: "Kullanıcı ID'si gerekli" },
          { status: 400 }
        );
      }

      const user = INITIAL_ACCOUNTS.find((account) => account.id === userId);
      if (!user) {
        return NextResponse.json(
          { error: "Kullanıcı bulunamadı" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        transactions: user.transactions || []
      });

    default:
      return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      action,
      userId,
      amount,
      type,
      fromUserId,
      toUserId,
      fromCurrency,
      toCurrency
    } = body;

    switch (action) {
      case "updateBalance":
        const account = accounts.find((acc) => acc.id === userId);
        if (!account) {
          return NextResponse.json(
            { error: "Hesap bulunamadı" },
            { status: 404 }
          );
        }

        if (type === "WITHDRAW" && account.balance < amount) {
          return NextResponse.json(
            { error: "Yetersiz bakiye" },
            { status: 400 }
          );
        }

        account.balance += type === "DEPOSIT" ? amount : -amount;

        // İşlem geçmişine ekle
        const transaction: Transaction = {
          id: `t${Date.now()}`,
          type: type as TransactionType,
          fromCurrency: "TRY",
          toCurrency: "TRY",
          amount,
          timestamp: new Date().toISOString(),
          description: `${
            type === "DEPOSIT" ? "Para yatırma" : "Para çekme"
          } işlemi`
        };

        account.transactions.unshift(transaction);

        return NextResponse.json({ success: true, account });

      case "transfer":
        const fromAccount = accounts.find((acc) => acc.id === fromUserId);
        const toAccount = accounts.find((acc) => acc.id === toUserId);

        if (!fromAccount || !toAccount) {
          return NextResponse.json(
            { error: "Hesap bulunamadı" },
            { status: 404 }
          );
        }

        if (fromAccount.balance < amount) {
          return NextResponse.json(
            { error: "Yetersiz bakiye" },
            { status: 400 }
          );
        }

        fromAccount.balance -= amount;
        toAccount.balance += amount;

        // İşlem geçmişine ekle
        const transferTransaction: Transaction = {
          id: `t${Date.now()}`,
          type: "TRANSFER",
          fromCurrency: "TRY",
          toCurrency: "TRY",
          amount,
          timestamp: new Date().toISOString(),
          description: `${toAccount.name} hesabına transfer`
        };

        fromAccount.transactions.unshift(transferTransaction);
        toAccount.transactions.unshift({
          ...transferTransaction,
          description: `${fromAccount.name} hesabından transfer`
        });

        return NextResponse.json({ success: true });

      case "exchangeCurrency":
        const userAccount = accounts.find((acc) => acc.id === userId);
        if (!userAccount) {
          return NextResponse.json(
            { error: "Hesap bulunamadı" },
            { status: 404 }
          );
        }

        // Döviz kurlarını al
        const rates = [
          { from: "USD", to: "TRY", rate: 32.5 },
          { from: "EUR", to: "TRY", rate: 35.5 },
          { from: "XAU", to: "TRY", rate: 2150 }
        ];

        // Kur bilgisini bul
        const rateInfo = rates.find((r) => r.from === toCurrency);
        if (!rateInfo) {
          return NextResponse.json(
            { error: "Geçersiz para birimi" },
            { status: 400 }
          );
        }

        // TL'den döviz alımı
        if (fromCurrency === "TRY") {
          const requiredAmount = amount * rateInfo.rate;

          // Bakiye kontrolü
          if (userAccount.balance < requiredAmount) {
            return NextResponse.json(
              { error: "Yetersiz bakiye" },
              { status: 400 }
            );
          }

          // TL bakiyesini düş
          userAccount.balance -= requiredAmount;

          // Döviz bakiyesini artır
          switch (toCurrency) {
            case "USD":
              userAccount.usdBalance = (userAccount.usdBalance || 0) + amount;
              break;
            case "EUR":
              userAccount.eurBalance = (userAccount.eurBalance || 0) + amount;
              break;
            case "XAU":
              userAccount.goldBalance = (userAccount.goldBalance || 0) + amount;
              break;
          }

          // İşlem geçmişine ekle
          const exchangeTransaction: Transaction = {
            id: `t${Date.now()}`,
            type: `BUY_${toCurrency}` as TransactionType,
            fromCurrency: "TRY",
            toCurrency,
            amount: requiredAmount,
            timestamp: new Date().toISOString(),
            description: `${amount} ${toCurrency} alımı`
          };

          userAccount.transactions.unshift(exchangeTransaction);

          return NextResponse.json({
            success: true,
            account: userAccount,
            transaction: exchangeTransaction
          });
        }

        return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });

      case "reset":
        accounts = [...INITIAL_ACCOUNTS];
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
    }
  } catch (error) {
    console.error("API Hatası:", error);
    return NextResponse.json(
      { error: "İşlem sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}
