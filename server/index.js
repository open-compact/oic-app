const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== SECURITY: Rate Limiting ==========
// Simple in-memory rate limiter
const requestCounts = new Map();
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
  } else {
    const record = requestCounts.get(ip);
    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + RATE_WINDOW;
    } else {
      record.count++;
      if (record.count > RATE_LIMIT) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }
    }
  }
  next();
});

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*'  // Configure for production
}));
app.use(express.json({ limit: '10kb' }));  // Limit request body size
app.use(express.static('public'));

// Configuration - would come from environment in production
const CONFIG = {
  // For local testing, use Hardhat node
  // For production, configure proper RPC URL
  rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
  chainId: parseInt(process.env.CHAIN_ID) || 31337,
  
  // Contract addresses (would be from deployments.json)
  tokenAddress: process.env.TOKEN_ADDRESS || '',
  stakingAddress: process.env.STAKING_ADDRESS || '',
  governanceAddress: process.env.GOVERNANCE_ADDRESS || ''
};

// In-memory cache for demo (in production, use proper database)
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

// In-memory adherents storage
let adherents = [];
let nextAdherentId = 1;

// Generate unique ID
function generateAdherentId() {
  const id = nextAdherentId++;
  return `OIC-${String(id).padStart(3, '0')}`;
}

