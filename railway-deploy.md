# Deploy to Railway Without GitHub

## Option 1: Railway CLI (Direct Deploy)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **From server directory, initialize:**
   ```bash
   cd server
   railway init
   ```

4. **Set environment variables:**
   ```bash
   railway variables set RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
   railway variables set CONTRACT_ADDRESS=0xe27A7D41af7a7AE1166cf5668eb57832E001211A
   railway variables set PRIVATE_KEY=0xf8facddfeb4c5a4b22c819906f07d703af695b088e3715601563d4067d47bf5f
   railway variables set ACCOUNT_ADDRESS=0x7553F1f079Aeee2c37605fA3220c4a358cd9A791
   ```

5. **Deploy:**
   ```bash
   railway up
   ```

## Option 2: Render Direct Deploy

1. **Zip your server folder**
2. **Go to [render.com](https://render.com)**
3. **"New Web Service" → "Deploy without Git"**
4. **Upload your zip file**
5. **Add environment variables**

## Option 3: Create GitHub Repo

1. **Download project from Bolt**
2. **Create repo at [github.com/new](https://github.com/new)**
3. **Upload files**
4. **Deploy from GitHub**

## Quick Test Locally First:

```bash
cd server
npm install
npm start
```

Should show: "🚀 Server running on port 3001"