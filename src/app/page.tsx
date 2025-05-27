"use client";

import ChatbotWidget from "@/components/ChatbotWidget";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Banka Uygulaması</h1>
        <p className="text-lg text-gray-600">
          Hoş geldiniz! Lütfen kullanıcı sayfanıza gitmek için URL'deki
          kullanıcı ID'nizi kullanın. Örnek: /user123
        </p>
      </div>

      {/* Chatbot Widget */}
      <ChatbotWidget />
    </div>
  );
}
