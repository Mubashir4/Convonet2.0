const fs = require('fs');
const path = require('path');

class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 1000;
    this.retryStrategies = new Map();
    this.setupRetryStrategies();
  }

  setupRetryStrategies() {
    // OpenAI API errors
    this.retryStrategies.set('OPENAI_RATE_LIMIT', {
      maxRetries: 5,
      baseDelay: 2000,
      backoffMultiplier: 2,
      jitter: true,
    });

    this.retryStrategies.set('OPENAI_TIMEOUT', {
      maxRetries: 3,
      baseDelay: 1000,
      backoffMultiplier: 1.5,
      jitter: false,
    });

    // Gemini API errors
    this.retryStrategies.set('GEMINI_QUOTA_EXCEEDED', {
      maxRetries: 3,
      baseDelay: 5000,
      backoffMultiplier: 2,
      jitter: true,
    });

    // Database errors
    this.retryStrategies.set('DATABASE_CONNECTION', {
      maxRetries: 5,
      baseDelay: 1000,
      backoffMultiplier: 2,
      jitter: true,
    });

    // Network errors
    this.retryStrategies.set('NETWORK_ERROR', {
      maxRetries: 3,
      baseDelay: 1000,
      backoffMultiplier: 1.5,
      jitter: true,
    });
  }

  async executeWithRetry(operation, errorType, context = {}) {
    const strategy = this.retryStrategies.get(errorType) || {
      maxRetries: 3,
      baseDelay: 1000,
      backoffMultiplier: 2,
      jitter: false,
    };

    let lastError;
    
    for (let attempt = 0; attempt <= strategy.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Log successful retry if it wasn't the first attempt
        if (attempt > 0) {
          this.logError({
            type: 'RETRY_SUCCESS',
            errorType,
            attempt,
            context,
            timestamp: new Date().toISOString(),
          });
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Log the error
        this.logError({
          type: 'RETRY_ATTEMPT',
          errorType,
          attempt,
          error: error.message,
          context,
          timestamp: new Date().toISOString(),
        });

        // Don't retry on the last attempt
        if (attempt === strategy.maxRetries) {
          break;
        }

        // Calculate delay with optional jitter
        let delay = strategy.baseDelay * Math.pow(strategy.backoffMultiplier, attempt);
        if (strategy.jitter) {
          delay += Math.random() * 1000;
        }

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // All retries failed
    this.logError({
      type: 'RETRY_FAILED',
      errorType,
      totalAttempts: strategy.maxRetries + 1,
      finalError: lastError.message,
      context,
      timestamp: new Date().toISOString(),
    });

    throw lastError;
  }

  classifyError(error) {
    const message = error.message.toLowerCase();
    const status = error.response?.status;

    // OpenAI specific errors
    if (message.includes('rate limit') || status === 429) {
      return 'OPENAI_RATE_LIMIT';
    }
    if (message.includes('timeout') || status === 408) {
      return 'OPENAI_TIMEOUT';
    }
    if (message.includes('openai') && (status >= 500 && status < 600)) {
      return 'OPENAI_SERVER_ERROR';
    }

    // Gemini specific errors
    if (message.includes('quota') || message.includes('exceeded')) {
      return 'GEMINI_QUOTA_EXCEEDED';
    }
    if (message.includes('gemini') && (status >= 500 && status < 600)) {
      return 'GEMINI_SERVER_ERROR';
    }

    // Database errors
    if (message.includes('mongodb') || message.includes('mongoose')) {
      return 'DATABASE_CONNECTION';
    }

    // Network errors
    if (message.includes('network') || message.includes('econnreset') || message.includes('enotfound')) {
      return 'NETWORK_ERROR';
    }

    // Default
    return 'UNKNOWN_ERROR';
  }

  async handleAgentError(error, agentName, context, orchestrator) {
    const errorType = this.classifyError(error);
    
    this.logError({
      type: 'AGENT_ERROR',
      agentName,
      errorType,
      error: error.message,
      context,
      timestamp: new Date().toISOString(),
    });

    // Emit error event
    if (orchestrator) {
      orchestrator.emit('agentError', {
        agentName,
        error: error.message,
        errorType,
        recoverable: this.isRecoverable(errorType),
      });
    }

    // Attempt recovery strategies
    if (this.isRecoverable(errorType)) {
      return await this.attemptRecovery(error, agentName, context, orchestrator);
    }

    throw error;
  }

  isRecoverable(errorType) {
    const recoverableErrors = [
      'OPENAI_RATE_LIMIT',
      'OPENAI_TIMEOUT',
      'GEMINI_QUOTA_EXCEEDED',
      'DATABASE_CONNECTION',
      'NETWORK_ERROR',
    ];
    return recoverableErrors.includes(errorType);
  }

  async attemptRecovery(error, agentName, context, orchestrator) {
    const errorType = this.classifyError(error);
    
    switch (errorType) {
      case 'OPENAI_RATE_LIMIT':
        return await this.handleRateLimitRecovery(agentName, context, orchestrator);
      
      case 'GEMINI_QUOTA_EXCEEDED':
        return await this.handleQuotaRecovery(agentName, context, orchestrator);
      
      case 'DATABASE_CONNECTION':
        return await this.handleDatabaseRecovery(agentName, context, orchestrator);
      
      default:
        throw error;
    }
  }

  async handleRateLimitRecovery(agentName, context, orchestrator) {
    if (orchestrator) {
      orchestrator.emit('agentRecovery', {
        agentName,
        recoveryType: 'RATE_LIMIT_FALLBACK',
        message: 'Switching to alternative model due to rate limits',
      });
    }

    // Switch to alternative model (e.g., from GPT-4 to GPT-3.5)
    const fallbackModel = this.getFallbackModel(context.modelType);
    context.modelType = fallbackModel;
    
    return { recovered: true, newContext: context };
  }

  async handleQuotaRecovery(agentName, context, orchestrator) {
    if (orchestrator) {
      orchestrator.emit('agentRecovery', {
        agentName,
        recoveryType: 'MODEL_SWITCH',
        message: 'Switching from Gemini to OpenAI due to quota limits',
      });
    }

    // Switch to OpenAI model
    context.modelType = 'gpt-4o-mini';
    
    return { recovered: true, newContext: context };
  }

  async handleDatabaseRecovery(agentName, context, orchestrator) {
    if (orchestrator) {
      orchestrator.emit('agentRecovery', {
        agentName,
        recoveryType: 'DATABASE_RETRY',
        message: 'Retrying database operation with exponential backoff',
      });
    }

    // Database recovery is handled by the retry mechanism
    return { recovered: false };
  }

  getFallbackModel(currentModel) {
    const fallbacks = {
      'gpt-4o': 'gpt-4o-mini',
      'gpt-4o-mini': 'gpt-3.5-turbo',
      'gemini-1.5-pro': 'gemini-1.5-flash',
      'gemini-1.5-flash': 'gpt-4o-mini',
    };
    
    return fallbacks[currentModel] || 'gpt-4o-mini';
  }

  logError(errorData) {
    this.errorLog.push(errorData);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Write to file for persistence
    this.writeErrorToFile(errorData);
    
    // Console log for development
    console.error('Error logged:', errorData);
  }

  writeErrorToFile(errorData) {
    const logDir = path.join(__dirname, '..', 'logs');
    const logFile = path.join(logDir, 'agent-errors.log');
    
    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logEntry = JSON.stringify(errorData) + '\n';
    fs.appendFileSync(logFile, logEntry);
  }

  getErrorStats() {
    const stats = {
      totalErrors: this.errorLog.length,
      errorsByType: {},
      errorsByAgent: {},
      recentErrors: this.errorLog.slice(-10),
    };

    this.errorLog.forEach(error => {
      // Count by error type
      stats.errorsByType[error.errorType] = (stats.errorsByType[error.errorType] || 0) + 1;
      
      // Count by agent
      if (error.agentName) {
        stats.errorsByAgent[error.agentName] = (stats.errorsByAgent[error.agentName] || 0) + 1;
      }
    });

    return stats;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Circuit breaker pattern for frequently failing operations
  createCircuitBreaker(operation, options = {}) {
    const {
      failureThreshold = 5,
      resetTimeout = 60000,
      monitoringPeriod = 60000,
    } = options;

    let failures = 0;
    let lastFailureTime = null;
    let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN

    return async (...args) => {
      if (state === 'OPEN') {
        if (Date.now() - lastFailureTime > resetTimeout) {
          state = 'HALF_OPEN';
        } else {
          throw new Error('Circuit breaker is OPEN');
        }
      }

      try {
        const result = await operation(...args);
        
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failures = 0;
        }
        
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = Date.now();
        
        if (failures >= failureThreshold) {
          state = 'OPEN';
        }
        
        throw error;
      }
    };
  }
}

module.exports = ErrorHandler;