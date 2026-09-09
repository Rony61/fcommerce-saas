import express from "express";
import { GoogleGenAI, Type, Schema } from "@google/genai";

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function parseBanglishOrder(text: string) {
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      customerName: { type: Type.STRING, description: "Name of the customer if mentioned" },
      phoneNumber: { type: Type.STRING, description: "11-digit Bangladeshi mobile number starting with 01" },
      address: { type: Type.STRING, description: "Delivery address or location details" },
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING },
            quantity: { type: Type.INTEGER },
            price: { type: Type.NUMBER }
          },
          required: ["productName", "quantity"]
        }
      },
      totalAmount: { type: Type.NUMBER, description: "Total price if specified" }
    },
    required: ["phoneNumber", "items"]
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Extract order details from this Banglish customer message: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.1
    }
  });

  return JSON.parse(response.text || "{}");
}

app.get("/", (req, res) => {
  res.status(200).send("F-Commerce AI Server Running!");
});

app.get("/webhook/facebook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.FB_VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook/facebook", async (req, res) => {
  try {
    const messagingEvent = req.body?.entry?.[0]?.messaging?.[0];
    const userMessage = messagingEvent?.message?.text;

    if (!userMessage) {
      res.status(200).send("EVENT_RECEIVED");
      return;
    }

    console.log(`💬 Processing: "${userMessage}"`);
    const parsedOrder = await parseBanglishOrder(userMessage);
    console.log("✅ Parsed:", parsedOrder);

    res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(200).send("EVENT_RECEIVED");
  }
});

export default app;
