const express = require('express');
const router = express.Router();
const {
  getTowers,
  getRecentFailuresForTower,
  getAgentInsightForTower,
  getRecentMpesaTransactionsForTower
} = require('../db');

router.get('/towers', (req, res) => {
  const towers = getTowers().map((tower) => {
    const failures = getRecentFailuresForTower(tower.id, 10);
    const mpesaRecent = getRecentMpesaTransactionsForTower(tower.id, 10);
    const insight = getAgentInsightForTower(tower.id);
    const mpesaSuccessCount = mpesaRecent.filter((tx) => tx.status === 'SUCCESS').length;
    const mpesaFailedCount = mpesaRecent.filter((tx) => tx.status === 'FAILED').length;
    const mpesaSuccessAmount = mpesaRecent
      .filter((tx) => tx.status === 'SUCCESS')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const mpesaFailedAmount = mpesaRecent
      .filter((tx) => tx.status === 'FAILED')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const mpesaTotal = mpesaRecent.length;

    return {
      ...tower,
      recentFailureCount: failures.length,
      recentFailedAmount: Number(failures.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)),
      mpesaTransactionCount: mpesaTotal,
      mpesaSuccessCount,
      mpesaFailedCount,
      mpesaSuccessRate: mpesaTotal > 0 ? Number(((mpesaSuccessCount / mpesaTotal) * 100).toFixed(1)) : 100,
      mpesaSuccessAmount: Number(mpesaSuccessAmount.toFixed(2)),
      mpesaFailedAmount: Number(mpesaFailedAmount.toFixed(2)),
      agentInsight: insight
    };
  });
  res.json(towers);
});

module.exports = router;
