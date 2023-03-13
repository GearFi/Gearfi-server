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

const address = "0x45F0bF42fc26923e88a46b15Ad22B89fA50Dbb37"
const chain = EvmChain.ETHEREUM

Moralis.start({
  apiKey: config.MORALIS_API_KEY,
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cors());

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
    name: nft.result.name,
    amount: nft.result.amount,
    metadata: nft.result.metadata,
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

const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

// to use our .env variables
require('dotenv').config();

app.use(express.json());
app.use(cookieParser());

// allow access to React app domain


// const cconfig = {
//   domain: process.env.APP_DOMAIN,
//   statement: 'Please sign this message to confirm your identity.',
//   uri: process.env.REACT_URL,
//   timeout: 60,
// };

const STATEMENT = 'Please sign this message to confirm your identity.';
const EXPIRATION_TIME = 900000000;
const TIMEOUT = 15;

// request message to be signed by client
app.post('/request-message', async (req, res) => {
  const { address, chain, network } = req.body;
  console.log(address, chain, network)
  const url = new URL(config.SERVER_URL);
  const now = new Date();
  const expirationTime = new Date(now.getTime() + EXPIRATION_TIME);
 

  try {
    console.log("sending request")
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

app.post('/verify', async (req, res) => {
  try {
    const { message, signature } = req.body;

    const { address, profileId } = (
      await Moralis.Auth.verify({
        message,
        signature,
        networkType: 'evm',
      })
    ).raw;

    const user = { address, profileId, signature };

    // create JWT token
    const token = jwt.sign(user, process.env.AUTH_SECRET);

    // set JWT cookie
    res.cookie('jwt', token, {
      httpOnly: true,
    });

    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
    console.error(error);
  }
});

app.get('/authenticate', async (req, res) => {
  const token = req.cookies.jwt;
  if (!token) return res.sendStatus(403); // if the user did not send a jwt token, they are unauthorized

  try {
    const data = jwt.verify(token, process.env.AUTH_SECRET);
    res.json(data);
  } catch {
    return res.sendStatus(403);
  }
});

app.get('/logout', async (req, res) => {
  try {
    res.clearCookie('jwt');
    return res.sendStatus(200);
  } catch {
    return res.sendStatus(403);
  }
});
