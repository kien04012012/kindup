const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const GROQ_API_KEY = defineSecret("GROQ_API_KEY");

exports.callGroq = onCall(
  {
    region: "asia-southeast1",
    cors: true,
    secrets: [GROQ_API_KEY]
  },
  async (request) => {
    try {
      const data = request.data || {};
      const prompt = data.prompt;
      const sys = data.sys;
      const messages = data.messages;
      const max_tokens = data.max_tokens || 400;
      const temperature = data.temperature ?? 0.8;

      let finalMessages = [];

      if (Array.isArray(messages) && messages.length) {
        finalMessages = messages;
      } else if (prompt) {
        finalMessages = [
          {
            role: "system",
            content: sys || "Bạn là trợ lý AI thân thiện, trả lời ngắn gọn bằng tiếng Việt."
          },
          {
            role: "user",
            content: prompt
          }
        ];
      } else {
        throw new HttpsError("invalid-argument", "Missing prompt or messages");
      }

      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY.value()}`
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: finalMessages,
          max_tokens,
          temperature
        })
      });

      const json = await resp.json();

      if (!resp.ok) {
        console.error("Groq API error:", json);
        throw new HttpsError("internal", json?.error?.message || "Groq request failed");
      }

      return {
        content: json?.choices?.[0]?.message?.content || ""
      };
    } catch (err) {
      console.error("callGroq error:", err);
      throw new HttpsError("internal", err.message || "Unknown error");
    }
  }
);