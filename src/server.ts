import express from "express";
import { parseBanglishOrder } from "./aiParser";

// Only load dotenv locally. Vercel handles env vars automatically.
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const app = express();
app.use(express.json());

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
  res.status(200).send("EVENT_RECEIVED");
  try {
    const messagingEvent = req.body?.entry?.[0]?.messaging?.[0];
    const userMessage = messagingEvent?.message?.text;
    
    if (!userMessage) return;

    console.log(`💬 Processing: "${userMessage}"`);
    const parsedOrder = await parseBanglishOrder(userMessage);
    console.log("✅ Parsed:", parsedOrder);

  } catch (error) {
    console.error("❌ Error:", error);
  }
});

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => console.log(`🚀 Local Server running on port ${PORT}`));
}

// Required by Vercel Serverless Functions
module.exports = app;
