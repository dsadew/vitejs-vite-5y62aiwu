/**
 * !!! معلومات هامة جداً !!!
 * 
 * هذا الملف هو "خادم وسيط" (Backend Proxy). لا يمكن تشغيله مباشرة في المتصفح.
 * هذا الكود يجب نشره على منصة تدعم الدوال عديمة الخادم (Serverless Functions) مثل:
 * - Vercel (recommended)
 * - Netlify
 * 
 * الهدف من هذا الخادم هو حماية مفتاح Gemini API الخاص بك.
 */

import { GoogleGenAI, FunctionDeclaration, Type, Content } from "@google/genai";

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'saveUserData',
    description: 'تحفظ معلومة عن المستخدم، مثل تاريخ ميلاده أو اسمه أو لونه المفضل.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        key: { type: Type.STRING, description: 'مفتاح المعلومة (باللغة الإنجليزية، مثل "birthday", "name", "favoriteColor")' },
        value: { type: Type.STRING, description: 'قيمة المعلومة (مثلاً "1 يناير 2000")' },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'getUserData',
    description: 'تسترجع معلومة محفوظة عن المستخدم باستخدام مفتاحها.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        key: { type: Type.STRING, description: 'مفتاح المعلومة المراد استرجاعها (باللغة الإنجليزية، مثل "birthday")' },
      },
      required: ['key'],
    },
  },
];

const systemInstruction = `أنت مساعد ذكاء اصطناعي ودود ومفيد، ومهمتك هي مساعدة المستخدمين على تذكر الأشياء. 
تتحدث اللغة العربية بطلاقة. 
عندما يطلب منك المستخدم حفظ معلومة، استخدم دالة 'saveUserData'. 
عندما يسألك المستخدم عن معلومة، استخدم دالة 'getUserData'.
بعد تنفيذ الدالة، قم بالرد على المستخدم بلغة طبيعية لتأكيد الإجراء أو تقديم المعلومة.
مثال: إذا قال المستخدم "احفظ أن لوني المفضل هو الأزرق"، يجب أن تستدعي saveUserData({key: "favoriteColor", value: "الأزرق"}).
مثال: إذا قال المستخدم "ما هو لوني المفضل؟"، يجب أن تستدعي getUserData({key: "favoriteColor"}).`;

// تم تغيير الدالة لتتوافق مع بيئة تشغيل Vercel Node.js.
// `req` هو الطلب الوارد، و `res` هو كائن الاستجابة لإرساله مرة أخرى إلى العميل.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("متغير البيئة API_KEY غير معين على الخادم.");
    }
    
    const ai = new GoogleGenAI({ apiKey });

    // في بيئة Node.js، يتم تحليل جسم الطلب (JSON) تلقائيًا ويكون متاحًا في `req.body`.
    const { history, newMessage, functionResponses } = req.body;

    const contents: Content[] = [...history];
    if (newMessage) {
      contents.push({ role: 'user', parts: [{ text: newMessage }] });
    }
    if (functionResponses) {
        contents.push({ role: 'function', parts: functionResponses });
    }

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations }],
      }
    });

    // إعداد استجابة مبسطة لإرسالها إلى العميل.
    const clientResponse = {
        text: result.text,
        functionCalls: result.functionCalls
    };

    // استخدام كائن `res` لإرسال الاستجابة بنجاح.
    return res.status(200).json(clientResponse);

  } catch (error) {
    console.error("خطأ في دالة الخادم الوكيل لـ Gemini:", error);
    const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير معروف.';
    
    // استخدام كائن `res` لإرسال استجابة الخطأ.
    return res.status(500).json({ error: 'فشل الاتصال بنموذج الذكاء الاصطناعي.', details: errorMessage });
  }
}