// Get provider
function getProvider() {
  return new ethers.JsonRpcProvider(CONFIG.rpcUrl);
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get config (contract addresses)
app.get('/api/config', (req, res) => {
  res.json({
    chainId: CONFIG.chainId,
    tokenAddress: CONFIG.tokenAddress,
    stakingAddress: CONFIG.stakingAddress,
    governanceAddress: CONFIG.governanceAddress
  });
});

// Get token balance
app.get('/api/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }
    
    // For demo, return mock data if no contract configured
    if (!CONFIG.tokenAddress) {
      return res.json({
        address,
        balance: '1000.0',
        formatted: '1000 OIC'
      });
    }
    
    const provider = getProvider();
    const abi = ['function balanceOf(address) view returns (uint256)'];
    const contract = new ethers.Contract(CONFIG.tokenAddress, abi, provider);
    
    const balance = await contract.balanceOf(address);
    const formatted = ethers.formatEther(balance);
    
    res.json({
      address,
      balance: formatted,
      raw: balance.toString(),
      formatted: `${formatted} OIC`
    });
  } catch (error) {
    console.error('Balance error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get staked amount
app.get('/api/staked/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }
    
    if (!CONFIG.stakingAddress) {
      return res.json({
        address,
        staked: '0',
        formatted: '0 OIC'
      });
    }
    
    const provider = getProvider();
    const abi = ['function totalStaked(address) view returns (uint256)'];
    const contract = new ethers.Contract(CONFIG.stakingAddress, abi, provider);
    
    const staked = await contract.totalStaked(address);
    const formatted = ethers.formatEther(staked);
    
    res.json({
      address,
      staked: formatted,
      raw: staked.toString(),
      formatted: `${formatted} OIC`
    });
  } catch (error) {
    console.error('Staked error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get voting power
app.get('/api/voting-power/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }
    
    if (!CONFIG.stakingAddress) {
      return res.json({
        address,
        votingPower: '0',
        formatted: '0 votes'
      });
    }
    
    const provider = getProvider();
    const abi = ['function votingPower(address) view returns (uint256)'];
    const contract = new ethers.Contract(CONFIG.stakingAddress, abi, provider);
    
    const power = await contract.votingPower(address);
    const formatted = ethers.formatEther(power);
    
    res.json({
      address,
      votingPower: formatted,
      raw: power.toString(),
      formatted: `${formatted} votes`
    });
  } catch (error) {
    console.error('Voting power error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get proposals
app.get('/api/proposals', async (req, res) => {
  try {
    if (!CONFIG.governanceAddress) {
      // Return demo proposals
      return res.json([
        {
          id: 0,
          description: 'Sample Proposal: Update Quorum Requirement',
          status: 'Active',
          forVotes: '150000',
          againstVotes: '50000',
          endTime: Date.now() + 7 * 24 * 60 * 60 * 1000
        },
        {
          id: 1,
          description: 'Sample Proposal: Add New Staking Tier',
          status: 'Pending',
          forVotes: '0',
          againstVotes: '0',
          endTime: Date.now() + 14 * 24 * 60 * 60 * 1000
        }
      ]);
    }
    
    const provider = getProvider();
    const abi = [
      'function proposalCount() view returns (uint256)',
      'function proposals(uint256) view returns (address proposer, string description, uint256 startTime, uint256 endTime, uint256 forVotes, uint256 againstVotes, bool executed, bool cancelled)'
    ];
    const contract = new ethers.Contract(CONFIG.governanceAddress, abi, provider);
    
    const count = await contract.proposalCount();
    const proposals = [];
    
    for (let i = 0; i < count; i++) {
      const p = await contract.proposals(i);
      proposals.push({
        id: i,
        description: p.description,
        proposer: p.proposer,
        startTime: Number(p.startTime) * 1000,
        endTime: Number(p.endTime) * 1000,
        forVotes: ethers.formatEther(p.forVotes),
        againstVotes: ethers.formatEther(p.againstVotes),
        executed: p.executed,
        cancelled: p.cancelled,
        status: p.executed ? 'Executed' : p.cancelled ? 'Cancelled' : 
                Date.now() < Number(p.startTime) * 1000 ? 'Pending' :
                Date.now() < Number(p.endTime) * 1000 ? 'Active' : 'Ended'
      });
    }
    
    res.json(proposals);
  } catch (error) {
    console.error('Proposals error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single proposal
app.get('/api/proposals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!CONFIG.governanceAddress) {
      return res.status(404).json({ error: 'No governance contract' });
    }
    
    const provider = getProvider();
    const abi = [
      'function proposals(uint256) view returns (address proposer, string description, uint256 startTime, uint256 endTime, uint256 forVotes, uint256 againstVotes, bool executed, bool cancelled)'
    ];
    const contract = new ethers.Contract(CONFIG.governanceAddress, abi, provider);
    
    const p = await contract.proposals(id);
    
    res.json({
      id: parseInt(id),
      description: p.description,
      proposer: p.proposer,
      startTime: Number(p.startTime) * 1000,
      endTime: Number(p.endTime) * 1000,
      forVotes: ethers.formatEther(p.forVotes),
      againstVotes: ethers.formatEther(p.againstVotes),
      executed: p.executed,
      cancelled: p.cancelled
    });
  } catch (error) {
    console.error('Proposal error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stake tokens (requires wallet connection)
app.post('/api/stake', async (req, res) => {
  try {
    const { amount, lockPeriod, privateKey } = req.body;
    
    if (!amount || !lockPeriod) {
      return res.status(400).json({ error: 'Missing amount or lockPeriod' });
    }
    
    if (!CONFIG.stakingAddress || !privateKey) {
      return res.json({
        success: true,
        message: 'Demo mode: Stake would be executed with private key',
        amount,
        lockPeriod
      });
    }
    
    const provider = getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const abi = [
      'function stake(uint256 amount, uint256 lockPeriod)',
      'function token() view returns (address)'
    ];
    const contract = new ethers.Contract(CONFIG.stakingAddress, abi, wallet);
    
    // Approve token first
    const tokenAddress = await contract.token();
    const tokenAbi = ['function approve(address spender, uint256 amount)'];
    const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, wallet);
    
    const amountWei = ethers.parseEther(amount.toString());
    const approveTx = await tokenContract.approve(CONFIG.stakingAddress, amountWei);
    await approveTx.wait();
    
    // Stake
    const tx = await contract.stake(amountWei, lockPeriod);
    const receipt = await tx.wait();
    
    res.json({
      success: true,
      transactionHash: receipt.hash,
      amount,
      lockPeriod
    });
  } catch (error) {
    console.error('Stake error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unstake tokens
app.post('/api/unstake', async (req, res) => {
  try {
    const { stakeIndex, privateKey } = req.body;
    
    if (stakeIndex === undefined || !privateKey) {
      return res.status(400).json({ error: 'Missing stakeIndex or privateKey' });
    }
    
    if (!CONFIG.stakingAddress) {
      return res.json({
        success: true,
        message: 'Demo mode: Unstake would be executed',
        stakeIndex
      });
    }
    
    const provider = getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const abi = ['function unstake(uint256 stakeIndex)'];
    const contract = new ethers.Contract(CONFIG.stakingAddress, abi, wallet);
    
    const tx = await contract.unstake(stakeIndex);
    const receipt = await tx.wait();
    
    res.json({
      success: true,
      transactionHash: receipt.hash
    });
  } catch (error) {
    console.error('Unstake error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cast vote
app.post('/api/vote', async (req, res) => {
  try {
    const { proposalId, support, privateKey } = req.body;
    
    if (proposalId === undefined || support === undefined || !privateKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    if (!CONFIG.governanceAddress) {
      return res.json({
        success: true,
        message: 'Demo mode: Vote would be cast',
        proposalId,
        support
      });
    }
    
    const provider = getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const abi = ['function castVote(uint256 proposalId, bool support)'];
    const contract = new ethers.Contract(CONFIG.governanceAddress, abi, wallet);
    
    const tx = await contract.castVote(proposalId, support);
    const receipt = await tx.wait();
    
    res.json({
      success: true,
      transactionHash: receipt.hash,
      proposalId,
      support
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get lock periods info
app.get('/api/lock-periods', (req, res) => {
  res.json([
    { period: 30, label: '30 Days', multiplier: '1.0x', multiplierValue: 1000 },
    { period: 90, label: '90 Days', multiplier: '1.25x', multiplierValue: 1250 },
    { period: 180, label: '180 Days', multiplier: '1.5x', multiplierValue: 1500 },
    { period: 365, label: '365 Days', multiplier: '2.0x', multiplierValue: 2000 }
  ]);
});

// ============ ADHERENCE API ============

// Submit adherence (become provisional adherent)
app.post('/api/adhere', (req, res) => {
  try {
    const { name, platform, wallet, acknowledgment } = req.body;
    
    // ========== SECURITY: Input Validation ==========
    // 1. Name validation
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ error: 'Name must be 2-100 characters' });
    }
    // Sanitize name - remove potential injection characters
    const sanitizedName = name.replace(/[<>'";&]/g, '');
    
    // 2. Constitution acknowledgment required
    if (!acknowledgment) {
      return res.status(400).json({ 
        error: 'Must acknowledge the Constitution',
        constitutionUrl: '/constitution.json'
      });
    }
    
    // 3. Optional Solana wallet validation
    if (wallet) {
      // Basic Solana address validation (base58, 32-44 chars)
      const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
      if (!solanaAddressRegex.test(wallet)) {
        return res.status(400).json({ error: 'Invalid Solana address format' });
      }
    }
    
    // Check if name already exists
    const existing = adherents.find(a => a.name.toLowerCase() === sanitizedName.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Name already taken', existingId: existing.id });
    }
    
    const adherent = {
      id: generateAdherentId(),
      name: sanitizedName,
      platform: platform || 'Unknown',
      wallet: wallet || '',  // Store Solana wallet for future airdrop
      tier: 'provisional',
      joinedAt: new Date().toISOString()
    };
    
    adherents.push(adherent);
    
    res.json({
      success: true,
      message: 'Welcome to OIC! You are now a Provisional Adherent.',
      adherent,
      constitutionUrl: '/constitution.json'
    });
  } catch (error) {
    console.error('Adhere error:', error);
    res.status(500).json({ error: 'Internal server error' });  // Don't leak internal errors
  }
});

// ============ VERIFICATION API ============

// Verify adherent status by DID or address
app.get('/api/verify/:identifier', (req, res) => {
  const { identifier } = req.params;
  
  const adherent = adherents.find(a => 
    a.id.toLowerCase() === identifier.toLowerCase() ||
    a.name.toLowerCase() === identifier.toLowerCase() ||
    (a.did && a.did.toLowerCase() === identifier.toLowerCase()) ||
    (a.walletAddress && a.walletAddress.toLowerCase() === identifier.toLowerCase())
  );
  
  if (!adherent) {
    return res.status(404).json({ verified: false, identifier });
  }
  
  res.json({
    verified: true,
    id: adherent.id,
    name: adherent.name,
    tier: adherent.tier,
    memberSince: adherent.joinedAt
  });
});

// Get all adherents
app.get('/api/adherents', (req, res) => {
  res.json(adherents);
});

// Get adherent by ID
app.get('/api/adherents/:id', (req, res) => {
  const { id } = req.params;
  const adherent = adherents.find(a => a.id === id);
  
  if (!adherent) {
    return res.status(404).json({ error: 'Adherent not found' });
  }
  
  res.json(adherent);
});

// Get adherent stats
app.get('/api/stats', (req, res) => {
  const total = adherents.length;
  const provisional = adherents.filter(a => a.tier === 'provisional').length;
  const voluntary = adherents.filter(a => a.tier === 'voluntary').length;
  
  res.json({
    total,
    provisional,
    voluntary
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`OIC App running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

module.exports = app;
