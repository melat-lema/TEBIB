import { Injectable } from '@nestjs/common';
import { StateGraph, END, START, Annotation } from '@langchain/langgraph';

export type Intent = 'rag' | 'action' | 'unknown';

// Characters allowed after a greeting. Written out explicitly because \W would
// also match Amharic letters and make "ሰላም ፓስፖርት ስንት ነው" look like a greeting.
const TAIL = '[\\s.!?,።፧፣]*';

const GREETING = new RegExp(
  `^(hi|hello|hey|good\\s+(morning|afternoon|evening)|thanks?|thank\\s+you|ok(ay)?|bye|goodbye|selam|ሰላም|ሰላም\\s+ነው|እንዴት\\s+ነህ|እንዴት\\s+ነሽ|እንዴት\\s+ናችሁ|አመሰግናለሁ|አመሰግናለው|ደህና\\s+ሁን|ደና\\s+ሁን)${TAIL}$`,
  'i',
);

const ACTION_EN = /\b(write|draft|compose|prepare|create|generate)\b[^.?!]{0,40}\b(letter|application|complaint|request|template|cover\s+letter)\b/i;
const ACTION_AM_NOUN = /(ደብዳቤ|ማመልከቻ|አቤቱታ)/;
const ACTION_AM_VERB = /(ጻፍ|ፃፍ|አዘጋጅ|ጻፍልኝ|ፃፍልኝ|አዘጋጅልኝ|ጻፍልኝ)/;

/**
 * Pure, instant intent classification (no network call).
 * The previous version asked an LLM on every message, which added a full model
 * round-trip (often 1-2 s) before retrieval even started. Everything that is
 * not clearly a greeting or a letter request is treated as a question, and the
 * RAG pipeline already answers "I don't have verified information" when nothing matches.
 */
export function classifyIntent(input: string): Intent {
  const text = (input ?? '').trim();
  if (!text) return 'unknown';
  if (GREETING.test(text)) return 'unknown';
  if (ACTION_EN.test(text) || (ACTION_AM_NOUN.test(text) && ACTION_AM_VERB.test(text))) return 'action';
  return 'rag';
}

const RouterState = Annotation.Root({
  userInput: Annotation<string>({ reducer: (x: string, y: string) => y ?? x, default: () => '' }),
  decision: Annotation<Intent>({ reducer: (x: Intent, y: Intent) => y ?? x, default: () => 'unknown' }),
  reasoning: Annotation<string>({ reducer: (x: string, y: string) => y ?? x, default: () => '' }),
});

@Injectable()
export class RouterAgent {
  classify(input: string): Intent {
    return classifyIntent(input);
  }

  async routerNode(state: typeof RouterState.State): Promise<Partial<typeof RouterState.State>> {
    const decision = classifyIntent(state.userInput);
    console.log(`🧭 Router: ${decision.toUpperCase()} for "${state.userInput}"`);
    return { decision, reasoning: 'Rule-based router (no LLM call)' };
  }

  // Kept so AppService.testRouter() keeps working
  compile() {
    return new StateGraph(RouterState)
      .addNode('router', this.routerNode.bind(this))
      .addEdge(START, 'router')
      .addConditionalEdges('router', (s: typeof RouterState.State) => s.decision, {
        rag: END,
        action: END,
        unknown: END,
      })
      .compile();
  }
}
