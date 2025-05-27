"use client";

import { useEffect, useRef, useState } from "react";
import { FaRobot, FaTimes } from "react-icons/fa";

interface ChatbotWidgetProps {
  userId: string;
}

export default function ChatbotWidget({ userId }: ChatbotWidgetProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // iframe yüklendiğinde userId'yi gönder
    const handleIframeLoad = async () => {
      try {
        const response = await fetch(
          `/api/bank?action=accountInfo&userId=${userId}`
        );
        const data = await response.json();

        if (data.account) {
          iframeRef.current?.contentWindow?.postMessage(
            {
              type: "initChatbot",
              userId,
              userInfo: data.account
            },
            "*"
          );
        }
      } catch (error) {
        console.error("Kullanıcı bilgisi alınamadı:", error);
      }
    };

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener("load", handleIframeLoad);
    }

    return () => {
      if (iframe) {
        iframe.removeEventListener("load", handleIframeLoad);
      }
    };
  }, [userId]);

  return (
    <>
      {/* Chatbot Butonu */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
      >
        <FaRobot className="text-2xl" />
      </button>

      {/* Chatbot Penceresi */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Başlık Çubuğu */}
          <div className="bg-blue-500 text-white p-4 flex justify-between items-center">
            <h3 className="font-semibold">Bankacılık Asistanı</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <FaTimes />
            </button>
          </div>

          {/* Chatbot İframe */}
          <iframe
            ref={iframeRef}
            src={`/chatbot?userId=${userId}`}
            className="w-full h-[calc(100%-56px)] border-none"
            title="Bankacılık Asistanı"
          />
        </div>
      )}
    </>
  );
}
