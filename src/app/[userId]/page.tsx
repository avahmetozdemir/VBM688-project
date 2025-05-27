"use client";

import { useEffect, useState } from "react";
import { User, Balance, ExchangeRate, Transaction } from "@/lib/types";
import ChatbotWidget from "@/components/ChatbotWidget";

export default function UserPage({ params }: { params: { userId: string } }) {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([
    {
      from: "USD",
      to: "TRY",
      rate: 32.5
    },
    {
      from: "EUR",
      to: "TRY",
      rate: 35.5
    },
    {
      from: "XAU",
      to: "TRY",
      rate: 2150
    }
  ]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<User | null>(null);

  const fetchUserData = async () => {
    try {
      console.log("fetchUserData başladı");
      const [balancesRes, transactionsRes, ratesRes] = await Promise.all([
        fetch("/api/bank?action=balances").then((res) => res.json()),
        fetch(`/api/bank?action=transactions&userId=${params.userId}`).then(
          (res) => res.json()
        ),
        fetch("/api/bank?action=exchangeRates").then((res) => res.json())
      ]);
      console.log("Balances Data:", balancesRes);
      console.log("Transactions Data:", transactionsRes);
      console.log("Rates Data:", ratesRes);

      setBalances(balancesRes.balances);
      setTransactions(transactionsRes.transactions.slice(0, 5));
      setRates(ratesRes.rates || []);
    } catch (error) {
      console.error("Veri çekme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInfo = async () => {
    try {
      const response = await fetch(
        `/api/bank?action=accountInfo&userId=${params.userId}`
      );
      const data = await response.json();
      console.log("Account bilgisi:", data.account);
      if (data.account) {
        setUserInfo(data.account);
        // LLM'e kullanıcı bilgilerini gönder
        window.parent.postMessage(
          {
            type: "userInfo",
            userInfo: {
              id: data.account.id,
              name: data.account.name,
              balance: data.account.balance,
              usdBalance: data.account.usdBalance,
              eurBalance: data.account.eurBalance,
              goldBalance: data.account.goldBalance
            }
          },
          "*"
        );
      }
    } catch (error) {
      console.error("Kullanıcı bilgisi alınamadı:", error);
    }
  };

  useEffect(() => {
    console.log("İlk useEffect çalıştı");
    fetchUserData();
    fetchUserInfo();
  }, []);

  useEffect(() => {
    console.log("userId değişti:", params.userId);
    fetchUserInfo();
  }, [params.userId]);

  // Chatbot'tan gelen mesajları dinle
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "chatbotResponse" && event.data.userState) {
        console.log("Chatbot userState:", event.data.userState);
        // Güncel kullanıcı durumunu al
        const { balances: newBalances, rates: newRates } = event.data.userState;
        console.log("Yeni bakiyeler:", newBalances);
        console.log("Yeni kurlar:", newRates);
        setBalances(newBalances);
        setRates(newRates || []);

        // Kullanıcı bilgilerini güncelle
        fetchUserInfo();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleTransfer = async (toAccountId: string, amount: number) => {
    try {
      console.log("Transfer başladı:", { toAccountId, amount });
      const response = await fetch("/api/bank", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "transfer",
          fromUserId: params.userId,
          toUserId: toAccountId,
          amount
        })
      });

      if (!response.ok) {
        throw new Error("Transfer başarısız");
      }

      // Bakiyeleri ve kullanıcı bilgilerini güncelle
      await Promise.all([fetchUserData(), fetchUserInfo()]);
    } catch (error) {
      console.error("Transfer işlemi başarısız:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-4"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return <div>Kullanıcı bulunamadı</div>;
  }

  console.log("Render öncesi balances:", balances);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Hoş Geldiniz, {userInfo.name}
        </h1>

        {/* Bakiyeler */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              TL Hesabı
            </h2>
            <p className="text-3xl font-bold text-blue-600">
              {userInfo.balance.toLocaleString("tr-TR", {
                style: "currency",
                currency: "TRY"
              })}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Döviz ve Altın
            </h2>
            <div className="space-y-2">
              <p className="text-xl font-semibold text-green-600">
                {userInfo.usdBalance?.toFixed(2) || "0.00"} USD
              </p>
              <p className="text-xl font-semibold text-purple-600">
                {userInfo.eurBalance?.toFixed(2) || "0.00"} EUR
              </p>
              <p className="text-xl font-semibold text-yellow-600">
                {userInfo.goldBalance?.toFixed(4) || "0.0000"} gr Altın
              </p>
            </div>
          </div>
        </div>

        {/* Güncel Kurlar */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Güncel Kurlar
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rates && rates.length > 0 ? (
              rates.map((rate) => (
                <div key={rate.from} className="p-3 bg-gray-50 rounded">
                  <p className="font-medium text-gray-600">{rate.from}</p>
                  <p className="text-xl font-bold text-gray-800">
                    {rate.rate.toFixed(4)} TL
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500">Kurlar yükleniyor...</p>
            )}
          </div>
        </div>

        {/* Son İşlemler */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Son İşlemler
          </h2>
          <div className="space-y-4">
            {transactions && transactions.length > 0 ? (
              transactions.map((transaction) => {
                // İşlem tipine göre renk ve işaret belirleme
                let color = "text-gray-600";
                let sign = "";
                let prefix = "";

                switch (transaction.type) {
                  case "DEPOSIT":
                  case "TRANSFER_RECEIVED":
                    color = "text-green-600";
                    sign = "+";
                    prefix = "Gelen Para";
                    break;
                  case "WITHDRAW":
                  case "TRANSFER_SENT":
                    color = "text-red-600";
                    sign = "-";
                    prefix = "Giden Para";
                    break;
                  case "BUY_USD":
                  case "BUY_EUR":
                  case "BUY_GOLD":
                    color = "text-red-600";
                    sign = "-";
                    prefix = "Döviz/Altın Alımı";
                    break;
                  case "SELL_USD":
                  case "SELL_EUR":
                  case "SELL_GOLD":
                    color = "text-green-600";
                    sign = "+";
                    prefix = "Döviz/Altın Satışı";
                    break;
                }

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.timestamp).toLocaleString(
                          "tr-TR"
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${color}`}>
                        {sign}
                        {transaction.amount.toLocaleString("tr-TR", {
                          style: "currency",
                          currency: transaction.fromCurrency
                        })}
                      </p>
                      <p className="text-sm text-gray-500">{prefix}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500">Henüz işlem bulunmuyor.</p>
            )}
          </div>
        </div>
      </div>
      <ChatbotWidget userId={params.userId} />
    </div>
  );
}
