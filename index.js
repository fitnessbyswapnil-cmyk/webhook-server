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

// HEALTH CHECK
app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

// WEBHOOK
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    console.log("Webhook Data:", JSON.stringify(body, null, 2));

    // 📦 Extract data from Cashfree payload
    const email = body.data?.customer_details?.customer_email;
    const phone = body.data?.customer_details?.customer_phone;
    const name = body.data?.customer_details?.customer_name;

    const value = body.data?.order?.order_amount;
    const event_id = body.data?.order?.order_id;

    const payment_status = body.data?.payment?.payment_status;

    // ❌ Skip if not success
    if (payment_status !== "SUCCESS") {
      console.log("Payment not successful → skipping ❌");
      return res.sendStatus(200);
    }

    // ❌ Skip if no identifiers
    if (!email && !phone) {
      console.log("No user data → skipping ❌");
      return res.sendStatus(200);
    }

    if (!event_id || !value) {
      console.log("Invalid payload → skipping ❌");
      return res.sendStatus(200);
    }

    // 🔥 Name Split Logic
    let firstName = null;
    let lastName = null;

    if (name) {
      const parts = name.trim().split(" ");
      firstName = parts[0];
      lastName = parts.slice(1).join(" ") || "";
    }

    // 🔥 Fallback (optional but powerful)
    if (!firstName && email) {
      firstName = email.split("@")[0];
    }

    // 🚀 SEND TO META
    const response = await axios.post(
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

              fn: firstName ? [hashData(firstName)] : [],
              ln: lastName ? [hashData(lastName)] : [],

              external_id: event_id ? [hashData(event_id)] : [],

              client_ip_address:
                req.headers["x-forwarded-for"] ||
                req.socket.remoteAddress,

              client_user_agent: req.headers["user-agent"],
            },

            custom_data: {
              currency: "INR",
              value: value,
            },
          },
        ],
      }
    );

    console.log("Meta Event Sent ✅", response.data);

    res.sendStatus(200);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);

    // IMPORTANT: Always return 200 to avoid webhook retries
    res.sendStatus(200);
  }
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
