import express from "express";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Hardcode the known Supabase project URL to eliminate runtime environment resolution errors
const SUPABASE_URL = "https://zhkjjyxnauszkbnxueok.supabase.co";

async function parseBanglishOrder(text: string) {
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      customerName: { type: Type.STRING },
      phoneNumber: { type: Type.STRING },
      address: { type: Type.STRING },
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
      totalAmount: { type: Type.NUMBER }
    },
    required: ["items"]
  };

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: `Extract order details from this Banglish customer message: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.1
    }
  });

  return JSON.parse(response.text || "{}");
}

app.get("/", (req, res) => res.status(200).send("F-Commerce AI Server Running!"));

app.get("/webhook/facebook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.FB_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook/facebook", async (req, res) => {
  console.log("---------------- WEBHOOK TRIGGERED ----------------");
  console.log("RAW PAYLOAD:", JSON.stringify(req.body, null, 2));

  try {
    const messagingEvent = req.body?.entry?.[0]?.messaging?.[0];
    const userMessage = messagingEvent?.message?.text;
    const senderId = messagingEvent?.sender?.id;

    if (!userMessage) {
      console.log("⚠️ Received non-text event or delivery receipt. Skipping.");
      return res.status(200).send("EVENT_RECEIVED");
    }

    console.log(`💬 Processing Text Message: "${userMessage}"`);

    let parsedOrder: any = {};
    try {
      parsedOrder = await parseBanglishOrder(userMessage);
      console.log("✅ Gemini Output:", JSON.stringify(parsedOrder));
    } catch (parseErr: any) {
      console.error("❌ Gemini Parsing Failed:", parseErr?.message || parseErr);
    }

    const record = {
      customer_name: parsedOrder?.customerName || "Unknown",
      phone_number: parsedOrder?.phoneNumber || null,
      address: parsedOrder?.address || null,
      items: parsedOrder?.items || [],
      total_amount: typeof parsedOrder?.totalAmount === "number" ? parsedOrder.totalAmount : 0,
      raw_message: userMessage,
      sender_id: senderId || null
    };

    console.log("⏳ Initializing Supabase client...");
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!serviceKey) {
      console.error("❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is missing from process.env");
    }

    const supabase = createClient(SUPABASE_URL, serviceKey);
    const { data, error } = await supabase.from("orders").insert([record]).select();

    if (error) {
      console.error("❌ Supabase DB Error:", JSON.stringify(error, null, 2));
    } else {
      console.log("💾 SUCCESS: Inserted Row into Supabase:", JSON.stringify(data, null, 2));
    }

  } catch (globalErr: any) {
    console.error("❌ Uncaught Error during Webhook execution:", globalErr?.message || globalErr);
  } finally {
    console.log("---------------- WEBHOOK COMPLETED ----------------");
    res.status(200).send("EVENT_RECEIVED");
  }
});

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => console.log(`🚀 Local dev server running on port ${PORT}`));
}

export default app;
