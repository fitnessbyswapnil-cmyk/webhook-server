{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 const express = require("express");\
const axios = require("axios");\
const crypto = require("crypto");\
\
const app = express();\
app.use(express.json());\
\
function hashData(data) \{\
  if (!data) return null;\
  return crypto.createHash("sha256")\
    .update(data.trim().toLowerCase())\
    .digest("hex");\
\}\
\
app.post("/webhook", async (req, res) => \{\
  try \{\
    const data = req.body;\
\
    console.log("Webhook Data:", data);\
\
    const email = data.customer_details?.customer_email;\
    const phone = data.customer_details?.customer_phone;\
    const value = data.order_amount;\
    const event_id = data.order_id;\
\
    await axios.post(\
      "https://graph.facebook.com/v19.0/1004294955172584/events?access_token=EAAH12nj475oBQFoKHA6AlMHk2v478kgKpwqx3KMev3pnYIK0FIEfIBRxi9gQ5SRI1yoHMG7fLhicuG9vPGZATneElQkVzLKObga8olqvDQRMjeWKOzaakCjSxJ5gPqNgqGrLPVZBxHpW1iZABVXpyBIPkydD4Wl1ZACnBdbIGf4b60TjWmzl1nNvIRGr3gZDZD",\
      \{\
        data: [\
          \{\
            event_name: "Purchase",\
            event_time: Math.floor(Date.now() / 1000),\
            action_source: "website",\
            event_id: event_id,\
\
            user_data: \{\
              em: email ? [hashData(email)] : [],\
              ph: phone ? [hashData(phone)] : []\
            \},\
\
            custom_data: \{\
              currency: "INR",\
              value: value\
            \}\
          \}\
        ]\
      \}\
    );\
\
    console.log("Meta Event Sent");\
\
    res.sendStatus(200);\
\
  \} catch (err) \{\
    console.error("Error:", err);\
    res.sendStatus(500);\
  \}\
\});\
\
app.listen(3000, () => console.log("Server running"));}