const express = require('express');
const multer = require('multer');
const { Web3 } = require('web3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// CORS middleware for production
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  }
});

// Blockchain configuration
const BLOCKCHAIN_CONFIG = {
  rpcUrl: process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
  contractAddress: process.env.CONTRACT_ADDRESS || '0xe27A7D41af7a7AE1166cf5668eb57832E001211A',
  privateKey: process.env.PRIVATE_KEY || '0xf8facddfeb4c5a4b22c819906f07d703af695b088e3715601563d4067d47bf5f',
  accountAddress: process.env.ACCOUNT_ADDRESS || '0x7553F1f079Aeee2c37605fA3220c4a358cd9A791'
};

// Smart contract ABI for the dynamic TrustTrack contract
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
  },
  {
    "inputs": [
      { "name": "productId", "type": "string" },
      { "name": "eventId", "type": "string" }
    ],
    "name": "getStageData",
    "outputs": [{ "name": "", "type": "string[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "productId", "type": "string" },
      { "name": "eventId", "type": "string" }
    ],
    "name": "getStageMeta",
    "outputs": [
      { "name": "comments", "type": "string" },
      { "name": "mediaIpfs", "type": "string" },
      { "name": "timestamp", "type": "uint256" },
      { "name": "submitter", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Initialize Web3 and contract
let web3, contract, account;

async function initializeBlockchain() {
  try {
    console.log('Initializing blockchain connection...');
    
    web3 = new Web3(BLOCKCHAIN_CONFIG.rpcUrl);
    
    // Create account from private key
    account = web3.eth.accounts.privateKeyToAccount(BLOCKCHAIN_CONFIG.privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    
    // Initialize contract
    contract = new web3.eth.Contract(CONTRACT_ABI, BLOCKCHAIN_CONFIG.contractAddress);
    
    // Check account balance
    const balance = await web3.eth.getBalance(account.address);
    const balanceInEth = web3.utils.fromWei(balance, 'ether');
    
    console.log(`Blockchain initialized successfully`);
    console.log(`Account: ${account.address}`);
    console.log(`Balance: ${balanceInEth} ETH`);
    
    if (parseFloat(balanceInEth) < 0.001) {
      console.warn('⚠️  Low balance! You may need Sepolia ETH for transactions.');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize blockchain:', error);
    return false;
  }
}

// Mock IPFS upload function (replace with actual IPFS implementation)
async function uploadToIPFS(files) {
  // For now, return mock IPFS hashes
  // In production, integrate with actual IPFS service
  const mockHashes = files.map(file => `Qm${Math.random().toString(36).substring(2, 15)}`);
  return mockHashes.join(',');
}

// API endpoint to submit stage data
app.post('/api/submit-stage', upload.array('media', 10), async (req, res) => {
  try {
    console.log('Received stage submission request');
    
    const { productId, comments, dynamicFields } = req.body;
    const files = req.files || [];
    
    // Validate required fields
    if (!productId || !productId.trim()) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    
    // Parse dynamic fields
    let parsedDynamicFields = [];
    try {
      parsedDynamicFields = JSON.parse(dynamicFields || '[]');
    } catch (e) {
      console.warn('Failed to parse dynamic fields, using empty array');
    }
    
    console.log('Processing submission:', {
      productId: productId.trim(),
      comments: comments || '',
      dynamicFieldsCount: parsedDynamicFields.length,
      mediaFilesCount: files.length
    });
    
    // Generate unique event ID for this stage
    const eventId = uuidv4();
    
    // Convert dynamic fields to key||value format
    const keyValuePairs = parsedDynamicFields.map(field => 
      `${field.key.trim()}||${field.value.trim()}`
    );
    
    // Upload media to IPFS (mock for now)
    let mediaIpfs = '';
    if (files.length > 0) {
      mediaIpfs = await uploadToIPFS(files);
      console.log(`Uploaded ${files.length} files to IPFS: ${mediaIpfs}`);
    }
    
    // Submit to blockchain
    console.log('Submitting to blockchain...');
    
    const gasPrice = await web3.eth.getGasPrice();
    const gasEstimate = await contract.methods.addStage(
      productId.trim(),
      eventId,
      keyValuePairs,
      comments || '',
      mediaIpfs
    ).estimateGas({ from: account.address });
    
    console.log(`Gas estimate: ${gasEstimate}, Gas price: ${gasPrice}`);
    
    const tx = await contract.methods.addStage(
      productId.trim(),
      eventId,
      keyValuePairs,
      comments || '',
      mediaIpfs
    ).send({
      from: account.address,
      gas: Math.floor(Number(gasEstimate) * 1.2), // Add 20% buffer
      gasPrice
    });
    
    console.log(`Transaction successful: ${tx.transactionHash}`);
    
    // Clean up uploaded files (optional, or keep for serving)
    // files.forEach(file => {
    //   fs.unlinkSync(file.path);
    // });
    
    res.json({
      success: true,
      transactionHash: tx.transactionHash,
      eventId,
      message: 'Stage data successfully recorded on blockchain'
    });
    
  } catch (error) {
    console.error('Error submitting stage data:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.warn('Failed to clean up file:', file.path);
        }
      });
    }
    
    let errorMessage = 'Failed to submit stage data';
    if (error.message.includes('insufficient funds')) {
      errorMessage = 'Insufficient funds for gas fees. Please add Sepolia ETH to the account.';
    } else if (error.message.includes('revert')) {
      errorMessage = 'Smart contract rejected the transaction. Please check your data.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error.message 
    });
  }
});

// API endpoint to get product stages
app.get('/api/product/:productId/stages', async (req, res) => {
  try {
    const { productId } = req.params;
    
    console.log(`Fetching stages for product: ${productId}`);
    
    // Get stage IDs for the product
    const stageIds = await contract.methods.getStageIds(productId).call();
    
    if (stageIds.length === 0) {
      return res.json({ stages: [] });
    }
    
    // Get data for each stage
    const stages = [];
    for (const eventId of stageIds) {
      try {
        // Get stage data (key-value pairs)
        const stageData = await contract.methods.getStageData(productId, eventId).call();
        
        // Get stage metadata
        const stageMeta = await contract.methods.getStageMeta(productId, eventId).call();
        
        // Parse key-value pairs
        const fields = {};
        stageData.forEach(pair => {
          const [key, value] = pair.split('||');
          if (key && value !== undefined) {
            fields[key] = value;
          }
        });
        
        stages.push({
          eventId,
          fields,
          comments: stageMeta.comments,
          mediaIpfs: stageMeta.mediaIpfs,
          timestamp: parseInt(stageMeta.timestamp) * 1000, // Convert to milliseconds
          submitter: stageMeta.submitter
        });
      } catch (error) {
        console.warn(`Failed to fetch stage ${eventId}:`, error.message);
      }
    }
    
    // Sort by timestamp
    stages.sort((a, b) => a.timestamp - b.timestamp);
    
    res.json({ stages });
    
  } catch (error) {
    console.error('Error fetching product stages:', error);
    res.status(500).json({ 
      error: 'Failed to fetch product stages',
      details: error.message 
    });
  }
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    blockchain: !!contract,
    account: account?.address || 'Not initialized'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'TrustTrack Backend API',
    version: '1.0.0',
    endpoints: [
      'POST /api/submit-stage',
      'GET /api/product/:productId/stages',
      'GET /api/health'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start server
async function startServer() {
  const blockchainReady = await initializeBlockchain();
  
  if (!blockchainReady) {
    console.error('❌ Failed to initialize blockchain connection');
    process.exit(1);
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});