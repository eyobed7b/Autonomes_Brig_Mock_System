class BaseAgent {
  constructor(name) {
    this.name = name;
  }

  async process(context) {
    throw new Error(`Agent ${this.name} must implement process(context)`);
  }
}

module.exports = BaseAgent;
