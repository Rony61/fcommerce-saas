import "dotenv/config";
import express from "express";
import { parseBanglishOrder } from "./aiParser";

const app = express();
app.use(express.json());

// Root endpoint test
app.get("/", (req, res) => {
  res.status(200).send("F-Commerce AI Server Running!");
});

// Verification endpoint for Facebook Webhook setup
app.get("/webhook/facebook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.FB_VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Primary Webhook handler for incoming Facebook Messenger messages
app.post("/webhook/facebook", async (req, res) => {
  res.status(200).send("EVENT_RECEIVED");

  console.log("\n----------------------------------------");
  console.log("📩 Incoming Webhook Payload Received!");

  try {
    const messagingEvent = req.body?.entry?.[0]?.messaging?.[0];
    const userMessage = messagingEvent?.message?.text;
    const senderId = messagingEvent?.sender?.id;

    if (!userMessage) {
      console.log("⚠️ No message text found in incoming payload.");
      return;
    }

    console.log(`👤 Sender PSID: ${senderId}`);
    console.log(`💬 Incoming Message: "${userMessage}"`);
    console.log("🤖 Dispatching text to Gemini AI for Banglish extraction...");

    const parsedOrder = await parseBanglishOrder(userMessage);
    
    console.log("✅ Parsed Order Result:");
    console.dir(parsedOrder, { depth: null, colors: true });

  } catch (error) {
    console.error("❌ Webhook Processing Error:", error);
  }
});

// Support local development while exporting Express app for Vercel Serverless
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`🚀 Local Server listening on port ${PORT}`);
  });
}

export default app;
