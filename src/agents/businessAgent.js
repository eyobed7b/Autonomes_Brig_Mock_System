const BaseAgent = require('./baseAgent');

class BusinessAgent extends BaseAgent {
  constructor() {
    super('BusinessAgent');
  }

  async process(context) {
    const { tower, failures, mpesaSummary } = context;
    const failureCount = failures.length;
    const totalLoss = failures.reduce((sum, item) => sum + item.amount, 0);
    const revenueAtRisk = totalLoss * 1.3;
    const severity = tower.currentAvailability < 80 || mpesaSummary.failedCount > 4 || failureCount > 8
      ? 'HIGH'
      : failureCount > 3 || mpesaSummary.failedCount > 1
        ? 'MEDIUM'
        : 'LOW';

    const businessSummary = mpesaSummary.total === 0
      ? `Tower ${tower.name} has no MPESA activity in the last 10 minutes. GSM metrics are healthy with voice at ${tower.voiceSuccessRate.toFixed(1)}%, SMS at ${tower.smsSuccessRate.toFixed(1)}%, and data success at ${tower.dataSuccessRate.toFixed(1)}%.`
      : `Tower ${tower.name} processed ${mpesaSummary.total} MPESA transactions in the last 10 minutes with ${mpesaSummary.successRate}% success. ` +
        (mpesaSummary.failedCount > 0
          ? `Failed volume is $${mpesaSummary.failedAmount.toFixed(2)}, putting revenue at risk while availability sits at ${tower.currentAvailability.toFixed(1)}%.`
          : `All MPESA flows are healthy and the site is stable at ${tower.currentAvailability.toFixed(1)}% availability.`);

    return {
      revenueAtRisk: Number(revenueAtRisk.toFixed(2)),
      failureCount,
      businessSummary,
      severity
    };
  }
}

module.exports = BusinessAgent;
