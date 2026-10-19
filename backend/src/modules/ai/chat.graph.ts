import { Injectable } from '@nestjs/common';
// import { randomUUID } from 'crypto';
import { StateGraph, START, END, Annotation, MemorySaver } from '@langchain/langgraph';
import { RouterAgent } from './router.agent';
import { ActionAgent } from './action.agent';
import { AiService } from './ai.service';
import { KnowledgeService } from '../knowledge/knowledge.service';

// Tune these from your 📊 score logs
const MIN_SCORE = Number(process.env.RAG_MIN_SCORE ?? 0.65); // below this = not a real match
const SCORE_WINDOW = 0.08;                                    // keep results close to the best one
const MAX_ATTEMPTS = 2;                                       // 1 search + 1 retry

const ChatState = Annotation.Root({
  userInput: Annotation<string>(),
  language: Annotation<'en' | 'am'>(),
  decision: Annotation<'rag' | 'action' | 'unknown'>(),
  reasoning: Annotation<string>(),
  question: Annotation<string>(),      // standalone version of the user's question
  searchQuery: Annotation<string>(),   // what we actually search with
  results: Annotation<any[]>(),
  attempts: Annotation<number>(),
  response: Annotation<string>(),
  sources: Annotation<any[]>(),
  // conversation memory: last few turns, kept per session
  history: Annotation<string[]>({
    reducer: (x, y) => [...x, ...y].slice(-6),
    default: () => [],
  }),
});

type State = typeof ChatState.State;

@Injectable()
export class ChatGraph {
  private graph;

  constructor(
    private readonly routerAgent: RouterAgent,
    private readonly actionAgent: ActionAgent,
    private readonly aiService: AiService,
    private readonly knowledgeService: KnowledgeService,
  ) {
    this.graph = this.build();
  }

  // ---------- nodes ----------

  private async routerNode(s: State): Promise<Partial<State>> {
    const r = await this.routerAgent.routerNode(s as any);
    return { decision: r.decision, reasoning: r.reasoning };
  }

  private async contextualizeNode(s: State): Promise<Partial<State>> {
    // First message in a session: nothing to resolve. Follow-ups get rewritten into standalone questions.
    const question =
      s.history.length === 0
        ? s.userInput
        : await this.aiService.rewriteQuery(s.userInput, s.history, false);
    console.log(`🧭 Standalone question: "${question}"`);
    return { question, searchQuery: question, attempts: 0 };
  }

  private async retrieveNode(s: State): Promise<Partial<State>> {
    const results = await this.knowledgeService.searchKnowledgeBase(s.searchQuery, 5, 0.3);
    return { results, attempts: s.attempts + 1 };
  }

  private async rewriteNode(s: State): Promise<Partial<State>> {
    const searchQuery = await this.aiService.rewriteQuery(s.question, [], true);
    console.log(`🔁 Weak match, retrying with: "${searchQuery}"`);
    return { searchQuery };
  }

  private async generateNode(s: State): Promise<Partial<State>> {
    const top = Math.max(...s.results.map((r: any) => r.similarity));
    const good = s.results
      .filter((r: any) => r.similarity >= MIN_SCORE && r.similarity >= top - SCORE_WINDOW)
      .slice(0, 3);

    const context = good
      .map((r: any, i: number) => {
        const text = s.language === 'am' && r.chunk_text_am ? r.chunk_text_am : r.chunk_text;
        return `Fact ${i + 1}: ${text}`;
      })
      .join('\n\n');

    const response = await this.aiService.generateText(s.question, context, s.language);

    return {
      response,
      sources: good.map((r: any) => ({
        text: s.language === 'am' && r.chunk_text_am ? r.chunk_text_am : r.chunk_text,
        source: 'Tebib Database',
      })),
    };
  }

  private async noAnswerNode(s: State): Promise<Partial<State>> {
    return {
      response:
        s.language === 'am'
          ? 'ይቅርታ፣ ስለዚህ ጉዳይ በውሂብ ጎታዬ ውስጥ የተረጋገጠ መረጃ የለኝም። እባክዎ ጥያቄዎን በሌላ መንገድ ይጠይቁ ወይም በቀጥታ ከሚመለከተው መስሪያ ቤት ያረጋግጡ።'
          : "I'm sorry, I don't have verified information about that. Please try rephrasing your question, or check directly with the relevant government office.",
      sources: [],
    };
  }

  private async actionNode(s: State): Promise<Partial<State>> {
    const r = await this.actionAgent.actionNode(s as any);
    return { response: r.response, sources: [] };
  }

  private async greetingNode(s: State): Promise<Partial<State>> {
    return {
      response:
        s.language === 'am'
          ? 'ሰላም! እንኳን ደህና መጡ። ስለ ኢትዮጵያ መንግስት አገልግሎቶች ምን ልርዳዎ?'
          : 'Hello! Welcome to Tebib. How can I help you with Ethiopian government services today?',
      sources: [],
    };
  }

  private async rememberNode(s: State): Promise<Partial<State>> {
    return {
      history: [`User: ${s.userInput}`, `Assistant: ${(s.response ?? '').slice(0, 300)}`],
    };
  }

  // ---------- edges ----------

  private gradeRetrieval(s: State): 'generate' | 'rewrite' | 'noAnswer' {
    const top = s.results.length ? Math.max(...s.results.map((r: any) => r.similarity)) : 0;
    console.log(`📝 Grade: top score ${top.toFixed(3)} (need ${MIN_SCORE}), attempt ${s.attempts}/${MAX_ATTEMPTS}`);
    if (top >= MIN_SCORE) return 'generate';
    if (s.attempts < MAX_ATTEMPTS) return 'rewrite';
    return 'noAnswer';
  }

  // ---------- graph ----------

  private build() {
    return new StateGraph(ChatState)
      .addNode('router', (s) => this.routerNode(s))
      .addNode('contextualize', (s) => this.contextualizeNode(s))
      .addNode('retrieve', (s) => this.retrieveNode(s))
      .addNode('rewrite', (s) => this.rewriteNode(s))
      .addNode('generate', (s) => this.generateNode(s))
      .addNode('noAnswer', (s) => this.noAnswerNode(s))
      .addNode('action', (s) => this.actionNode(s))
      .addNode('greeting', (s) => this.greetingNode(s))
      .addNode('remember', (s) => this.rememberNode(s))
      .addEdge(START, 'router')
      .addConditionalEdges(
        'router',
        (s) => (s.decision === 'rag' ? 'contextualize' : s.decision === 'action' ? 'action' : 'greeting'),
        ['contextualize', 'action', 'greeting'],
      )
      .addEdge('contextualize', 'retrieve')
      .addConditionalEdges('retrieve', (s) => this.gradeRetrieval(s), ['generate', 'rewrite', 'noAnswer'])
      .addEdge('rewrite', 'retrieve')
      .addEdge('generate', 'remember')
      .addEdge('noAnswer', 'remember')
      .addEdge('action', 'remember')
      .addEdge('greeting', 'remember')
      .addEdge('remember', END)
      .compile(); // memory lives in RAM; resets when the server restarts
  }

  // ---------- public ----------

 async run(userInput: string, language: 'en' | 'am', history: string[] = []) {
    const out = await this.graph.invoke({
      userInput, language, history,
      decision: 'unknown', reasoning: '', question: '', searchQuery: '',
      results: [], attempts: 0, response: '', sources: [],
    });

    return {
      success: true,
      query: userInput,
      decision: out.decision,
      sourcesFound: out.sources?.length ?? 0,
      response: out.response,
      sources: out.sources ?? [],
    };
  }
}