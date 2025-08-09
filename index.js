// Express + Web3 backend API for tt-backend, Sepolia testnet ready

const express = require('express');
const { Web3 } = require('web3');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3001;

// Blockchain config via Railway env vars
const RPC_URL = process.env.RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY; // MetaMask private key
const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS; // MetaMask account address

// TrustTrack contract ABI: update if contract changes
const CONTRACT_ABI = [
  {
    "inputs": [
      { "name": "productId", "type": "string" },
      { "name": "eventId", "type": "string" },
      { "name": "keyValuePairs", "type": "string[]" },
      { "name": "comments", "type": "string" },
      { "name": "mediaIpfs", "type": "string" }
    ],
    "name": "addStage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "productId", "type": "string" }],
    "name": "getStageIds",
    "outputs": [{ "name": "", "type": "string[]" }],
    "stateMutability": "view",
    "type": "function"
  }
  // ...add more contract methods as needed
];

const web3 = new Web3(RPC_URL);
const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

// API endpoint: POST /api/event
// Body: { productId, eventId, keyValuePairs (array), comments, mediaIpfs }
app.post('/api/event', async (req, res) => {
  try {
    const { productId, eventId, keyValuePairs, comments, mediaIpfs } = req.body;

    // Prepare transaction
    const tx = contract.methods.addStage(productId, eventId, keyValuePairs, comments, mediaIpfs);
    const encoded = tx.encodeABI();

    const txCount = await web3.eth.getTransactionCount(ACCOUNT_ADDRESS, 'pending');
    const txObject = {
      from: ACCOUNT_ADDRESS,
      to: CONTRACT_ADDRESS,
      data: encoded,
      gas: 350000,
      nonce: txCount
    };

    // Sign and send transaction
    const signed = await web3.eth.accounts.signTransaction(txObject, PRIVATE_KEY);
    const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);

    res.status(200).json({ status: 'ok', txHash: receipt.transactionHash });
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
});

// API endpoint: GET /api/stages/:productId
app.get('/api/stages/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const stageIds = await contract.methods.getStageIds(productId).call();
    res.json({ productId, stageIds });
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('🚀 TrustTrack backend running');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
