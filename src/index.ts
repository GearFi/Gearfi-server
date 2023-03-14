import Moralis from 'moralis';
import express from 'express';
import cors from 'cors';
import config from './config';
require('dotenv').config();
import { parseServer } from './parseServer';
// @ts-ignore
import ParseServer from 'parse-server';
import http from 'http';
import ngrok from 'ngrok';
import { streamsSync } from '@moralisweb3/parse-server';
import { log } from 'console';
const { EvmChain } = require("@moralisweb3/common-evm-utils")

export const app = express();

const port = 4000

const address = "0x45F0bF42fc26923e88a46b15Ad22B89fA50Dbb37"
const chain = 5

Moralis.start({
  apiKey: config.MORALIS_API_KEY,
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cors({
  origin: 'https://640e64cd1b95cd6e650838ea--chic-custard-49bde6.netlify.app',
  credentials: true,
}));

app.use(
  streamsSync(parseServer, {
    apiKey: config.MORALIS_API_KEY,
    webhookUrl: '/streams',
  }),
);

app.use(`/server`, parseServer.app);

const httpServer = http.createServer(app);
httpServer.listen(config.PORT, async () => {
  if (config.USE_STREAMS) {
    const url = await ngrok.connect(config.PORT);
    // eslint-disable-next-line no-console
    console.log(
      `Moralis Server is running on port ${config.PORT} and stream webhook url ${url}${config.STREAMS_WEBHOOK_URL}`,
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(`Moralis Server is running on port ${config.PORT}.`);
  }
});
// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);

async function getDemoData() {
  // Get the nfts
  const nftsBalances = await Moralis.EvmApi.nft.getWalletNFTs({
    address,
    chain,
    limit: 10,
  })

  // Format the output to return name, amount and metadata
  const nfts = nftsBalances.result.map((nft) => ({
    metadata: nft.result.metadata,
    token_address: nft.tokenAddress,
    token_id: nft.tokenId,
  }))

  return { nfts }
}

app.get("/demo", async (req, res) => {
  try {

    // Get and return the crypto data
    const data = await getDemoData()
    res.status(200)
    res.json(data)
    
  } catch (error) {
    // Handle errors
    console.error(error)
    res.status(500)
    res.json({ error: error.message })
  }
})

const STATEMENT = 'Please sign this message to confirm your identity.';
const EXPIRATION_TIME = 900000000;
const TIMEOUT = 15;

// request message to be signed by client
app.post('/request-message', async (req, res) => {
  const { address, chain, network } = req.body;
  const url = new URL(config.SERVER_URL);
  const now = new Date();
  const expirationTime = new Date(now.getTime() + EXPIRATION_TIME);
 

  try {
    const message = await Moralis.Auth.requestMessage({
      address,
      chain,
      network,
      domain: url.hostname,
    uri: url.toString(),
    statement: STATEMENT,
    notBefore: now.toISOString(),
    expirationTime: expirationTime.toISOString(),
    timeout: TIMEOUT,
    });

    res.status(200).json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
    console.error(error);
  }
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
