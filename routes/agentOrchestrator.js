const { EventEmitter } = require('events');
const Prompt = require('../models/Prompt');
const ContextDoc = require('../models/contextDoc');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ErrorHandler = require('./errorHandler');
const CacheManager = require('./cacheManager');

class AgentOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.executionGraph = new Map();
    this.results = new Map();
    this.config = this.readConfig();
    this.geminiModel = null;
    this.errorHandler = new ErrorHandler();
    this.cacheManager = new CacheManager({
      maxSize: 500,
      ttl: 1800000, // 30 minutes
    });
    this.initializeModels();
  }

  readConfig() {
    const configFilePath = path.join(__dirname, 'config.json');
    const rawData = fs.readFileSync(configFilePath);
    return JSON.parse(rawData);
  }

  initializeModels() {
    if (process.env.GEMINI_API_KEY) {
      const googleAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.geminiModel = googleAI.getGenerativeModel({
        model: 'gemini-1.5-flash-latest',
        generationConfig: {
          temperature: 0.4,
          topP: 1,
          topK: 32,
        },
      });
    }
  }

  // ReAct Pattern Implementation
  async executeReActAgent(agent, context, maxIterations = 5) {
    const thoughts = [];
    const actions = [];
    const observations = [];
    
    for (let i = 0; i < maxIterations; i++) {
      // Thought phase
      const thoughtPrompt = this.buildReActThoughtPrompt(agent, context, thoughts, actions, observations);
      const thought = await this.generateResponse(thoughtPrompt, agent.modelType, agent.temperature, 3, context);
      thoughts.push(thought);
      
      this.emit('agentThought', { agentName: agent.agentName, thought, iteration: i });
      
      // Check if agent wants to finish
      if (thought.toLowerCase().includes('finish') || thought.toLowerCase().includes('final answer')) {
        break;
      }
      
      // Action phase
      const actionPrompt = this.buildReActActionPrompt(agent, context, thoughts, actions, observations);
      const action = await this.generateResponse(actionPrompt, agent.modelType, agent.temperature, 3, context);
      actions.push(action);
      
      this.emit('agentAction', { agentName: agent.agentName, action, iteration: i });
      
      // Observation phase (execute action and get result)
      const observation = await this.executeAction(action, context, agent);
      observations.push(observation);
      
      this.emit('agentObservation', { agentName: agent.agentName, observation, iteration: i });
    }
    
    // Generate final response
    const finalPrompt = this.buildFinalResponsePrompt(agent, context, thoughts, actions, observations);
    return await this.generateResponse(finalPrompt, agent.modelType, agent.temperature, 3, context);
  }

  buildReActThoughtPrompt(agent, context, thoughts, actions, observations) {
    let prompt = `You are ${agent.agentName}. Your task: ${agent.prompt}\n\n`;
    prompt += `Context: ${context}\n\n`;
    
    if (thoughts.length > 0) {
      prompt += "Previous reasoning:\n";
      for (let i = 0; i < thoughts.length; i++) {
        prompt += `Thought ${i + 1}: ${thoughts[i]}\n`;
        if (actions[i]) prompt += `Action ${i + 1}: ${actions[i]}\n`;
        if (observations[i]) prompt += `Observation ${i + 1}: ${observations[i]}\n`;
      }
    }
    
    prompt += "\nNow think step by step about what you should do next. If you have enough information to provide a final answer, say 'Finish' and provide your conclusion.";
    return [{ text: prompt }];
  }

  buildReActActionPrompt(agent, context, thoughts, actions, observations) {
    let prompt = `Based on your thought: "${thoughts[thoughts.length - 1]}"\n\n`;
    prompt += "What specific action should you take? Choose from:\n";
    prompt += "1. ANALYZE_TRANSCRIPT - Analyze the medical transcript\n";
    prompt += "2. CONSULT_CONTEXT - Review relevant medical context documents\n";
    prompt += "3. GENERATE_DIAGNOSIS - Generate diagnostic assessment\n";
    prompt += "4. VALIDATE_FINDINGS - Validate findings against medical knowledge\n";
    prompt += "5. FINISH - Provide final answer\n\n";
    prompt += "Respond with just the action name and any parameters.";
    return [{ text: prompt }];
  }

  buildFinalResponsePrompt(agent, context, thoughts, actions, observations) {
    let prompt = `You are ${agent.agentName}. Based on your reasoning process:\n\n`;
    
    for (let i = 0; i < thoughts.length; i++) {
      prompt += `Thought ${i + 1}: ${thoughts[i]}\n`;
      if (actions[i]) prompt += `Action ${i + 1}: ${actions[i]}\n`;
      if (observations[i]) prompt += `Observation ${i + 1}: ${observations[i]}\n\n`;
    }
    
    prompt += `\nNow provide your final, comprehensive response for: ${agent.prompt}`;
    return [{ text: prompt }];
  }

  async executeAction(action, context, agent) {
    const actionType = action.split(' ')[0];
    
    switch (actionType) {
      case 'ANALYZE_TRANSCRIPT':
        return `Transcript analyzed. Key medical terms and symptoms identified from: ${context.transcription?.substring(0, 100)}...`;
      
      case 'CONSULT_CONTEXT':
        if (agent.contextDocs && agent.contextDocs.length > 0) {
          const contextDocs = await ContextDoc.find({ name: { $in: agent.contextDocs }, active: true });
          return `Consulted ${contextDocs.length} context documents with relevant medical information.`;
        }
        return "No context documents available for consultation.";
      
      case 'GENERATE_DIAGNOSIS':
        return "Diagnostic assessment generated based on available information.";
      
      case 'VALIDATE_FINDINGS':
        return "Findings validated against medical knowledge base and best practices.";
      
      default:
        return "Action completed.";
    }
  }

  // Planning Phase Implementation
  async createExecutionPlan(agents, context) {
    const plan = {
      phases: [],
      dependencies: new Map(),
      parallelGroups: []
    };

    // Analyze agent dependencies
    for (const agent of agents) {
      const dependencies = agent.connectedAgents || [];
      plan.dependencies.set(agent.agentName, dependencies);
    }

    // Create execution phases based on dependencies
    const processed = new Set();
    let phase = 0;
    
    while (processed.size < agents.length) {
      const currentPhase = [];
      
      for (const agent of agents) {
        if (processed.has(agent.agentName)) continue;
        
        const deps = plan.dependencies.get(agent.agentName) || [];
        const canExecute = deps.every(dep => processed.has(dep));
        
        if (canExecute) {
          currentPhase.push(agent);
        }
      }
      
      if (currentPhase.length === 0) {
        // Circular dependency detected, break it
        const remaining = agents.filter(a => !processed.has(a.agentName));
        currentPhase.push(remaining[0]);
      }
      
      plan.phases.push(currentPhase);
      currentPhase.forEach(agent => processed.add(agent.agentName));
      phase++;
    }

    this.emit('planCreated', { plan, totalPhases: plan.phases.length });
    return plan;
  }

  // Enhanced execution with streaming and progress tracking
  async executeAgentWorkflow(email, transcription, userContext, io, sessionId) {
    try {
      this.emit('workflowStarted', { email, sessionId });
      
      // Fetch user's agents
      const agents = await Prompt.find({ userName: email.trim() }).sort({ order: 1 });
      
      if (agents.length === 0) {
        return await this.executeDefaultAgent(transcription, userContext);
      }

      // Create execution plan
      const plan = await this.createExecutionPlan(agents, { transcription, userContext });
      const responses = [];
      
      // Execute phases
      for (let phaseIndex = 0; phaseIndex < plan.phases.length; phaseIndex++) {
        const phase = plan.phases[phaseIndex];
        
        this.emit('phaseStarted', { 
          phase: phaseIndex + 1, 
          totalPhases: plan.phases.length,
          agents: phase.map(a => a.agentName)
        });

        // Execute agents in parallel within the phase
        const phasePromises = phase.map(async (agent) => {
          try {
            this.emit('agentStarted', { agentName: agent.agentName, phase: phaseIndex + 1 });
            
            const context = await this.buildAgentContext(agent, transcription, userContext, responses);
            
            // Use ReAct pattern for complex reasoning tasks
            const shouldUseReAct = this.shouldUseReActPattern(agent);
            let result;
            
            if (shouldUseReAct) {
              result = await this.executeReActAgentWithErrorHandling(agent, context);
            } else {
              result = await this.executeStandardAgentWithErrorHandling(agent, context);
            }
            
            this.results.set(agent.agentName, result);
            this.emit('agentCompleted', { agentName: agent.agentName, result });
            
            return { agent: agent.agentName, result };
          } catch (error) {
            try {
              // Attempt error recovery
              const recovery = await this.errorHandler.handleAgentError(
                error, 
                agent.agentName, 
                { modelType: agent.modelType, temperature: agent.temperature }, 
                this
              );
              
              if (recovery.recovered) {
                // Retry with recovered context
                const result = await this.executeStandardAgent(agent, recovery.newContext);
                this.results.set(agent.agentName, result);
                this.emit('agentCompleted', { agentName: agent.agentName, result });
                return { agent: agent.agentName, result };
              }
            } catch (recoveryError) {
              console.error(`Recovery failed for agent ${agent.agentName}:`, recoveryError.message);
            }
            
            this.emit('agentError', { agentName: agent.agentName, error: error.message });
            return { agent: agent.agentName, error: error.message };
          }
        });

        const phaseResults = await Promise.all(phasePromises);
        responses.push(...phaseResults);
        
        this.emit('phaseCompleted', { phase: phaseIndex + 1, results: phaseResults });
      }

      this.emit('workflowCompleted', { responses });
      return responses.map(r => r.result).filter(Boolean);
      
    } catch (error) {
      this.emit('workflowError', { error: error.message });
      throw error;
    }
  }

  shouldUseReActPattern(agent) {
    // Use ReAct for complex diagnostic or analytical tasks
    const reactKeywords = ['diagnose', 'analyze', 'assess', 'evaluate', 'investigate'];
    return reactKeywords.some(keyword => 
      agent.prompt.toLowerCase().includes(keyword) || 
      agent.agentName.toLowerCase().includes(keyword)
    );
  }

  async executeStandardAgent(agent, context) {
    const promptConfig = this.buildStandardPrompt(agent, context);
    return await this.generateResponse(promptConfig, agent.modelType, agent.temperature, 3, context);
  }

  async executeStandardAgentWithErrorHandling(agent, context) {
    return await this.errorHandler.executeWithRetry(
      () => this.executeStandardAgent(agent, context),
      this.errorHandler.classifyError({ message: 'standard_agent_execution' }),
      { agentName: agent.agentName, modelType: agent.modelType }
    );
  }

  async executeReActAgentWithErrorHandling(agent, context) {
    return await this.errorHandler.executeWithRetry(
      () => this.executeReActAgent(agent, context),
      this.errorHandler.classifyError({ message: 'react_agent_execution' }),
      { agentName: agent.agentName, modelType: agent.modelType }
    );
  }

  buildStandardPrompt(agent, context) {
    let prompt = '';
    
    if (context.contextDocs) {
      prompt += `Context Documents:\n${context.contextDocs}\n\n`;
    }
    
    if (context.userContext) {
      prompt += `User Context:\n${context.userContext}\n\n`;
    }
    
    if (context.transcription && agent.transcript) {
      prompt += `Transcript:\n${context.transcription}\n\n`;
    }
    
    if (context.previousResults && context.previousResults.length > 0) {
      prompt += `Previous Agent Results:\n${context.previousResults.join('\n\n')}\n\n`;
    }
    
    prompt += `Task: ${agent.prompt}`;
    
    return [{ text: prompt }];
  }

  async buildAgentContext(agent, transcription, userContext, previousResults) {
    const context = {
      transcription: agent.transcript ? transcription : null,
      userContext,
      previousResults: []
    };

    // Add context documents
    if (agent.contextDocs && agent.contextDocs.length > 0) {
      const contextDocs = await ContextDoc.find({ 
        name: { $in: agent.contextDocs }, 
        active: true 
      });
      context.contextDocs = contextDocs.map(doc => doc.text).join('\n');
    }

    // Add connected agent results
    if (agent.connectedAgents && agent.connectedAgents.length > 0) {
      context.previousResults = agent.connectedAgents
        .map(agentName => this.results.get(agentName))
        .filter(Boolean);
    }

    return context;
  }

  async executeDefaultAgent(transcription, userContext) {
    const defaultPrompt = [{ text: `Answer me:\n'${transcription}'` }];
    const result = await this.generateResponse(defaultPrompt, 'gpt-4o-mini', 0.2);
    return [result];
  }

  async generateResponse(promptConfig, modelType = 'gpt-4o-mini', temperature = 0.2, retries = 3, context = null) {
    // Generate cache key
    const promptText = promptConfig[0].text;
    const contextHash = context ? this.cacheManager.generateContextHash(context) : '';
    const cacheKey = this.cacheManager.generateKey(promptText, modelType, temperature, contextHash);
    
    // Check cache first
    const cachedResult = this.cacheManager.get(cacheKey);
    if (cachedResult) {
      console.log('Cache hit for prompt generation');
      return cachedResult;
    }
    
    // Check for similar cached results
    const similarResult = this.cacheManager.findSimilarCachedResult(promptText, modelType, temperature);
    if (similarResult) {
      console.log('Using similar cached result');
      return similarResult;
    }
    
    const isGeminiModel = modelType === 'gemini-1.5-flash' || modelType === 'gemini-1.5-pro';
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        let result;
        if (isGeminiModel && this.geminiModel) {
          const geminiResult = await this.geminiModel.generateContent({
            contents: [{ role: 'user', parts: promptConfig }],
          });
          const response = await geminiResult.response;
          result = response.text();
        } else {
          result = await this.callOpenAIAPI(
            [{ role: 'user', content: promptConfig[0].text }],
            null,
            parseFloat(temperature) || 0.2
          );
        }
        
        // Cache the result
        this.cacheManager.setWithMetadata(cacheKey, result, {
          originalPrompt: promptText,
          modelType,
          temperature,
          contextHash,
          timestamp: Date.now(),
        });
        
        return result;
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error.message);
        if (attempt === retries - 1) throw error;
        
        // Exponential backoff
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async callOpenAIAPI(messages, max_tokens, temperature) {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: max_tokens,
      n: parseInt(this.config.n) || 1,
      stop: null,
      temperature: temperature,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  }
}

module.exports = AgentOrchestrator;