/**
 * DIRECT DEEPSEEK JSON TEST
 * ========================
 * 
 * Test DeepSeek's JSON output capability directly to verify the correct implementation.
 */

import * as dotenv from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// Load environment variables
dotenv.config();

async function testDeepSeekJsonDirect(): Promise<void> {
  console.log('🧪 Testing DeepSeek JSON Output Directly...\n');

  try {
    // Test 1: Basic JSON output
    console.log('📝 Test 1: Basic JSON output...');
    const model = new ChatOpenAI({
      model: process.env.OPENAI_MODEL || "deepseek-chat",
      apiKey: process.env.OPENAI_API_KEY || "",
      configuration: { baseURL: process.env.OPENAI_API_URL || "https://api.openai.com/v1/" },
      temperature: 0.3,
      maxTokens: 500,
      responseFormat: { type: "json_object" },
    });

    const response = await model.invoke([
      new SystemMessage(`You are a helpful assistant. Please respond in JSON format.

Example JSON format:
{
  "name": "John",
  "age": 30,
  "city": "New York"
}`),
      new HumanMessage("Tell me about a fantasy character in JSON format.")
    ]);

    console.log('✅ Basic JSON test successful');
    console.log('Response:', response.content);
    console.log('');

  } catch (error) {
    console.error('❌ Basic JSON test failed:', error);
    throw error;
  }

  try {
    // Test 2: Without responseFormat (should work)
    console.log('📝 Test 2: Without responseFormat...');
    const model2 = new ChatOpenAI({
      model: process.env.OPENAI_MODEL || "deepseek-chat",
      apiKey: process.env.OPENAI_API_KEY || "",
      configuration: { baseURL: process.env.OPENAI_API_URL || "https://api.openai.com/v1/" },
      temperature: 0.3,
      maxTokens: 500,
    });

    const response2 = await model2.invoke([
      new SystemMessage(`You are a helpful assistant. Please respond in JSON format.

Example JSON format:
{
  "name": "John",
  "age": 30,
  "city": "New York"
}`),
      new HumanMessage("Tell me about a fantasy character in JSON format.")
    ]);

    console.log('✅ Without responseFormat test successful');
    console.log('Response:', response2.content);
    console.log('');

  } catch (error) {
    console.error('❌ Without responseFormat test failed:', error);
    throw error;
  }

  try {
    // Test 3: Check if it's a model-specific issue
    console.log('📝 Test 3: Different model...');
    const model3 = new ChatOpenAI({
      model: "deepseek-chat",
      apiKey: process.env.OPENAI_API_KEY || "",
      configuration: { baseURL: process.env.OPENAI_API_URL || "https://api.openai.com/v1/" },
      temperature: 0.3,
      maxTokens: 500,
      responseFormat: { type: "json_object" },
    });

    const response3 = await model3.invoke([
      new SystemMessage(`You are a helpful assistant. Please respond in JSON format.`),
      new HumanMessage("Create a simple JSON object with a name and age.")
    ]);

    console.log('✅ Different model test successful');
    console.log('Response:', response3.content);
    console.log('');

  } catch (error) {
    console.error('❌ Different model test failed:', error);
    console.log('This suggests DeepSeek may not support responseFormat parameter');
    console.log('');
  }

  console.log('🎉 DeepSeek JSON testing completed!');
}

// Run the test
if (require.main === module) {
  testDeepSeekJsonDirect().catch(console.error);
}

export { testDeepSeekJsonDirect };
