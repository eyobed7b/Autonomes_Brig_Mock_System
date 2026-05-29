const { MCPCoordinator, MCPContext } = require('./mcp');
const BusinessAgent = require('./businessAgent');
const TechAgent = require('./techAgent');
const {
  getTowers,
  getRecentFailuresForTower,
  getRecentMpesaSummaryForTower,
  upsertAgentInsight,
  clearAgentInsight
} = require('../db');

const coordinator = new MCPCoordinator();
coordinator.registerAgent(new BusinessAgent());
coordinator.registerAgent(new TechAgent());

async function evaluateTower(tower) {
  const failures = getRecentFailuresForTower(tower.id, 10);
  const mpesaSummary = getRecentMpesaSummaryForTower(tower.id, 10);
  const context = new MCPContext({
    tower,
    failures,
    mpesaSummary,
    tools: {
      computeDelta: (current, baseline) => current - baseline
    }
  });

  const observations = await coordinator.dispatch(context);
  const business = observations.find((item) => item.agent === 'BusinessAgent');
  const tech = observations.find((item) => item.agent === 'TechAgent');

  if (business && tech) {
    const insight = {
      towerId: tower.id,
      revenueAtRisk: business.result.revenueAtRisk,
      failureCount: business.result.failureCount,
      businessSummary: business.result.businessSummary,
      technicalRootCause: tech.result.rootCause,
      recommendedAction: tech.result.recommendedAction,
      severity: tech.result.severity === 'CRITICAL' ? 'CRITICAL' : business.result.severity,
      lastEvaluatedAt: new Date().toISOString(),
      mcpMessages: context.messages.map((msg) => ({
        ...msg,
        payload: msg.type === 'request' ? { ...msg.payload, tower: undefined, towerId: msg.payload.tower.id } : msg.payload
      }))
    };
    if (business.result.failureCount === 0 && tech.result.severity === 'LOW') {
      clearAgentInsight(tower.id);
      return null;
    }
    return upsertAgentInsight(tower.id, insight);
  }
  return null;
}

function runEvaluationCycle() {
  const towers = getTowers();
  towers.forEach((tower) => {
    evaluateTower(tower).catch((error) => {
      console.error(`Orchestrator failed for ${tower.id}:`, error.message);
    });
  });
}

function startOrchestrator() {
  runEvaluationCycle();
  setInterval(runEvaluationCycle, 5000);
}

module.exports = {
  startOrchestrator,
  evaluateTower
};
