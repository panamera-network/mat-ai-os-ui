export interface Domain {
  id: string
  label: string
  color: string
  skills: string[]
  topSkills: string[]
  count: number
}

const TRADING_SKILLS = [
  'Backtest Engine', 'Risk Manager', 'Order Router', 'Signal Scanner', 'Portfolio Optimizer',
  'Position Sizer', 'Trend Detector', 'Volatility Model', 'Arbitrage Finder', 'Options Pricer',
  'Liquidity Monitor', 'Slippage Estimator', 'Strategy Tuner', 'Market Scanner', 'News Sentiment',
  'Pair Trader', 'Hedge Calculator', 'Drawdown Tracker', 'Execution Optimizer', 'Trade Journal',
]

const CODING_SKILLS = [
  'Code Execution', 'Refactor Assistant', 'Test Runner', 'Linter', 'Debugger',
  'Code Reviewer', 'Dependency Auditor', 'Build Optimizer', 'API Generator', 'Type Checker',
  'Migration Helper', 'Doc Generator', 'Bug Triager', 'Performance Profiler', 'Git Assistant',
]

const RESEARCH_SKILLS = [
  'Web Search', 'Doc Summarizer', 'Citation Finder', 'Data Extractor', 'Trend Analyzer',
  'Literature Review', 'Survey Builder', 'Fact Checker', 'Knowledge Graph', 'Report Synthesizer',
  'Competitive Scan', 'Patent Search',
]

const BUSINESS_SKILLS = [
  'Invoice Generator', 'CRM Sync', 'Email Drafter', 'Report Builder', 'Forecasting',
  'Contract Reviewer', 'Pricing Model', 'Lead Scorer', 'Meeting Summarizer', 'KPI Dashboard',
  'Expense Tracker', 'Vendor Negotiator',
]

const PERSONAL_SKILLS = [
  'Calendar', 'Reminders', 'Journal', 'Health Tracker', 'Habit Coach',
  'Budget Planner', 'Travel Planner', 'Meal Planner', 'Sleep Analyzer', 'Goal Tracker',
]

export const DOMAINS: Domain[] = [
  { id: 'trading', label: 'Trading', color: '#8b5cf6', skills: TRADING_SKILLS, topSkills: TRADING_SKILLS.slice(0, 5), count: TRADING_SKILLS.length },
  { id: 'coding', label: 'Coding', color: '#14b8a6', skills: CODING_SKILLS, topSkills: CODING_SKILLS.slice(0, 5), count: CODING_SKILLS.length },
  { id: 'research', label: 'Research', color: '#f59e0b', skills: RESEARCH_SKILLS, topSkills: RESEARCH_SKILLS.slice(0, 5), count: RESEARCH_SKILLS.length },
  { id: 'business', label: 'Business', color: '#fb7185', skills: BUSINESS_SKILLS, topSkills: BUSINESS_SKILLS.slice(0, 5), count: BUSINESS_SKILLS.length },
  { id: 'personal', label: 'Personal', color: '#22c55e', skills: PERSONAL_SKILLS, topSkills: PERSONAL_SKILLS.slice(0, 5), count: PERSONAL_SKILLS.length },
]
