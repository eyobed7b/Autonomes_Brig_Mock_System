const { getTowers, addMpesaTransaction, setTowerAvailability } = require('./db');
const { banks } = require('./data');

const errorReasons = [
  'G2 Core timeout',
  'Bank API gateway error',
  'Radio link packet loss',
  'Site power instability',
  'Fiber cut detected'
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function mutateTowerMetrics() {
  const towers = getTowers();
  towers.forEach((tower) => {
    tower.voiceSuccessRate = clamp(tower.voiceSuccessRate + (Math.random() * 6 - 3), 70, 100);
    tower.smsSuccessRate = clamp(tower.smsSuccessRate + (Math.random() * 5 - 2.5), 70, 100);
    tower.dataSuccessRate = clamp(tower.dataSuccessRate + (Math.random() * 6 - 3), 65, 100);
    tower.dataThroughputMbps = clamp(tower.dataThroughputMbps + (Math.random() * 16 - 8), 20, 120);
    tower.voiceCallAttempts += Math.floor(Math.random() * 6 + 1);
    tower.smsVolume += Math.floor(Math.random() * 14 + 6);
    tower.dataSessions += Math.floor(Math.random() * 4 + 1);
    tower.activeUsers = clamp(
      (tower.activeUsers || 1000) + Math.floor(Math.random() * 60 - 20),
      100,
      5000
    );

    const computedAvailability = (tower.voiceSuccessRate + tower.smsSuccessRate + tower.dataSuccessRate) / 3;
    setTowerAvailability(tower.id, clamp(computedAvailability, 35, 100));
  });
}

function generateMpesaTransactions() {
  const towers = getTowers();
  towers.forEach((tower) => {
    const txCount = Math.floor(Math.random() * 5);
    const servicePenalty = (100 - tower.currentAvailability) * 0.008 + (100 - tower.dataSuccessRate) * 0.004;
    for (let i = 0; i < txCount; i += 1) {
      const amount = Number((Math.random() * 1000 + 30).toFixed(2));
      const transactionType = Math.random() < 0.35 ? 'WITHDRAWAL' : 'PAYMENT';
      const failureChance = clamp(servicePenalty + Math.random() * 0.08, 0, 0.45);
      const status = Math.random() > failureChance ? 'SUCCESS' : 'FAILED';
      const errorCode = status === 'FAILED' ? pickRandom(errorReasons) : null;
      const gateway = amount > 600 ? 'Bank API' : 'G2 Core';

      addMpesaTransaction({
        towerId: tower.id,
        amount,
        status,
        transactionType,
        errorCode,
        gateway
      });
    }
  });
}

function mutateBankMetrics() {
  banks.forEach((bank) => {
    bank.successRate = clamp(Number((bank.successRate + (Math.random() * 1.6 - 0.8)).toFixed(1)), 80, 100);
    bank.apiLatencyMs = clamp(Math.round(bank.apiLatencyMs + Math.random() * 40 - 20), 80, 600);
    if (Math.random() < 0.04) bank.connected = !bank.connected;
    if ((!bank.connected || bank.apiLatencyMs > 450) && Math.random() < 0.12) {
      bank.incidents = Math.min(bank.incidents + 1, 8);
    }
    if (bank.incidents > 0 && Math.random() < 0.09) bank.incidents -= 1;
  });
}

function startSimulation() {
  mutateTowerMetrics();
  generateMpesaTransactions();
  mutateBankMetrics();
  setInterval(() => {
    mutateTowerMetrics();
    generateMpesaTransactions();
    mutateBankMetrics();
  }, 5000);
}

module.exports = {
  startSimulation
};
