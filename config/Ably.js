const Ably = require("ably");

let ablyClient;

async function getAblyClient() {
  if (!ablyClient) {
    ablyClient = new Ably.Realtime(process.env.ABLY_CLIENT_SECRET);
    await ablyClient.connection.once("connected");
  }
  return ablyClient;
}

module.exports = { getAblyClient };
