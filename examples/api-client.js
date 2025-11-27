/**
 * Philosopher AI - API Client Example
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Usage: node examples/api-client.js
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3001';

class PhilosopherClient {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  async request(method, path, body = null) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const options = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${path}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Health
  async health() {
    return this.request('GET', '/api/health');
  }

  async healthDetailed() {
    return this.request('GET', '/api/v1/health');
  }

  // Auth
  async register(email, password, name) {
    const data = await this.request('POST', '/api/v1/auth/register', {
      email,
      password,
      name
    });
    this.token = data.token;
    return data;
  }

  async login(email, password) {
    const data = await this.request('POST', '/api/v1/auth/login', {
      email,
      password
    });
    this.token = data.token;
    return data;
  }

  async me() {
    return this.request('GET', '/api/v1/auth/me');
  }

  // Conversations
  async createConversation(title) {
    return this.request('POST', '/api/v1/conversations', { title });
  }

  async getConversations() {
    return this.request('GET', '/api/v1/conversations');
  }

  async getConversation(id) {
    return this.request('GET', `/api/v1/conversations/${id}`);
  }

  async addMessage(conversationId, role, content) {
    return this.request('POST', `/api/v1/conversations/${conversationId}/messages`, {
      role,
      content
    });
  }
}

// Example usage
async function main() {
  console.log('\n🧪 PHILOSOPHER AI - API CLIENT EXAMPLE\n');
  console.log('═'.repeat(50));

  const client = new PhilosopherClient();

  try {
    // Health check
    console.log('\n1. Health Check...');
    const health = await client.health();
    console.log('   Status:', health.status);

    // Register (or login if exists)
    console.log('\n2. Authentication...');
    try {
      await client.register(
        'example@test.com',
        'ExamplePassword123!',
        'Example User'
      );
      console.log('   Registered new user');
    } catch (e) {
      if (e.message === 'User already exists') {
        await client.login('example@test.com', 'ExamplePassword123!');
        console.log('   Logged in existing user');
      } else {
        throw e;
      }
    }

    // Get user info
    console.log('\n3. Get User Info...');
    const me = await client.me();
    console.log('   User:', me.user.email);

    // Create conversation
    console.log('\n4. Create Conversation...');
    const conv = await client.createConversation('API Test Conversation');
    console.log('   Created:', conv.conversation.title);

    // Add message
    console.log('\n5. Add Message...');
    await client.addMessage(conv.conversation.id, 'user', 'Hello from API client!');
    console.log('   Message added');

    // Get conversations
    console.log('\n6. Get Conversations...');
    const convs = await client.getConversations();
    console.log('   Total:', convs.conversations.length);

    console.log('\n' + '═'.repeat(50));
    console.log('\n✅ All API calls successful!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nMake sure the backend is running: npm start\n');
  }
}

// Export for use as module
module.exports = PhilosopherClient;

// Run if executed directly
if (require.main === module) {
  main();
}
