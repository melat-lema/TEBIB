
import { Injectable } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { z } from 'zod';

// 1. DEFINE THE STATE
const RouterState = Annotation.Root({
  userInput: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => '',
  }),
  decision: Annotation<'rag' | 'action' | 'unknown'>({
    reducer: (x: 'rag' | 'action' | 'unknown', y: 'rag' | 'action' | 'unknown') => y ?? x,
    default: () => 'unknown',
  }),
  reasoning: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => '',
  }),
});

@Injectable()
export class RouterAgent {
  private model: ChatGoogleGenerativeAI;

  constructor() {
    this.model = new ChatGoogleGenerativeAI({
      model: 'gemini-3.5-flash',
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0,
    });
  }

  // 2. DEFINE THE NODE
  async routerNode(state: typeof RouterState.State): Promise<Partial<typeof RouterState.State>> {
    console.log(`\n🤖 Router is thinking about: "${state.userInput}"`);

    const routerSchema = z.object({
      decision: z.enum(['rag', 'action', 'unknown']).describe("Choose 'rag' for factual questions, 'action' for document creation, 'unknown' for greetings."),
      reasoning: z.string().describe("A brief explanation of why you chose this decision."),
    });

    const structuredModel = this.model.withStructuredOutput(routerSchema);

    const prompt = `
  You are the Router Agent for an Ethiopian Government Services AI assistant.
  The user may write in English or Amharic. Classify their message into exactly one category:

  - "rag": questions about government services, such as fees, requirements, documents needed,
    office locations, processing time, or how to apply (passport, Kebele ID, business license,
    driving license, birth certificate, etc.).
  - "action": requests to write, draft, or create a document or letter
    (for example an application letter or a complaint letter).
  - "unknown": greetings, thanks, small talk, or anything unrelated to government services.

  User Input: "${state.userInput}"
`;

    try {
      // Try the real AI model
      const result = await structuredModel.invoke(prompt);
      console.log(`✅ Router Decision: ${result.decision.toUpperCase()} (Reason: ${result.reasoning})`);
      return { decision: result.decision, reasoning: result.reasoning };
      
    }catch (error) {
  console.error('❌ Router error:', error);
  console.warn('⚠️ LangChain Router API failed. Using MOCK keyword routing to keep development moving.');
      
      // 🚀 DEVELOPMENT MOCK FALLBACK: Simple, reliable keyword matching
      const lowerInput = state.userInput.toLowerCase();
      let mockDecision: 'rag' | 'action' | 'unknown' = 'unknown';
      let mockReasoning = 'Mock fallback due to API error';

      if (lowerInput.includes('write') || lowerInput.includes('draft') || lowerInput.includes('letter') || lowerInput.includes('create') || lowerInput.includes('ስጠኝ') || lowerInput.includes('ጻፍ')) {
        mockDecision = 'action';
        mockReasoning = 'Mock: Detected document creation request.';
      } else if (lowerInput.includes('how much') || lowerInput.includes('requirement') || lowerInput.includes('passport') || lowerInput.includes('fee') || lowerInput.includes('license') || lowerInput.includes('ስንት') || lowerInput.includes('መስፈርት')) {
        mockDecision = 'rag';
        mockReasoning = 'Mock: Detected factual question about services.';
      } else if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('thank') || lowerInput.includes('ሰላም')) {
        mockDecision = 'unknown';
        mockReasoning = 'Mock: Detected greeting or casual chat.';
      }

      console.log(`✅ Mock Router Decision: ${mockDecision.toUpperCase()} (${mockReasoning})`);
      return { decision: mockDecision, reasoning: mockReasoning };
    }
  }

  // 3. DEFINE THE GRAPH
  compile() {
    const workflow = new StateGraph(RouterState)
      .addNode('router', this.routerNode.bind(this))
      .addEdge(START, 'router')
      .addConditionalEdges(
        'router',
        (state: typeof RouterState.State) => state.decision,
        {
          rag: END,
          action: END,
          unknown: END,
        }
      );

    return workflow.compile();
  }
}