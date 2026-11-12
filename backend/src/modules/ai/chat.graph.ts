import { Injectable } from '@nestjs/common';
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { RouterAgent } from './router.agent';
import { ActionAgent } from './action.agent';
import { AiService } from './ai.service';
import { KnowledgeService } from '../knowledge/knowledge.service';

const MIN_SCORE = Number(process.env.RAG_MIN_SCORE ?? 0.65); // below this = not a real match
const SCORE_WINDOW = 0.08; // keep results close to the best one
const MAX_ATTEMPTS = 2; // 1 search + 1 retry

type Lang = 'en' | 'am';

export interface ChatSource {
  text: string;
  source: string;
  url: string | null;
  verifiedAt: string | null;
}

export type StreamEvent =
  | { type: 'meta'; decision: string }
  | { type: 'token'; text: string }
  | { type: 'done'; response: string; sources: ChatSource[]; decision: string };

const ChatState = Annotation.Root({
  userInput: Annotation<string>(),
  language: Annotation<Lang>(),
  decision: Annotation<'rag' | 'action' | 'unknown'>(),
  reasoning: Annotation<string>(),
  question: Annotation<string>(),
  searchQuery: Annotation<string>(),
  results: Annotation<any[]>(),
  attempts: Annotation<number>(),
  response: Annotation<string>(),
  sources: Annotation<any[]>(),
  history: Annotation<string[]>({
    reducer: (x, y) => [...x, ...y].slice(-6),
    default: () => [],
  }),
});

type State = typeof ChatState.State;

