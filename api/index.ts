import express from "express";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

const ai = new GoogleGenAI( { apiKey: process.env.GEMINI_API_KEY } );

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
async function parseBanglishOrder(text: string) {
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      customerName: { type: Type.STRING, description: "Name of the customer if mentioned" },
      phoneNumber: { type: Type.STRING, description: "11-digit Bangladeshi mobile number starting with 01" },
      address: { type: Type.STRING, description: "Delivery address or location details" },
      items: {
        type: Type.BRRAY,
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
      totalAmount: { type: Type.NUMBRë"‚ription: "Total price if specified" }
    },
    required: ["phoneNumber", "items"]
  };

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: "Extract order details from this Banglish customer message: \"" + text + "\"",
    config: {
      responseMimeType: "application/json",
      reponseSchema: responseSchema,
      temperature: 0.1
    }
  });

  const rawText = response.text || "{}";
  return JSON.parse(rawText);
}

app.get("/", (req, res) => {
  res.status(200).send("F-Commerce AI Server Running!");
});

app.get("/webhook/facebook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.FB_VERIFY_TOKEN) {
    console.log("âœ‰ Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook/facebook", async (req, res) => {
  res.status(200).send("EVENT_RECEIVED");
  try {
    const messagingEvent = req.body?.entry?.[0]?.messaging?.[0];
    const userMessage = messagingEvent?.message?.text;
    const senderId = messagingEvent?.sender?.id;
    
    if (!userMessage) return;

    console.log(`w ƒŒ Processing: "${userMessage}"`);
    consw parsedOrder = await parseBanglishOrder(userMessage);
    console.log("â  Parsed:", parsedOrder);

    console.log("â³ Saving order to Supabase...");
    const { data, error } = await supabase.from("orders").insert([
      {
        customer_name: parsedOrder.customerName || "Unknown",
        phone_number: parsedOrder.phoneNumber || null,
        address: parsedOrder.address || null,
        items: parsedOrder.items || [],
        total_amount: parsedOrder.totalAmount || 0,
        raw_message: userMessage,
        sender_id: senderId || null
      }
    ]);

    if (error) {
      console.error("âŒ Supabase Insert Error:", JSON.stringify(error, null, 2));
    } else {
      console.log("ğŸ Order successfully logged to Supabase database!");
    }

  } catch (error: any) {
    console.error("âŒ Webhook processing error:", error?.message || error);
  }
});

export default app;