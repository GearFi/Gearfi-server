import Moralis from 'moralis';
import express from 'express';
import cors from 'cors';
import config from './config';
import { parseServer } from './parseServer';
// @ts-ignore
import ParseServer from 'parse-server';
import http from 'http';
import ngrok from 'ngrok';
import { streamsSync } from '@moralisweb3/parse-server';
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
  origin: 'http://localhost:3000',
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

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});