const NO_ANSWER = {
  am: 'ይቅርታ፣ ስለዚህ ጉዳይ በውሂብ ጎታዬ ውስጥ የተረጋገጠ መረጃ የለኝም። እባክዎ ጥያቄዎን በሌላ መንገድ ይጠይቁ ወይም በቀጥታ ከሚመለከተው መስሪያ ቤት ያረጋግጡ።',
  en: "I'm sorry, I don't have verified information about that. Please try rephrasing your question, or check directly with the relevant government office.",
};
const GREETING = {
  am: 'ሰላም! እንኳን ደህና መጡ። ስለ ኢትዮጵያ መንግስት አገልግሎቶች ምን ልርዳዎ?',
  en: 'Hello! Welcome to Tebib. How can I help you with Ethiopian government services today?',
};

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

  // ---------- shared helpers ----------

  /**
   * Only spend a model call on rewriting when the message depends on earlier turns
   * ("and the fee?", "what about renewing it?"). Self-contained questions skip it.
   */
  private needsRewrite(input: string, history: string[]): boolean {
    if (!history.length) return false;
    const words = input.trim().split(/\s+/).length;
    const refersBack =
      /\b(it|its|that|this|they|them|those|these|there|same|also|how about|what about)\b/i.test(input) ||
      /(እሱ|እሷ|ያ |ይህ |ስለዚያ|ስለዚህ)/.test(input);
    return words <= 6 || refersBack;
  }

  private pickGood(results: any[]) {
    const top = Math.max(...results.map((r: any) => r.similarity));
    return results.filter((r: any) => r.similarity >= MIN_SCORE && r.similarity >= top - SCORE_WINDOW).slice(0, 3);
  }

  private factText(r: any, language: Lang) {
    return language === 'am' && r.chunk_text_am ? r.chunk_text_am : r.chunk_text;
  }

  private buildContext(good: any[], language: Lang) {
    return good.map((r, i) => `Fact ${i + 1}: ${this.factText(r, language)}`).join('\n\n');
  }

  private toSources(good: any[], language: Lang): ChatSource[] {
    return good.map((r) => ({
      text: this.factText(r, language),
      source: r.source_details ? String(r.source_details).replace(/^Tebib Admin Seed \|\s*/, '') : 'Tebib Database',
      url: r.source_url ?? null,
      verifiedAt: r.last_verified_at ?? null,
    }));
  }

  // ---------- LangGraph nodes (used by run()) ----------

  private async routerNode(s: State): Promise<Partial<State>> {
    const r = await this.routerAgent.routerNode(s as any);
    return { decision: r.decision, reasoning: r.reasoning };
  }

  private async contextualizeNode(s: State): Promise<Partial<State>> {
    const question = this.needsRewrite(s.userInput, s.history)
      ? await this.aiService.rewriteQuery(s.userInput, s.history, false)
      : s.userInput;
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
    const good = this.pickGood(s.results);
    const response = await this.aiService.generateText(s.question, this.buildContext(good, s.language), s.language);
    return { response, sources: this.toSources(good, s.language) };
  }

  private async noAnswerNode(s: State): Promise<Partial<State>> {
    return { response: NO_ANSWER[s.language], sources: [] };
  }

  private async actionNode(s: State): Promise<Partial<State>> {
    const r = await this.actionAgent.actionNode(s as any);
    return { response: r.response, sources: [] };
  }

  private async greetingNode(s: State): Promise<Partial<State>> {
    return { response: GREETING[s.language], sources: [] };
  }

  private async rememberNode(s: State): Promise<Partial<State>> {
    return { history: [`User: ${s.userInput}`, `Assistant: ${(s.response ?? '').slice(0, 300)}`] };
  }

  private gradeRetrieval(s: State): 'generate' | 'rewrite' | 'noAnswer' {
    const top = s.results.length ? Math.max(...s.results.map((r: any) => r.similarity)) : 0;
    console.log(`📝 Grade: top score ${top.toFixed(3)} (need ${MIN_SCORE}), attempt ${s.attempts}/${MAX_ATTEMPTS}`);
    if (top >= MIN_SCORE) return 'generate';
    if (s.attempts < MAX_ATTEMPTS) return 'rewrite';
    return 'noAnswer';
  }

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
      .compile();
  }

  // ---------- public: non-streaming (unchanged contract) ----------

  async run(userInput: string, language: Lang, history: string[] = []) {
    const out = await this.graph.invoke({
      userInput,
      language,
      history,
      decision: 'unknown',
      reasoning: '',
      question: '',
      searchQuery: '',
      results: [],
      attempts: 0,
      response: '',
      sources: [],
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

  // ---------- public: streaming ----------
  // Same steps as the graph above (route -> contextualize -> retrieve/retry -> generate),
  // but the last step streams tokens so the user starts reading almost immediately.

  async *stream(userInput: string, language: Lang, history: string[] = []): AsyncGenerator<StreamEvent> {
    const decision = this.routerAgent.classify(userInput);
    yield { type: 'meta', decision };

    if (decision === 'unknown') {
      const text = GREETING[language];
      yield { type: 'token', text };
      yield { type: 'done', response: text, sources: [], decision };
      return;
    }

    if (decision === 'action') {
      const r = await this.actionAgent.actionNode({ userInput, language, response: '' } as any);
      const text = r.response ?? '';
      yield { type: 'token', text };
      yield { type: 'done', response: text, sources: [], decision };
      return;
    }

    // RAG
    const question = this.needsRewrite(userInput, history)
      ? await this.aiService.rewriteQuery(userInput, history, false)
      : userInput;

    let searchQuery = question;
    let results: any[] = [];
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      results = await this.knowledgeService.searchKnowledgeBase(searchQuery, 5, 0.3);
      const top = results.length ? Math.max(...results.map((r: any) => r.similarity)) : 0;
      console.log(`📝 Grade: top score ${top.toFixed(3)} (need ${MIN_SCORE}), attempt ${attempt}/${MAX_ATTEMPTS}`);
      if (top >= MIN_SCORE) break;
      results = [];
      if (attempt < MAX_ATTEMPTS) searchQuery = await this.aiService.rewriteQuery(question, [], true);
    }

    if (!results.length) {
      const text = NO_ANSWER[language];
      yield { type: 'token', text };
      yield { type: 'done', response: text, sources: [], decision };
      return;
    }

    const good = this.pickGood(results);
    let full = '';
    for await (const token of this.aiService.generateTextStream(question, this.buildContext(good, language), language)) {
      full += token;
      yield { type: 'token', text: token };
    }
    yield { type: 'done', response: full, sources: this.toSources(good, language), decision };
  }
}
