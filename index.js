const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
app.use(express.json());

// ENV VARIABLES
const PIXEL_ID = process.env.PIXEL_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

// HASH FUNCTION
function hashData(data) {
  if (!data) return null;
  return crypto
    .createHash("sha256")
    .update(data.trim().toLowerCase())
    .digest("hex");
}

// HEALTH CHECK (Render ke liye)
app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

// WEBHOOK
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    console.log("Webhook Data:", JSON.stringify(body, null, 2));

    // 🔥 FIXED DATA EXTRACTION (MOST IMPORTANT)
    const email = body.data?.customer_details?.customer_email;
    const phone = body.data?.customer_details?.customer_phone;

    const value = body.data?.order?.order_amount;
    const event_id = body.data?.order?.order_id;

    // ❌ agar data nahi mila toh crash mat hone de
    if (!event_id || !value) {
      console.log("Invalid payload received ❌");
      return res.sendStatus(200); // important: Cashfree ko 200 bhejna hi hai
    }

    await axios.post(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        data: [
          {
            event_name: "Purchase",
            event_time: Math.floor(Date.now() / 1000),
            action_source: "website",
            event_id: event_id,

            user_data: {
              em: email ? [hashData(email)] : [],
              ph: phone ? [hashData(phone)] : [],
            },

            custom_data: {
              currency: "INR",
              value: value,
            },
          },
        ],
      }
    );

    console.log("Meta Event Sent ✅");

    res.sendStatus(200);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);

    // ⚠️ VERY IMPORTANT → Cashfree retry avoid karne ke liye
    res.sendStatus(200);
  }
});

// PORT (Render ke liye important)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
