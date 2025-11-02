import type { ChatHistory, Part, GeminiProxyResponse } from "../types";

/**
 * يرسل رسالة إلى الخادم الوكيل الآمن، الذي يقوم بدوره بالاتصال بـ Gemini API.
 * @param history سجل المحادثة الحالي.
 * @param newMessage الرسالة الجديدة من المستخدم.
 * @param functionResponses استجابات دالة اختيارية لإرسالها مرة أخرى إلى النموذج.
 * @returns وعد يتم حله بالاستجابة المجهزة من الخادم الوكيل.
 */
export const sendMessageToGemini = async (
  history: ChatHistory,
  newMessage: string,
  functionResponses?: Part[]
): Promise<GeminiProxyResponse> => {
    
    const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ history, newMessage, functionResponses }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Error from proxy server:", errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to fetch from proxy');
    }

    const geminiResponse: GeminiProxyResponse = await response.json();
    return geminiResponse;
};