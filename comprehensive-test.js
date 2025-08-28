// Comprehensive test suite for the enhanced agent system
const fs = require('fs');
const path = require('path');

// Mock dependencies for testing
const mockAxios = {
  post: async (url, data, config) => {
    if (url.includes('openai')) {
      return {
        data: {
          choices: [{ message: { content: 'Mock OpenAI response' } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        }
      };
    }
    return { data: { success: true } };
  }
};

// Mock Google Generative AI
const mockGoogleAI = {
  getGenerativeModel: () => ({
    generateContent: async () => ({
      response: { text: () => 'Mock Gemini response' }
    })
  })
};

// Mock mongoose models
const mockPrompt = {
  find: async (query) => {
    if (query.userName) {
      return [
        {
          _id: 'test-id-1',
          agentName: 'TestAgent1',
          prompt: 'Analyze the medical transcript',
          modelType: 'gpt-4o-mini',
          temperature: 0.3,
          contextDocs: ['doc1'],
          connectedAgents: [],
          transcript: true,
          order: 0
        },
        {
          _id: 'test-id-2',
          agentName: 'TestAgent2',
          prompt: 'Generate diagnosis based on analysis',
          modelType: 'gemini-1.5-flash',
          temperature: 0.5,
          contextDocs: [],
          connectedAgents: ['TestAgent1'],
          transcript: false,
          order: 1
        }
      ];
    }
    return [];
  },
  countDocuments: async () => 2
};

const mockContextDoc = {
  find: async (query) => [
    { name: 'doc1', text: 'Medical context document content', active: true }
  ]
};

const mockTranscriptionHistory = {
  countDocuments: async () => 5,
  findOne: async () => ({ _id: 'old-id' }),
  findByIdAndDelete: async () => true
};

// Replace require calls with mocks
const originalRequire = require;
require = (id) => {
  if (id === 'axios') return mockAxios;
  if (id === '@google/generative-ai') return { GoogleGenerativeAI: () => mockGoogleAI };
  if (id === '../models/Prompt') return mockPrompt;
  if (id === '../models/contextDoc') return mockContextDoc;
  if (id === '../models/transcriptionHistory') return mockTranscriptionHistory;
  return originalRequire(id);
};

// Import components to test
const ErrorHandler = originalRequire('./routes/errorHandler');
const CacheManager = originalRequire('./routes/cacheManager');

async function runComprehensiveTests() {
  console.log('🧪 Running Comprehensive System Tests...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  function testResult(testName, condition, errorMsg = '') {
    if (condition) {
      console.log(`   ✅ ${testName}: PASS`);
      results.passed++;
    } else {
      console.log(`   ❌ ${testName}: FAIL ${errorMsg}`);
      results.failed++;
      results.errors.push(`${testName}: ${errorMsg}`);
    }
  }

  try {
    // Test 1: Core Components
    console.log('1. Testing Core Components...');
    
    // Cache Manager Tests
    const cache = new CacheManager({ maxSize: 100, ttl: 60000 });
    const testKey = cache.generateKey('test prompt', 'gpt-4o-mini', 0.5);
    
    cache.setWithMetadata(testKey, 'cached result', {
      originalPrompt: 'test prompt',
      modelType: 'gpt-4o-mini',
      temperature: 0.5
    });
    
    const cachedResult = cache.get(testKey);
    testResult('Cache set/get', cachedResult === 'cached result');
    
    const stats = cache.getStats();
    testResult('Cache statistics', stats.hitCount === 1 && stats.totalRequests === 1);
    
    // Test similarity matching
    const similarResult = cache.findSimilarCachedResult('test prompt similar words', 'gpt-4o-mini', 0.5, 0.4);
    testResult('Similarity matching', similarResult === 'cached result');
    
    // Error Handler Tests
    const errorHandler = new ErrorHandler();
    
    let retryCount = 0;
    const testOperation = async () => {
      retryCount++;
      if (retryCount < 3) {
        throw new Error('Temporary failure');
      }
      return 'Success after retries';
    };
    
    const retryResult = await errorHandler.executeWithRetry(testOperation, 'NETWORK_ERROR');
    testResult('Retry mechanism', retryResult === 'Success after retries');
    
    // Test error classification
    const rateLimitError = new Error('Rate limit exceeded');
    const errorType = errorHandler.classifyError(rateLimitError);
    testResult('Error classification', errorType === 'OPENAI_RATE_LIMIT');
    
    // Test 2: Agent Orchestrator (with mocks)
    console.log('\n2. Testing Agent Orchestrator...');
    
    try {
      const TestAgentOrchestrator = originalRequire('./test-orchestrator');
      const orchestrator = new TestAgentOrchestrator();
      
      testResult('Orchestrator initialization', orchestrator !== null);
      testResult('Cache manager integration', orchestrator.cacheManager !== null);
      testResult('Error handler integration', orchestrator.errorHandler !== null);
      
      // Test execution plan creation
      const mockAgents = [
        { agentName: 'Agent1', connectedAgents: [] },
        { agentName: 'Agent2', connectedAgents: ['Agent1'] },
        { agentName: 'Agent3', connectedAgents: ['Agent1'] }
      ];
      
      const plan = await orchestrator.createExecutionPlan(mockAgents, {});
      testResult('Execution plan creation', plan.phases.length > 0);
      testResult('Dependency resolution', plan.phases[0].length >= 1);
      
      // Test ReAct pattern detection
      const diagnosticAgent = { 
        agentName: 'DiagnosticAgent', 
        prompt: 'Analyze and diagnose the medical condition' 
      };
      const shouldUseReAct = orchestrator.shouldUseReActPattern(diagnosticAgent);
      testResult('ReAct pattern detection', shouldUseReAct === true);
      
    } catch (error) {
      testResult('Agent Orchestrator', false, error.message);
    }
    
    // Test 3: File Structure and Dependencies
    console.log('\n3. Testing File Structure...');
    
    const requiredFiles = [
      'routes/agentOrchestrator.js',
      'routes/errorHandler.js',
      'routes/cacheManager.js',
      'routes/diagnosticUnified.js',
      'frontend/src/components/pages/EnhancedDiagnosis.js',
      'frontend/src/components/styles/EnhancedDiagnosis.css'
    ];
    
    for (const file of requiredFiles) {
      const exists = fs.existsSync(file);
      testResult(`File exists: ${file}`, exists);
    }
    
    // Test 4: Configuration and Environment
    console.log('\n4. Testing Configuration...');
    
    const configPath = 'routes/config.json';
    const configExists = fs.existsSync(configPath);
    testResult('Config file exists', configExists);
    
    if (configExists) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        testResult('Config file valid JSON', typeof config === 'object');
      } catch (error) {
        testResult('Config file valid JSON', false, error.message);
      }
    }
    
    // Test 5: Package Dependencies
    console.log('\n5. Testing Package Dependencies...');
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['axios', 'socket.io', '@google/generative-ai', 'mongoose'];
    
    for (const dep of requiredDeps) {
      const hasDepMain = packageJson.dependencies && packageJson.dependencies[dep];
      testResult(`Backend dependency: ${dep}`, hasDepMain !== undefined);
    }
    
    const frontendPackageJson = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
    const requiredFrontendDeps = ['react', 'socket.io-client', '@mui/material', 'react-markdown'];
    
    for (const dep of requiredFrontendDeps) {
      const hasDepFrontend = frontendPackageJson.dependencies && frontendPackageJson.dependencies[dep];
      testResult(`Frontend dependency: ${dep}`, hasDepFrontend !== undefined);
    }
    
    // Test 6: API Endpoint Structure
    console.log('\n6. Testing API Structure...');
    
    try {
      const routesContent = fs.readFileSync('routes/index.js', 'utf8');
      
      const requiredEndpoints = [
        '/diagnose',
        '/transcribe',
        '/prompts',
        '/agents'
      ];
      
      for (const endpoint of requiredEndpoints) {
        const hasEndpoint = routesContent.includes(endpoint);
        testResult(`API endpoint: ${endpoint}`, hasEndpoint);
      }
      
      // Check if diagnosticUnified is properly imported
      const hasOrchestrator = routesContent.includes('diagnosticUnified');
      testResult('DiagnosticUnified integration', hasOrchestrator);
      
    } catch (error) {
      testResult('API structure check', false, error.message);
    }
    
    // Test 7: Database Schema Updates
    console.log('\n7. Testing Database Schema...');
    
    try {
      const historyModelContent = fs.readFileSync('models/transcriptionHistory.js', 'utf8');
      
      const requiredFields = ['sessionId', 'agentCount', 'executionTime'];
      for (const field of requiredFields) {
        const hasField = historyModelContent.includes(field);
        testResult(`Schema field: ${field}`, hasField);
      }
      
    } catch (error) {
      testResult('Database schema check', false, error.message);
    }
    
    // Test 8: Frontend Component Structure
    console.log('\n8. Testing Frontend Components...');
    
    try {
      const enhancedDiagnosisContent = fs.readFileSync('frontend/src/components/pages/EnhancedDiagnosis.js', 'utf8');
      
      const requiredFeatures = [
        'useState',
        'useEffect',
        'socket.io-client',
        'workflowState',
        'agentStates',
        'handleWorkflowStarted',
        'renderAgentCard'
      ];
      
      for (const feature of requiredFeatures) {
        const hasFeature = enhancedDiagnosisContent.includes(feature);
        testResult(`Frontend feature: ${feature}`, hasFeature);
      }
      
      // Check CSS file
      const cssContent = fs.readFileSync('frontend/src/components/styles/EnhancedDiagnosis.css', 'utf8');
      const hasCSSClasses = cssContent.includes('.agent-card') && cssContent.includes('.workflow-progress');
      testResult('CSS styling', hasCSSClasses);
      
    } catch (error) {
      testResult('Frontend component check', false, error.message);
    }
    
    // Cleanup
    cache.destroy();
    
  } catch (error) {
    console.error('❌ Critical test failure:', error.message);
    results.failed++;
    results.errors.push(`Critical failure: ${error.message}`);
  }
  
  // Test Results Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${results.passed}`);
  console.log(`❌ Tests Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.errors.forEach(error => console.log(`   • ${error}`));
  }
  
  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! System is ready for deployment.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review and fix the issues above.');
  }
  
  return results;
}

// Restore original require
require = originalRequire;

// Run tests
runComprehensiveTests().catch(console.error);