"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const moralis_1 = __importDefault(require("moralis"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = __importDefault(require("./config"));
const parseServer_1 = require("./parseServer");
// @ts-ignore
const parse_server_1 = __importDefault(require("parse-server"));
const http_1 = __importDefault(require("http"));
const ngrok_1 = __importDefault(require("ngrok"));
const parse_server_2 = require("@moralisweb3/parse-server");
const { EvmChain } = require("@moralisweb3/common-evm-utils");
exports.app = (0, express_1.default)();
const port = 4000;
const address = "0x45F0bF42fc26923e88a46b15Ad22B89fA50Dbb37";
const chain = 5;
moralis_1.default.start({
    apiKey: config_1.default.MORALIS_API_KEY,
});
exports.app.use(express_1.default.urlencoded({ extended: true }));
exports.app.use(express_1.default.json());
exports.app.use((0, cors_1.default)({
    origin: 'http://localhost:3000',
    credentials: true,
}));
exports.app.use((0, parse_server_2.streamsSync)(parseServer_1.parseServer, {
    apiKey: config_1.default.MORALIS_API_KEY,
    webhookUrl: '/streams',
}));
exports.app.use(`/server`, parseServer_1.parseServer.app);
const httpServer = http_1.default.createServer(exports.app);
httpServer.listen(config_1.default.PORT, async () => {
    if (config_1.default.USE_STREAMS) {
        const url = await ngrok_1.default.connect(config_1.default.PORT);
        // eslint-disable-next-line no-console
        console.log(`Moralis Server is running on port ${config_1.default.PORT} and stream webhook url ${url}${config_1.default.STREAMS_WEBHOOK_URL}`);
    }
    else {
        // eslint-disable-next-line no-console
        console.log(`Moralis Server is running on port ${config_1.default.PORT}.`);
    }
});
// This will enable the Live Query real-time server
parse_server_1.default.createLiveQueryServer(httpServer);
async function getDemoData() {
    // Get the nfts
    const nftsBalances = await moralis_1.default.EvmApi.nft.getWalletNFTs({
        address,
        chain,
        limit: 10,
    });
    // Format the output to return name, amount and metadata
    const nfts = nftsBalances.result.map((nft) => ({
        metadata: nft.result.metadata,
        token_address: nft.tokenAddress,
        token_id: nft.tokenId,
    }));
    return { nfts };
}
exports.app.get("/demo", async (req, res) => {
    try {
        // Get and return the crypto data
        const data = await getDemoData();
        res.status(200);
        res.json(data);
    }
    catch (error) {
        // Handle errors
        console.error(error);
        res.status(500);
        res.json({ error: error.message });
    }
});
exports.app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
//# sourceMappingURL=index.js.map