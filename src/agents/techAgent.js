const BaseAgent = require('./baseAgent');

class TechAgent extends BaseAgent {
  constructor() {
    super('TechAgent');
  }

  async process(context) {
    const { tower, failures, mpesaSummary } = context;
    const failureCount = failures.length;
    const lowAvailability = tower.currentAvailability < 70;
    const lowGsmQuality = tower.voiceSuccessRate < 91 || tower.smsSuccessRate < 91 || tower.dataSuccessRate < 90;

    let rootCause;
    if (lowAvailability || lowGsmQuality) {
      rootCause = `GSM health alert: ${tower.name} reports voice success ${tower.voiceSuccessRate.toFixed(1)}%, SMS success ${tower.smsSuccessRate.toFixed(1)}%, and data success ${tower.dataSuccessRate.toFixed(1)}%. This suggests the MPESA failures may be tied to radio or backhaul instability.`;
    } else if (mpesaSummary.failedCount > 0) {
      rootCause = `MPESA transaction failures detected while GSM KPIs remain healthy. ${tower.name} is at ${tower.currentAvailability.toFixed(1)}% availability, so investigate G2 Core or Bank API gateway latency.`;
    } else {
      rootCause = `Tower ${tower.name} is healthy. GSM services are stable and MPESA transactions are successful. Continue standard monitoring.`;
    }

    const recommendedAction = lowAvailability || lowGsmQuality
      ? 'Inspect radio link, backhaul, and site power. Prioritize GSM KPI recovery before chasing payment gateway failures.'
      : mpesaSummary.failedCount > 0
        ? 'Review payment gateway and transaction routing logs for G2 Core and Bank API errors.'
        : 'Continue normal monitoring.';

    const severity = lowAvailability ? 'CRITICAL' : mpesaSummary.failedCount > 3 ? 'MEDIUM' : 'LOW';

    return {
      rootCause,
      recommendedAction,
      severity,
      failureCount
    };
  }
}

module.exports = TechAgent;
