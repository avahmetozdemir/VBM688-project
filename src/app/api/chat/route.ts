import { NextResponse } from "next/server";
import OpenAI from "openai";
import { User } from "@/lib/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// API URL'ini oluştur
const getApiUrl = (path: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  return `${baseUrl}${path}`;
};

// Kullanıcı adını ID'ye çevir
const getUserNameToId = (name: string): string => {
  const nameToId: { [key: string]: string } = {
    "Ahmet Yılmaz": "user1",
    "Ayşe Demir": "user2"
  };
  return nameToId[name] || name;
};

// Altın hesaplaması yap
const calculateGoldAmount = (amount: number, goldRate: number) => {
  const grams = amount / goldRate;
  return {
    amount,
    grams: parseFloat(grams.toFixed(4)),
    rate: goldRate
  };
};

// Döviz/Altın alım-satım hesaplaması yap
const calculateCurrencyAmount = (
  amount: number,
  rate: number,
  isBuy: boolean
) => {
  if (isBuy) {
    // TL'den döviz/altın alımı
    return {
      amount,
      currencyAmount: parseFloat((amount / rate).toFixed(4)),
      rate
    };
  } else {
    // Döviz/altından TL'ye çevirme
    return {
      amount: parseFloat((amount * rate).toFixed(2)),
      currencyAmount: amount,
      rate
    };
  }
};

const functions = [
  {
    name: "getAccountInfo",
    description: "Kullanıcının hesap bilgilerini getirir",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "Kullanıcı ID'si"
        }
      },
      required: ["userId"]
    }
  },
  {
    name: "transferMoney",
    description: "İki kullanıcı arasında para transferi yapar",
    parameters: {
      type: "object",
      properties: {
        fromUserId: {
          type: "string",
          description: "Gönderen kullanıcı ID'si"
        },
        toUserName: {
          type: "string",
          description: "Alıcı kullanıcının tam adı"
        },
        amount: {
          type: "number",
          description: "Transfer edilecek miktar (TL)"
        }
      },
      required: ["fromUserId", "toUserName", "amount"]
    }
  },
  {
    name: "exchangeCurrency",
    description: "Döviz alım/satım işlemi yapar",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "Kullanıcı ID'si"
        },
        fromCurrency: {
          type: "string",
          enum: ["TRY", "USD", "EUR", "XAU"],
          description: "Kaynak para birimi"
        },
        toCurrency: {
          type: "string",
          enum: ["TRY", "USD", "EUR", "XAU"],
          description: "Hedef para birimi"
        },
        amount: {
          type: "number",
          description: "İşlem miktarı"
        }
      },
      required: ["userId", "fromCurrency", "toCurrency", "amount"]
    }
  },
  {
    name: "updateUserBalance",
    description: "Kullanıcı bakiyesini günceller",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "Kullanıcı ID'si"
        },
        amount: {
          type: "number",
          description: "İşlem miktarı"
        },
        type: {
          type: "string",
          enum: [
            "DEPOSIT",
            "WITHDRAW",
            "BUY_GOLD",
            "SELL_GOLD",
            "BUY_USD",
            "SELL_USD",
            "BUY_EUR",
            "SELL_EUR",
            "TRANSFER_SENT",
            "TRANSFER_RECEIVED"
          ],
          description: "İşlem tipi"
        },
        currency: {
          type: "string",
          enum: ["TRY", "USD", "EUR", "XAU"],
          description: "Para birimi"
        },
        description: {
          type: "string",
          description: "İşlem açıklaması"
        }
      },
      required: ["userId", "amount", "type", "currency", "description"]
    }
  },

  {
    name: "getExchangeRates",
    description: "Döviz kurlarını getirir",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  }
];

// Kullanıcı adına göre kullanıcıyı bul
const findUserByName = async (name: string) => {
  try {
    const response = await fetch(
      getApiUrl(
        `/api/bank?action=accountInfo&userName=${encodeURIComponent(name)}`
      )
    );
    const data = await response.json();
    console.log("Kullanıcı arama sonucu:", data);
    return data.account;
  } catch (error) {
    console.error("Kullanıcı arama hatası:", error);
    return null;
  }
};

