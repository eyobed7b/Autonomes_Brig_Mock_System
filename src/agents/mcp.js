class MCPMessage {
  constructor({ source, type, payload }) {
    this.id = `${source}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.source = source;
    this.type = type;
    this.payload = payload;
    this.createdAt = new Date().toISOString();
  }
}

class MCPContext {
  constructor({ tower, failures, mpesaSummary, tools }) {
    this.tower = tower;
    this.failures = failures;
    this.mpesaSummary = mpesaSummary;
    this.tools = tools || {};
    this.messages = [];
    this.sharedState = {};
  }

  broadcast(message) {
    this.messages.push(message);
  }

  getMessagesByType(type) {
    return this.messages.filter((message) => message.type === type);
  }
}

class MCPCoordinator {
  constructor() {
    this.agents = [];
  }

  registerAgent(agent) {
    this.agents.push(agent);
  }

  async dispatch(context) {
    const observations = [];
    for (const agent of this.agents) {
      const message = new MCPMessage({
        source: agent.name,
        type: 'request',
        payload: {
          tower: context.tower,
          failures: context.failures,
          mpesaSummary: context.mpesaSummary
        }
      });
      context.broadcast(message);
      const result = await agent.process(context);
      observations.push({ agent: agent.name, result });
      const response = new MCPMessage({
        source: agent.name,
        type: 'response',
        payload: result
      });
      context.broadcast(response);
    }
    return observations;
  }
}

module.exports = {
  MCPMessage,
  MCPContext,
  MCPCoordinator
};
