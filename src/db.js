const { towers, failedTransactions, mpesaTransactions, agentInsights, banks, createId } = require('./data');

function getBanks() {
  return banks.map((b) => ({ ...b }));
}

function initDataStore() {
  // Data is seeded in memory when the module loads.
}

function getTowers() {
  return towers.map((tower) => {
    const summary = getRecentMpesaSummaryForTower(tower.id, 10);
    return {
      ...tower,
      agentInsight: getAgentInsightForTower(tower.id),
      mpesaTransactionCount: summary.total,
      mpesaSuccessRate: summary.successRate,
      mpesaFailedAmount: summary.failedAmount,
      mpesaSuccessAmount: summary.successAmount
    };
  });
}

function getTowerById(id) {
  return towers.find((tower) => tower.id === id);
}

function addMpesaTransaction({ towerId, amount, status = 'SUCCESS', transactionType = 'PAYMENT', errorCode = null, gateway = 'G2 Core' }) {
  const now = new Date();
  const item = {
    id: createId('tx'),
    timestamp: now.toISOString(),
    amount,
    towerId,
    status,
    transactionType,
    errorCode,
    gateway
  };
  mpesaTransactions.push(item);
  if (status === 'FAILED') {
    failedTransactions.push(item);
  }
  return item;
}

function addFailedTransaction(towerId, amount, errorCode, transactionType = 'PAYMENT') {
  return addMpesaTransaction({
    towerId,
    amount,
    status: 'FAILED',
    transactionType,
    errorCode,
    gateway: amount > 500 ? 'Bank API' : 'G2 Core'
  });
}

function getRecentFailedTransactions(minutes = 10) {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  return failedTransactions.filter((tx) => new Date(tx.timestamp) >= cutoff);
}

function getRecentFailuresForTower(towerId, minutes = 10) {
  const recent = getRecentFailedTransactions(minutes);
  return recent.filter((tx) => tx.towerId === towerId);
}

function getRecentMpesaTransactions(minutes = 10) {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  return mpesaTransactions.filter((tx) => new Date(tx.timestamp) >= cutoff);
}

function getRecentMpesaTransactionsForTower(towerId, minutes = 10) {
  const recent = getRecentMpesaTransactions(minutes);
  return recent.filter((tx) => tx.towerId === towerId);
}

function getRecentMpesaSummaryForTower(towerId, minutes = 10) {
  const recent = getRecentMpesaTransactionsForTower(towerId, minutes);
  const total = recent.length;
  const successCount = recent.filter((tx) => tx.status === 'SUCCESS').length;
  const failedCount = total - successCount;
  const successAmount = recent
    .filter((tx) => tx.status === 'SUCCESS')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const failedAmount = recent
    .filter((tx) => tx.status === 'FAILED')
    .reduce((sum, tx) => sum + tx.amount, 0);

  return {
    total,
    successCount,
    failedCount,
    successRate: total > 0 ? Number(((successCount / total) * 100).toFixed(1)) : 100,
    successAmount: Number(successAmount.toFixed(2)),
    failedAmount: Number(failedAmount.toFixed(2))
  };
}

function setTowerAvailability(towerId, availability) {
  const tower = getTowerById(towerId);
  if (!tower) return null;
  tower.currentAvailability = Math.max(0, Math.min(100, availability));
  tower.lastUpdated = new Date().toISOString();
  return tower;
}

function upsertAgentInsight(towerId, insight) {
  const existing = agentInsights.find((item) => item.towerId === towerId);
  if (existing) {
    Object.assign(existing, insight, { updatedAt: new Date().toISOString() });
    return existing;
  }

  const record = {
    id: createId('insight'),
    towerId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...insight
  };
  agentInsights.push(record);
  return record;
}

function clearAgentInsight(towerId) {
  const index = agentInsights.findIndex((item) => item.towerId === towerId);
  if (index >= 0) {
    agentInsights.splice(index, 1);
  }
}

function getDashboardOverview() {
  const towersList = getTowers();
  const availabilitySum = towersList.reduce((sum, tower) => sum + tower.currentAvailability, 0);
  const averageAvailability = towersList.length > 0 ? availabilitySum / towersList.length : 100;
  const averageThroughput = towersList.reduce((sum, tower) => sum + tower.dataThroughputMbps, 0) / Math.max(1, towersList.length);
  const recentTransactions = getRecentMpesaTransactions(10);
  const totalTx = recentTransactions.length;
  const successCount = recentTransactions.filter((tx) => tx.status === 'SUCCESS').length;
  const activeAlarms = agentInsights.filter((insight) => insight.severity === 'CRITICAL').length;
  const totalRevenueAtRisk = agentInsights.reduce((sum, item) => sum + (item.revenueAtRisk || 0), 0);

  const totalActiveUsers = towersList.reduce((sum, tower) => sum + (tower.activeUsers || 0), 0);

  return {
    totalRevenueAtRisk: Number(totalRevenueAtRisk.toFixed(2)),
    globalNetworkAvailability: Number(averageAvailability.toFixed(1)),
    activeCriticalAlarms: activeAlarms,
    towerCount: towersList.length,
    avgDataThroughputMbps: Number(averageThroughput.toFixed(1)),
    mpesaSuccessRate: totalTx > 0 ? Number(((successCount / totalTx) * 100).toFixed(1)) : 100,
    totalActiveUsers
  };
}

function getAgentInsightForTower(towerId) {
  return agentInsights.find((item) => item.towerId === towerId) || null;
}

function getAgentInsights() {
  return agentInsights.map((item) => ({ ...item }));
}

module.exports = {
  initDataStore,
  getTowers,
  getTowerById,
  getRecentFailedTransactions,
  getRecentFailuresForTower,
  addFailedTransaction,
  addMpesaTransaction,
  getRecentMpesaTransactions,
  getRecentMpesaTransactionsForTower,
  getRecentMpesaSummaryForTower,
  setTowerAvailability,
  upsertAgentInsight,
  clearAgentInsight,
  getDashboardOverview,
  getAgentInsightForTower,
  getAgentInsights,
  getBanks
};
