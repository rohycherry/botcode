from pyrogram import Client, filters

API_ID = 36395297
API_HASH = "YOUR_API_HASH"
BOT_TOKEN = "YOUR_BOT_TOKEN"

app = Client("bot", api_id=API_ID, api_hash=API_HASH, bot_token=BOT_TOKEN)

count = {}

@app.on_message(filters.group)
def handler(client, message):

    chat_id = message.chat.id

    if message.forward_origin or message.forward_date:
        message.delete()
        return

    if chat_id not in count:
        count[chat_id] = 0

    count[chat_id] += 1

    if count[chat_id] % 10 == 0:
        message.reply_text("⚠️ Use trusted middleman!")

    if message.text and "hi" in message.text.lower():
        message.reply_text("Hello 👋")

app.run()