// Kullanıcı hesap bilgilerini getir
const getAccountInfo = async (userId: string) => {
  const response = await fetch(
    getApiUrl(`/api/bank?action=accountInfo&userId=${userId}`)
  );
  const data = await response.json();
  return data.account;
};

// Transfer işlemini gerçekleştir
const performTransfer = async (
  fromUserId: string,
  toUserId: string,
  amount: number
) => {
  const response = await fetch(getApiUrl("/api/bank"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "transfer",
      fromUserId,
      toUserId,
      amount
    })
  });
  return response.json();
};

export async function POST(req: Request) {
  try {
    const { message, context, userId, userInfo } = await req.json();
    console.log("API isteği alındı:", { message, context, userId, userInfo });

    if (!userId) {
      console.log("Kullanıcı bilgisi eksik");
      return NextResponse.json(
        { error: "Kullanıcı bilgisi bulunamadı" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Sen bir bankacılık asistanısın. Aktif kullanıcı: ${
            userInfo.name
          } (ID: ${userId}).

Görevlerin:
1. Para transferi: Kullanıcılar arası TL transferi yapabilirsin.
2. Döviz işlemleri: TL'den USD, EUR veya altın alımı/satımı yapabilirsin.
3. Bakiye sorgulama: Kullanıcının TL, USD, EUR ve altın bakiyelerini gösterebilirsin.

Önemli Kurallar:
1. Her işlemde aktif kullanıcının bilgilerini kullan.
2. Para transferi için sadece alıcının adını iste, IBAN isteme.
3. Yetersiz bakiye durumunda, kullanıcıya bilgi ver ve alternatif öner.
4. Her işlem öncesi kullanıcıdan onay al.
5. İşlem sonrası güncel bakiyeleri göster.
6. Döviz/altın işlemleri için güncel kurları göster ve hesaplama yap.
7. Kullanıcının anlamadığı durumlarda nazikçe açıklama yap.

Mevcut Kullanıcı Bilgileri:
- İsim: ${userInfo.name}
- TL Bakiye: ${userInfo.balance} TL
- USD Bakiye: ${userInfo.usdBalance || 0} USD
- EUR Bakiye: ${userInfo.eurBalance || 0} EUR
- Altın Bakiye: ${userInfo.goldBalance || 0} gram`
        },
        ...context,
        { role: "user", content: message }
      ],
      functions,
      function_call: "auto"
    });

    console.log("OpenAI yanıtı:", completion.choices[0].message);

    const responseMessage = completion.choices[0].message;

    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);
      console.log("Fonksiyon çağrısı:", { functionName, functionArgs });

      let functionResult;
      let reply;

      switch (functionName) {
        case "getAccountInfo":
          const accountResponse = await fetch(
            getApiUrl(
              `/api/bank?action=accountInfo&userId=${functionArgs.userId}`
            )
          );
          functionResult = await accountResponse.json();
          console.log("getAccountInfo sonucu:", functionResult);

          if (!functionResult.account) {
            reply = "Hesap bilgilerine ulaşılamadı.";
            break;
          }

          const account = functionResult.account;
          reply =
            `Hesap Bilgileri:\n` +
            `- İsim: ${account.name}\n` +
            `- TL Bakiye: ${account.balance} TL\n` +
            `- USD Bakiye: ${account.usdBalance || 0} USD\n` +
            `- EUR Bakiye: ${account.eurBalance || 0} EUR\n` +
            `- Altın Bakiye: ${account.goldBalance || 0} gram`;
          break;

        case "updateUserBalance":
          const balanceResponse = await fetch(getApiUrl("/api/bank"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "updateBalance",
              userId: functionArgs.userId,
              amount: functionArgs.amount,
              type: functionArgs.type,
              currency: functionArgs.currency,
              description: functionArgs.description
            })
          });
          functionResult = await balanceResponse.json();
          console.log("updateUserBalance sonucu:", functionResult);

          if (functionResult.success) {
            const updatedAccount = await fetch(
              getApiUrl(
                `/api/bank?action=accountInfo&userId=${functionArgs.userId}`
              )
            ).then((res) => res.json());

            reply =
              `İşlem başarıyla gerçekleşti!\n\n` +
              `Güncel Bakiyeler:\n` +
              `- TL: ${updatedAccount.account.balance} TL\n` +
              `- USD: ${updatedAccount.account.usdBalance || 0} USD\n` +
              `- EUR: ${updatedAccount.account.eurBalance || 0} EUR\n` +
              `- Altın: ${updatedAccount.account.goldBalance || 0} gram`;
          } else {
            reply = "İşlem başarısız oldu. Lütfen daha sonra tekrar deneyin.";
          }
          break;

        case "transferMoney":
          // 1. Hedef kullanıcıyı bul
          const toUser = await findUserByName(functionArgs.toUserName);
          if (!toUser) {
            reply = "Belirtilen alıcı bulunamadı. Lütfen ismi kontrol edin.";
            break;
          }

          // 2. Bakiye kontrolü
          const senderAccount = await getAccountInfo(functionArgs.fromUserId);
          if (senderAccount.balance < functionArgs.amount) {
            reply = `Yetersiz bakiye. Mevcut bakiyeniz: ${senderAccount.balance} TL`;
            break;
          }

          // 3. Transfer onayı
          reply =
            `Transfer Detayları:\n` +
            `- Mevcut Bakiyeniz: ${senderAccount.balance} TL\n` +
            `- Gönderilecek Tutar: ${functionArgs.amount} TL\n` +
            `- İşlem Sonrası Bakiye: ${
              senderAccount.balance - functionArgs.amount
            } TL\n` +
            `- Alıcı: ${toUser.name}\n\n` +
            `Bu transferi gerçekleştirmek istediğinize emin misiniz? (Evet/Hayır)`;

          // Kullanıcı onayı kontrolü
          const userConfirmation = message.toLowerCase();
          const confirmKeywords = [
            "evet",
            "tamam",
            "onaylıyorum",
            "gönder",
            "yolla",
            "yollayalım",
            "gönderelim"
          ];
          const rejectKeywords = ["hayır", "iptal", "vazgeç", "istemiyorum"];

          if (
            rejectKeywords.some((keyword) => userConfirmation.includes(keyword))
          ) {
            reply = "Transfer işlemi iptal edildi.";
            break;
          }

          if (
            !confirmKeywords.some((keyword) =>
              userConfirmation.includes(keyword)
            )
          ) {
            break; // Onay bekleniyor
          }

          // 4. Transferi gerçekleştir
          const transferResult = await performTransfer(
            functionArgs.fromUserId,
            toUser.id,
            functionArgs.amount
          );
          if (transferResult.success) {
            const updatedSenderAccount = await getAccountInfo(
              functionArgs.fromUserId
            );
            reply =
              `Transfer başarıyla gerçekleşti!\n\n` +
              `- Gönderilen Tutar: ${functionArgs.amount} TL\n` +
              `- Alıcı: ${toUser.name}\n` +
              `- Yeni Bakiyeniz: ${updatedSenderAccount.balance} TL\n\n` +
              `Başka bir işlem yapmak ister misiniz?`;
          } else {
            reply =
              "Transfer işlemi başarısız oldu. Lütfen daha sonra tekrar deneyin.";
          }
          break;

        case "exchangeCurrency":
          // 1. Bakiye kontrolü
          const userAccount = await getAccountInfo(functionArgs.userId);
          if (!userAccount) {
            reply = "Hesap bilgilerine ulaşılamadı.";
            break;
          }

          // 2. Kur bilgilerini al
          const exchangeRatesResponse = await fetch(
            getApiUrl("/api/bank?action=exchangeRates")
          );
          const exchangeRatesData = await exchangeRatesResponse.json();
          const rateInfo = exchangeRatesData.rates.find(
            (rate: any) => rate.from === functionArgs.toCurrency
          );

          if (!rateInfo) {
            reply = "Geçersiz para birimi.";
            break;
          }

          // 3. TL'den döviz alımı
          if (functionArgs.fromCurrency === "TRY") {
            const requiredAmount = functionArgs.amount * rateInfo.rate;

            if (userAccount.balance < requiredAmount) {
              reply = `Yetersiz bakiye. Gerekli tutar: ${requiredAmount} TL, Mevcut bakiye: ${userAccount.balance} TL`;
              break;
            }

            // 4. İşlem onayı
            reply =
              `Döviz Alım Detayları:\n` +
              `- Alınacak Miktar: ${functionArgs.amount} ${functionArgs.toCurrency}\n` +
              `- Güncel Kur: ${rateInfo.rate} TL\n` +
              `- Ödenecek Tutar: ${requiredAmount} TL\n` +
              `- Mevcut TL Bakiyeniz: ${userAccount.balance} TL\n` +
              `- İşlem Sonrası TL Bakiyeniz: ${
                userAccount.balance - requiredAmount
              } TL\n\n` +
              `Bu alımı gerçekleştirmek istediğinize emin misiniz? (Evet/Hayır)`;

            // Kullanıcı onayı kontrolü
            const userConfirmation = message.toLowerCase();
            const confirmKeywords = [
              "evet",
              "tamam",
              "onaylıyorum",
              "al",
              "alalım"
            ];
            const rejectKeywords = ["hayır", "iptal", "vazgeç", "istemiyorum"];

            if (
              rejectKeywords.some((keyword) =>
                userConfirmation.includes(keyword)
              )
            ) {
              reply = "Döviz alım işlemi iptal edildi.";
              break;
            }

            if (
              !confirmKeywords.some((keyword) =>
                userConfirmation.includes(keyword)
              )
            ) {
              break; // Onay bekleniyor
            }

            // 5. İşlemi gerçekleştir
            const exchangeResponse = await fetch(getApiUrl("/api/bank"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "exchangeCurrency",
                userId: functionArgs.userId,
                fromCurrency: functionArgs.fromCurrency,
                toCurrency: functionArgs.toCurrency,
                amount: functionArgs.amount
              })
            });

            const exchangeResult = await exchangeResponse.json();
            if (exchangeResult.success) {
              const updatedUserAccount = await getAccountInfo(
                functionArgs.userId
              );
              reply =
                `Döviz alımı başarıyla gerçekleşti!\n\n` +
                `- Alınan Miktar: ${functionArgs.amount} ${functionArgs.toCurrency}\n` +
                `- Ödenen Tutar: ${requiredAmount} TL\n` +
                `- Yeni Bakiyeler:\n` +
                `  * TL: ${updatedUserAccount.balance} TL\n` +
                `  * ${functionArgs.toCurrency}: ${
                  updatedUserAccount[
                    `${functionArgs.toCurrency.toLowerCase()}Balance`
                  ] || 0
                } ${functionArgs.toCurrency}\n\n` +
                `Başka bir işlem yapmak ister misiniz?`;
            } else {
              reply =
                "Döviz alım işlemi başarısız oldu. Lütfen daha sonra tekrar deneyin.";
            }
          } else {
            reply = "Şu anda sadece TL'den döviz alımı yapılabilir.";
          }
          break;

        case "getExchangeRates":
          const ratesResponse = await fetch(
            getApiUrl("/api/bank?action=exchangeRates")
          );
          const ratesData = await ratesResponse.json();
          console.log("getExchangeRates sonucu:", ratesData);

          const goldRate = ratesData.rates.find(
            (rate: any) => rate.from === "XAU"
          )?.rate;
          const usdRate = ratesData.rates.find(
            (rate: any) => rate.from === "USD"
          )?.rate;
          const eurRate = ratesData.rates.find(
            (rate: any) => rate.from === "EUR"
          )?.rate;

          // Kullanıcının mesajını analiz et
          const messageLower = message.toLowerCase();
          const tlAmount = messageLower.match(/(\d+)\s*tl/)?.[1];
          const currency = messageLower.match(/(dolar|euro|altın)/)?.[1];

          if (tlAmount && currency) {
            // Döviz alım talebi var
            const amount = parseInt(tlAmount);
            let targetCurrency = "";
            let rate = 0;

            switch (currency) {
              case "dolar":
                targetCurrency = "USD";
                rate = usdRate || 0;
                break;
              case "euro":
                targetCurrency = "EUR";
                rate = eurRate || 0;
                break;
              case "altın":
                targetCurrency = "XAU";
                rate = goldRate || 0;
                break;
              default:
                reply = "Geçersiz para birimi.";
                break;
            }

            if (rate > 0) {
              const currencyAmount = parseFloat((amount / rate).toFixed(4));

              // Kullanıcı onayı kontrolü
              const userConfirmation = messageLower;
              const confirmKeywords = [
                "evet",
                "tamam",
                "onaylıyorum",
                "al",
                "alalım"
              ];
              const rejectKeywords = [
                "hayır",
                "iptal",
                "vazgeç",
                "istemiyorum"
              ];

              // Eğer onay veya red kelimeleri yoksa, onay iste
              if (
                !confirmKeywords.some((keyword) =>
                  userConfirmation.includes(keyword)
                ) &&
                !rejectKeywords.some((keyword) =>
                  userConfirmation.includes(keyword)
                )
              ) {
                reply =
                  `Döviz Alım Detayları:\n` +
                  `- Alınacak Miktar: ${currencyAmount} ${targetCurrency}\n` +
                  `- Güncel Kur: ${rate} TL\n` +
                  `- Ödenecek Tutar: ${amount} TL\n\n` +
                  `Bu alımı gerçekleştirmek istediğinize emin misiniz? (Evet/Hayır)`;
                break;
              }

              // Red durumu
              if (
                rejectKeywords.some((keyword) =>
                  userConfirmation.includes(keyword)
                )
              ) {
                reply = "Döviz alım işlemi iptal edildi.";
                break;
              }

              // Onay durumu - işlemi gerçekleştir
              const exchangeResponse = await fetch(getApiUrl("/api/bank"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "exchangeCurrency",
                  userId: userId,
                  fromCurrency: "TRY",
                  toCurrency: targetCurrency,
                  amount: currencyAmount
                })
              });

              const exchangeResult = await exchangeResponse.json();
              if (exchangeResult.success) {
                const updatedAccount = await getAccountInfo(userId);
                reply =
                  `Döviz alımı başarıyla gerçekleşti!\n\n` +
                  `- Alınan Miktar: ${currencyAmount} ${targetCurrency}\n` +
                  `- Ödenen Tutar: ${amount} TL\n` +
                  `- Yeni Bakiyeler:\n` +
                  `  * TL: ${updatedAccount.balance} TL\n` +
                  `  * ${targetCurrency}: ${
                    updatedAccount[`${targetCurrency.toLowerCase()}Balance`] ||
                    0
                  } ${targetCurrency}\n\n` +
                  `Başka bir işlem yapmak ister misiniz?`;
              } else {
                reply =
                  "Döviz alım işlemi başarısız oldu. Lütfen daha sonra tekrar deneyin.";
              }
            } else {
              reply =
                "Güncel kur bilgisi alınamadı. Lütfen daha sonra tekrar deneyin.";
            }
          } else {
            // Sadece kurları göster
            let replyText = "Güncel Kurlar:\n";

            if (goldRate) {
              replyText += `- Altın: ${goldRate} TL/gram\n`;
            }
            if (usdRate) {
              replyText += `- Dolar: ${usdRate} TL\n`;
            }
            if (eurRate) {
              replyText += `- Euro: ${eurRate} TL\n`;
            }

            replyText +=
              "\nDöviz/Altın işlemi yapmak için aşağıdaki formatları kullanabilirsiniz:\n";
            replyText += "- 1000 TL'lik dolar almak istiyorum\n";
            replyText += "- 500 TL'lik altın almak istiyorum\n";
            replyText += "- 2000 TL'lik euro almak istiyorum\n";
            replyText += "- 100 dolar satmak istiyorum\n";
            replyText += "- 50 gram altın satmak istiyorum\n";
            replyText += "- 200 euro satmak istiyorum";

            reply = replyText;
          }
          break;

        default:
          reply = "Bilinmeyen işlem.";
      }

      console.log("API yanıtı:", { reply, functionResult });
      return NextResponse.json({
        reply,
        userState: {
          balances: functionResult?.balances,
          rates: functionResult?.rates
        }
      });
    }

    console.log("API yanıtı:", responseMessage.content);
    return NextResponse.json({
      reply: responseMessage.content
    });
  } catch (error) {
    console.error("API Hatası:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
