// @google/genai should not be used in frontend code. Defining types locally.
export interface FunctionCall {
    name: string;
    args: { [key: string]: any };
}

export interface Part {
  text?: string;
  functionCall?: FunctionCall;
  functionResponse?: {
    name: string;
    response: { [key: string]: any };
  };
}

export interface Content {
  role: 'user' | 'model' | 'function';
  parts: Part[];
}


export interface Message {
  role: 'user' | 'model';
  content: string;
}

// Gemini's Content type is more structured, so we'll use it for history.
export type ChatHistory = Content[];

export interface UserData {
  [key: string]: string;
}

// Defines the shape of the data coming back from our secure /api/proxy endpoint
export interface GeminiProxyResponse {
    text: string;
    functionCalls?: FunctionCall[];
}
