import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, CheckCircle2, CircleDashed, Award, Sparkles, 
  HelpCircle, ShieldCheck, AlertTriangle, HelpCircle as QIcon,
  Briefcase, ArrowRight, Info, Check, ToggleLeft, ToggleRight,
  TrendingUp, Activity, FileText, Ban, Sparkle, Clock
} from 'lucide-react';
import { cn, readStoredStringArray, safeLocalStorage } from '../lib/utils';
import { BUDGET_QUESTIONS_BANK, BudgetQuestion } from '../data/budgetQuestions';
import { Send, Bot, User as UserIcon, Crown, Map as MapIcon, Coins, Lock } from 'lucide-react';

interface QuestDashboardProps {
  isCalculatorCompleted: boolean;
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  completedActivities: string[];
  setCompletedActivities: React.Dispatch<React.SetStateAction<string[]>>;
  totalXp: number;
  setTotalXp: React.Dispatch<React.SetStateAction<number>>;
}

// 1. DATASET FOR SUB-TAB "ВИКТОРИНЫ"
interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface Quiz {
  id: string;
  title: string;
  reward: number;
  topic: string;
  difficulty: "Легкий" | "Средний" | "Сложный";
  questions: QuizQuestion[];
}

const CORE_ACTIVITY_IDS = [
  'quiz-1', 'quiz-2', 'quiz-3', 'quiz-4', 'quiz-5',
  'game-1', 'game-2', 'game-3', 'game-4', 'game-5',
  'special-1', 'special-2', 'special-3',
];

const getMoscowDateKey = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date());

const quizzesData: Quiz[] = [
  {
    id: "quiz-1",
    title: "Доходы бюджета Москвы",
    reward: 100,
    topic: "Ключевые параметры бюджета Москвы на 2026 год",
    difficulty: "Легкий",
    questions: [
      {
        question: "Какой объём доходов предусмотрен бюджетом Москвы на 2026 год?",
        options: ["Около 5,94 трлн ₽", "Около 3,2 трлн ₽", "Около 447,6 млрд ₽"],
        correct: 0,
        explanation: "План доходов — 5 937,4 млрд ₽ по Закону города Москвы № 39 от 01.11.2025."
      },
      {
        question: "Какой объём расходов предусмотрен бюджетом Москвы на 2026 год?",
        options: ["Около 6,39 трлн ₽", "Около 810 млрд ₽", "Около 5,94 млрд ₽"],
        correct: 0,
        explanation: "План расходов — 6 385,0 млрд ₽."
      },
      {
        question: "Каков плановый дефицит бюджета Москвы на 2026 год?",
        options: ["447,6 млрд ₽", "44,8 млрд ₽", "1,29 трлн ₽"],
        correct: 0,
        explanation: "Плановый дефицит составляет 447,6 млрд ₽ — разницу между расходами и доходами."
      }
    ]
  },
  {
    id: "quiz-2",
    title: "Расходы на промышленность и субсидии",
    reward: 120,
    topic: "ГРБС, Фонды развития и промышленное импортозамещение",
    difficulty: "Средний",
    questions: [
      {
        question: "Какая ключевая цель предоставления субсидий промышленным организациям из бюджета Москвы?",
        options: ["Возмещение затрат на покупку оборудования и импортозамещение", "Оплата рекламных кампаний за рубежом", "Покрытие штрафов предприятий"],
        correct: 0,
        explanation: "Субсидии Москвы направлены на модернизацию производств, компенсацию процентов по кредитам на оборудование и развитие инжиниринга."
      },
      {
        question: "Что такое ГРБС в контексте распределения промышленных субсидий?",
        options: ["Государственный реестр банковских счетов", "Главный распорядитель бюджетных средств", "Городской совет по бюджетным спорам"],
        correct: 1,
        explanation: "ГРБС (например, Департамент инвестиционной и промышленной политики) распределяет лимиты бюджетных обязательств до конечных получателей."
      },
      {
        question: "В какой форме чаще всего предоставляется финансовая поддержка ИТ-промышленности Москвы?",
        options: ["Прямой выкуп акций", "Гранты Мэра и льготные займы под пониженный % через Фонд развития промышленности", "Выдача наличных денег"],
        correct: 1,
        explanation: "Московский Фонд развития промышленности предоставляет целевые займы по ставкам значительно ниже банковских."
      }
    ]
  },
  {
    id: "quiz-3",
    title: "Налоговые вычеты и НДФЛ 2026",
    reward: 100,
    topic: "Индексация социальных вычетов, лимиты и правила возврата",
    difficulty: "Сложный",
    questions: [
      {
        question: "Каков совокупный лимит для социальных налоговых вычетов (обучение, спорт, медицина) введен в действие?",
        options: ["120 000 рублей", "150 000 рублей", "250 000 рублей"],
        correct: 1,
        explanation: "В рамках обновленного законодательства лимит увеличен со 120 тыс. до 150 тыс. рублей."
      },
      {
        question: "Какую максимальную сумму чистыми можно вернуть за год за свое обучение при ставке НДФЛ 13%?",
        options: ["15 600 рублей", "19 500 рублей", "50 000 рублей"],
        correct: 1,
        explanation: "13% от максимального лимита в 150 000 рублей составляет ровно 19 500 рублей."
      },
      {
        question: "В течение какого срока после окончания года можно подать декларацию 3-НДФЛ на вычет?",
        options: ["В течение 6 месяцев", "В течение 3 лет", "Только до 30 апреля следующего года"],
        correct: 1,
        explanation: "Налогоплательщик имеет право вернуть излишне уплаченный налог в течение 3 лет с момента понесенных расходов."
      }
    ]
  },
  {
    id: "quiz-4",
    title: "Государственные программы Москвы",
    reward: 110,
    topic: "Расходование бюджета, транспорт, здравоохранение и образование",
    difficulty: "Средний",
    questions: [
      {
        question: "Какая программа занимает лидирующие позиции по объему финансирования в бюджете Москвы?",
        options: ["Развитие транспортной системы", "Развитие культурно-туристической среды", "Стимулирование экономической активности"],
        correct: 0,
        explanation: "Транспортная система (метро, дороги, МЦД) традиционно является одной из самых капиталоемких госпрограмм столицы."
      },
      {
        question: "На основе какого документа формируется программный бюджет города Москвы?",
        options: ["На основе устных поручений", "На основе 3-летнего Закона о бюджете города Москвы", "На основе годовых отчетов коммерческих банков"],
        correct: 1,
        explanation: "Бюджет Москвы утверждается Московской городской Думой на очередной финансовый год и плановый период."
      },
      {
        question: "Какой объём предусмотрен на развитие здравоохранения Москвы в 2026 году?",
        options: ["615 млрд ₽", "173,3 млрд ₽", "96,7 млрд ₽"],
        correct: 0,
        explanation: "На развитие здравоохранения предусмотрено 615 млрд ₽ без учёта оплаты медицинской помощи из Фонда ОМС."
      }
    ]
  },
  {
    id: "quiz-5",
    title: "Открытые данные и бюджетный процесс",
    reward: 100,
    topic: "Официальные источники и период бюджетного планирования",
    difficulty: "Легкий",
    questions: [
      {
        question: "Какой документ устанавливает ключевые параметры бюджета Москвы на 2026 год?",
        options: ["Закон города Москвы № 39 от 01.11.2025", "Письмо ФНС", "Решение коммерческого банка"],
        correct: 0,
        explanation: "Доходы, расходы и дефицит установлены Законом города Москвы № 39 от 1 ноября 2025 года."
      },
      {
        question: "Где опубликованы интерактивные данные о бюджете Москвы?",
        options: ["budget.mos.ru", "nalog.gov.ru", "cbr.ru"],
        correct: 0,
        explanation: "Официальный городской источник — портал «Открытый бюджет Москвы» budget.mos.ru."
      },
      {
        question: "На какой период принят Закон города Москвы № 39?",
        options: ["Только на 2026 год", "На 2026 год и плановый период 2027–2028 годов", "До 2030 года"],
        correct: 1,
        explanation: "Закон устанавливает бюджет на 2026 год и плановые показатели на 2027 и 2028 годы."
      }
    ]
  }
];

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  quiz?: Quiz;
  timestamp: string;
}

const getReferenceResponse = (query: string, generateDailyQuiz: () => Quiz): { text: string; quiz?: Quiz } => {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Checking for quiz requests
  if (
    normalizedQuery.includes('викторин') || 
    normalizedQuery.includes('квиз') || 
    normalizedQuery.includes('тест') || 
    normalizedQuery.includes('игра') || 
    normalizedQuery.includes('вопрос') || 
    normalizedQuery.includes('задан') || 
    normalizedQuery.includes('вызов') ||
    normalizedQuery.includes('quiz')
  ) {
    const quiz = generateDailyQuiz();
    return {
      text: `Готов квиз **"${quiz.title}"**: три вопроса из проверенного банка. За прохождение можно получить до **${quiz.reward} учебных баллов**. Нажмите **«Принять вызов»**, чтобы начать.`,
      quiz
    };
  }
  
  if (normalizedQuery.includes('доход') || normalizedQuery.includes('налог') || normalizedQuery.includes('ндфл') || normalizedQuery.includes('прибыль') || normalizedQuery.includes('сбор') || normalizedQuery.includes('вычет')) {
    return {
      text: `На 2026 год доходы Москвы запланированы в размере **5 937,4 млрд ₽**, расходы — **6 385,0 млрд ₽**, дефицит — **447,6 млрд ₽**. Общий лимит расходов для большинства социальных вычетов составляет **150 000 ₽**, а на обучение ребёнка — **110 000 ₽** на обоих родителей. Фактический возврат зависит от уплаченного НДФЛ. Источники: Закон Москвы № 39 и ФНС России.`
    };
  }
  
  if (normalizedQuery.includes('транспорт') || normalizedQuery.includes('метро') || normalizedQuery.includes('электробус') || normalizedQuery.includes('дорог') || normalizedQuery.includes('мцд') || normalizedQuery.includes('бкл')) {
    return {
      text: `Развитие транспортной системы — одно из крупнейших направлений расходов Москвы. В учебной диаграмме оно показано округлённой долей около **20%**. Точные актуальные статьи и исполнение проверяйте на **budget.mos.ru**.`
    };
  }
  
  if (normalizedQuery.includes('социал') || normalizedQuery.includes('пенси') || normalizedQuery.includes('льгот') || normalizedQuery.includes('выплат') || normalizedQuery.includes('семь') || normalizedQuery.includes('поддержк')) {
    return {
      text: `На социальную сферу Москвы в 2026 году предусмотрено около **3,2 трлн ₽**, то есть примерно половина расходов. Внутри этого объёма программа социальной поддержки жителей составляет **810 млрд ₽**. Источник: портал «Открытый бюджет Москвы».`
    };
  }
  
  if (normalizedQuery.includes('школ') || normalizedQuery.includes('колледж') || normalizedQuery.includes('детск') || normalizedQuery.includes('образован') || normalizedQuery.includes('мэш')) {
    return {
      text: `На развитие образования Москвы в 2026 году предусмотрено **814,6 млрд ₽**. Это около 12,8% всех плановых расходов. Детализацию программы смотрите на **budget.mos.ru**.`
    };
  }
  
  if (normalizedQuery.includes('больниц') || normalizedQuery.includes('клиник') || normalizedQuery.includes('врач') || normalizedQuery.includes('здоров') || normalizedQuery.includes('медицин') || normalizedQuery.includes('емиас') || normalizedQuery.includes('лекарств')) {
    return {
      text: `На развитие здравоохранения Москвы в 2026 году предусмотрено **615 млрд ₽** без учёта оплаты медицинской помощи из Фонда ОМС. Детализацию программы и исполнение следует проверять на **budget.mos.ru**.`
    };
  }
  
  if (normalizedQuery.includes('промышлен') || normalizedQuery.includes('инвест') || normalizedQuery.includes('завод') || normalizedQuery.includes('технополис') || normalizedQuery.includes('субсид') || normalizedQuery.includes('бизнес')) {
    return {
      text: `В плане на 2026 год на программу **«Экономическое развитие и инвестиционная привлекательность»** предусмотрено **226,5 млрд ₽**, а на развитие цифровой среды и инноваций — **243,1 млрд ₽**. Условия конкретных льгот нужно проверять на официальных страницах соответствующих программ.`
    };
  }

  if (normalizedQuery.includes('эколог') || normalizedQuery.includes('парк') || normalizedQuery.includes('озелен') || normalizedQuery.includes('дерев') || normalizedQuery.includes('воздух') || normalizedQuery.includes('река')) {
    return {
      text: `На программу **«Развитие городской среды»** в 2026 году предусмотрено **263,2 млрд ₽**. В справочнике приводится только верхнеуровневая сумма; состав мероприятий смотрите в официальной программе.`
    };
  }

  if (normalizedQuery.includes('спорт') || normalizedQuery.includes('лужники') || normalizedQuery.includes('площадк') || normalizedQuery.includes('тренир') || normalizedQuery.includes('арен')) {
    return {
      text: `На программу **«Спорт Москвы»** в 2026 году предусмотрено **173,3 млрд ₽**. Это плановый объём из официального обзора бюджета.`
    };
  }

  return {
    text: `Это локальный интерактивный справочник, а не официальный консультант и не генеративный ИИ. Я могу показать проверенные верхнеуровневые показатели по темам **доходы**, **социальная сфера**, **образование**, **здравоохранение**, **городская среда** и **спорт**. Для первичных данных используйте **budget.mos.ru**, а для налоговых вычетов — **nalog.gov.ru**.`
  };
};


interface MayorDistrict {
  id: string;
  name: string;
  coatOfArms: string;
  description: string;
  budget: number; // in Millions of rubles
  primaryDemand: string;
  preferenceMultiplier: {
    education: number;
    transport: number;
    healthcare: number;
  };
  mainProject: string;
  colorClass: string;
  revenueFromNdfMln: number;
  unemploymentRate: string;
}

const MAYOR_DISTRICTS: MayorDistrict[] = [
  {
    id: 'hamovniki',
    name: 'Хамовники',
    coatOfArms: '🏰',
    description: 'Престижный исторический район Москвы с высокой плотностью университетов (МПГУ, Сеченовка) и культурных объектов. Требует высочайшего качества школьного образования и бережной интеграции спортплощадок.',
    budget: 150,
    primaryDemand: 'Модернизация школ и ИТ-классов',
    preferenceMultiplier: { education: 1.6, transport: 0.8, healthcare: 1.1 },
    mainProject: 'Капремонт лицейских корпусов',
    colorClass: '#FF4D4D',
    revenueFromNdfMln: 850,
    unemploymentRate: '0.12%'
  },
  {
    id: 'sokolniki',
    name: 'Сокольники',
    coatOfArms: '🌲',
    description: 'Главные «зелёные легкие» Восточного округа Москвы. Сердцем района является легендарный парк Сокольники. Население ждет расширения спортивных зон для воркаута и экологического мониторинга.',
    budget: 100,
    primaryDemand: 'Экологический контроль и уличный спорт',
    preferenceMultiplier: { education: 0.9, transport: 0.9, healthcare: 1.7 },
    mainProject: 'Эко-велокольцо и спортивный кластер',
    colorClass: '#33CC33',
    revenueFromNdfMln: 420,
    unemploymentRate: '0.18%'
  },
  {
    id: 'tverskoy',
    name: 'Тверской',
    coatOfArms: '🔔',
    description: 'Самое сердце столицы. Главный узел наземного и подземного общественного транспорта. Огромный ежедневный туристический и деловой поток требует беспрецедентного финансирования инфраструктуры.',
    budget: 200,
    primaryDemand: 'Электробусы и умные остановки',
    preferenceMultiplier: { education: 0.7, transport: 1.8, healthcare: 1.0 },
    mainProject: 'Транспортная хорда и эко-электробусы',
    colorClass: '#FFCC00',
    revenueFromNdfMln: 1450,
    unemploymentRate: '0.08%'
  },
  {
    id: 'krylatskoe',
    name: 'Крылатское',
    coatOfArms: '🚴',
    description: 'Живописный и экологичный район на западе Москвы, известный велодорогой, олимпийскими спортобъектами и холмами. Жители ценят здоровый образ жизни и чистоту.',
    budget: 80,
    primaryDemand: 'Горнолыжный спуск и велополоса',
    preferenceMultiplier: { education: 1.1, transport: 0.7, healthcare: 1.6 },
    mainProject: 'Реновация олимпийского велотрека',
    colorClass: '#3399FF',
    revenueFromNdfMln: 480,
    unemploymentRate: '0.15%'
  },
  {
    id: 'vyhino',
    name: 'Выхино-Жулебино',
    coatOfArms: '🚉',
    description: 'Один из наиболее населенных спальных районов Москвы на юго-востоке. Важнейшая транспортная артерия «Выхино» испытывает пиковые логистические нагрузки спального квартала.',
    budget: 120,
    primaryDemand: 'Развязка ТПУ и школы в новых кварталах',
    preferenceMultiplier: { education: 1.2, transport: 1.5, healthcare: 0.9 },
    mainProject: 'Развитие мультимодального ТПУ',
    colorClass: '#9933FF',
    revenueFromNdfMln: 590,
    unemploymentRate: '0.22%'
  }
];


export default function QuestDashboard({ 
  isCalculatorCompleted, 
  balance, 
  setBalance,
  completedActivities,
  setCompletedActivities,
  totalXp,
  setTotalXp
}: QuestDashboardProps) {
  // Navigation Tabs: quizzes, minigames, specials, mayor, map
  const [activeTab, setActiveTab] = useState<'quizzes' | 'minigames' | 'specials' | 'mayor' | 'map'>('quizzes');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // NFT collectibles district cards state
  const [unlockedNfts, setUnlockedNfts] = useState<string[]>(() => {
    return readStoredStringArray('mos_unlocked_nfts_v3');
  });

  useEffect(() => {
    safeLocalStorage.setItem('mos_unlocked_nfts_v3', JSON.stringify(unlockedNfts));
  }, [unlockedNfts]);

  // Virtual Mayor specific Simulation States
  const [selectedMayorDistrict, setSelectedMayorDistrict] = useState<string>('hamovniki');
  const [mayorEducation, setMayorEducation] = useState<number>(40);
  const [mayorTransport, setMayorTransport] = useState<number>(40);
  const [mayorHealthcare, setMayorHealthcare] = useState<number>(40);
  const [simulationReport, setSimulationReport] = useState<{
    residentComfort: number;
    economicEfficiency: number;
    budgetDeficit: number;
    deficitMln: number;
    status: 'perfect' | 'warning' | 'deficit_danger';
    summaryMsg: string;
    unlockedNft?: string;
  } | null>(null);

  // Map state
  const [selectedMapDistrictId, setSelectedMapDistrictId] = useState<string>('hamovniki');

  // General Toast Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; pts: number } | null>(null);
  
  const showToast = (text: string, pts: number) => {
    setToastMessage({ text, pts });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleCompleteActivity = (id: string, pts: number, text: string) => {
    if (!completedActivities.includes(id)) {
      setCompletedActivities(prev => [...prev, id]);
      setBalance(prev => prev + pts);
      showToast(text, pts);
    }
  };

  // --- QUIZ GAME ENGINE STATE ---
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setScore(0);
  };

  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null) return; // limit to single click
    setSelectedOption(idx);
    if (idx === activeQuiz?.questions[currentQuestionIndex].correct) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (!activeQuiz) return;
    if (currentQuestionIndex + 1 < activeQuiz.questions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
    } else {
      // Completed Quiz
      const winPct = (score / activeQuiz.questions.length) * 100;
      let finalPts = activeQuiz.reward;
      
      // Calculate adjusted points
      if (winPct < 60) {
        finalPts = Math.round(activeQuiz.reward * 0.5);
      }
      
      handleCompleteActivity(
        activeQuiz.id, 
        finalPts, 
        `Викторина "${activeQuiz.title}" пройдена! Результат: ${score}/${activeQuiz.questions.length}`
      );
      setActiveQuiz(null);
    }
  };


  // --- DYNAMIC GAMES ENGINE STATE ---
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  /* Game 1: Балансировщик бюджета
     Need to require Social >= 50%
  */
  const [game1Industry, setGame1Industry] = useState<number>(15);
  const [game1Social, setGame1Social] = useState<number>(50);
  const [game1Transport, setGame1Transport] = useState<number>(35);
  const game1Total = game1Industry + game1Social + game1Transport;

  // Game 2: Финансовый Аудитор
  const [game2SelectedCard, setGame2SelectedCard] = useState<number | null>(null);

  // Game 3: Инвест-Стратег
  const [game3InvestResult, setGame3InvestResult] = useState<string | null>(null);
  const [game3InnovationValue, setGame3InnovationValue] = useState<number>(0);

  // Game 4: Вычет-Клик
  const [game4List, setGame4List] = useState<number[]>([]);
  const game4RawSum = game4List.reduce((acc, val) => acc + val, 0);
  const game4ClampedSum = Math.min(game4RawSum, 150000);
  const game4Refund = Math.round(game4ClampedSum * 0.13);

  // Game 5: Вектор Развития
  const [game5Toggle1, setGame5Toggle1] = useState<boolean>(false);
  const [game5Toggle2, setGame5Toggle2] = useState<boolean>(false);
  const [game5Toggle3, setGame5Toggle3] = useState<boolean>(false);


  // Reset Game States
  const resetGameStates = () => {
    setActiveGameId(null);
    // G1
    setGame1Industry(15);
    setGame1Social(50);
    setGame1Transport(35);
    // G2
    setGame2SelectedCard(null);
    // G3
    game3InvestResult && setGame3InvestResult(null);
    setGame3InnovationValue(0);
    // G4
    setGame4List([]);
    // G5
    setGame5Toggle1(false);
    setGame5Toggle2(false);
    setGame5Toggle3(false);
    // Spec
    setSpec2DeductionInput(85000);
    setSpec3CheckedSectors([]);
    setActiveSpec3SubTab('health');
    setShowSpec3Task(false);
    setSpec3QuestionAnswer(null);
    
    // Mayor
    setMayorEducation(40);
    setMayorTransport(40);
    setMayorHealthcare(40);
    setSimulationReport(null);
  };


  // --- SPECIAL PROJECTS STATE ---
  // Special 2: Fiscal learning scenario
  const [spec2DeductionInput, setSpec2DeductionInput] = useState<number>(85000);
  // Special 3: Аналитический серфинг
  const [spec3CheckedSectors, setSpec3CheckedSectors] = useState<string[]>([]);
  const [activeSpec3SubTab, setActiveSpec3SubTab] = useState<'health' | 'transport' | 'education'>('health');
  const [showSpec3Task, setShowSpec3Task] = useState<boolean>(false);
  const [spec3QuestionAnswer, setSpec3QuestionAnswer] = useState<string | null>(null);

  // --- LOCAL BUDGET REFERENCE CHAT STATES & HANDLERS ---
  const [inputMessage, setInputMessage] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const saved = safeLocalStorage.getItem('mos_ai_chat_history');
    if (saved) {
      try {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(message =>
          typeof message === 'object' && message !== null &&
          typeof message.id === 'string' &&
          (message.sender === 'ai' || message.sender === 'user') &&
          typeof message.text === 'string' &&
          typeof message.timestamp === 'string'
        )) {
          return parsed as ChatMessage[];
        }
      } catch (e) {
        // Fallback below
      }
    }
    return [
      {
        id: 'welcome',
        sender: 'ai',
        text: "Привет! Это интерактивный справочник конкурсного прототипа. Он отвечает по заранее подготовленным темам и не является официальным консультантом. Напишите **«викторина»**, чтобы запустить учебный квиз дня.",
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [isTyping, setIsTyping] = useState<boolean>(false);

  useEffect(() => {
    safeLocalStorage.setItem('mos_ai_chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  const generateDailyQuiz = (): Quiz => {
    const selected: BudgetQuestion[] = [];
    const bank = [...BUDGET_QUESTIONS_BANK];
    // select 3 unique questions if available
    for (let i = 0; i < 3 && bank.length > 0; i++) {
      const idx = Math.floor(Math.random() * bank.length);
      selected.push(bank[idx]);
      bank.splice(idx, 1);
    }
    return {
      id: `daily-quiz-${getMoscowDateKey()}`,
      title: "Интерактивный квиз дня",
      reward: 150,
      topic: "Случайная подборка из проверенного банка вопросов",
      difficulty: "Средний",
      questions: selected.map(q => ({
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation
      }))
    };
  };

  const startRandomQuiz = () => {
    const selected: BudgetQuestion[] = [];
    const bank = [...BUDGET_QUESTIONS_BANK];
    for (let i = 0; i < 3 && bank.length > 0; i++) {
      const idx = Math.floor(Math.random() * bank.length);
      selected.push(bank[idx]);
      bank.splice(idx, 1);
    }
    const randomQuiz: Quiz = {
      id: `daily-quiz-${getMoscowDateKey()}`,
      title: "Финансовый Экспресс-Квиз дня",
      reward: 150,
      topic: "Подборка из проверенного банка вопросов о бюджете Москвы 2026",
      difficulty: "Средний",
      questions: selected.map(q => ({
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation
      }))
    };
    startQuiz(randomQuiz);
  };

  const submitDashboardQuery = (queryText: string) => {
    if (!queryText.trim()) return;

    const normalized = queryText.toLowerCase().trim();
    if (normalized.includes('экскурсия') || normalized.includes('обучение') || normalized.includes('гид') || normalized.includes('тур')) {
      window.dispatchEvent(new CustomEvent('start_mos_onboarding'));
      return;
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const aiResponse = getReferenceResponse(queryText, generateDailyQuiz);
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: aiResponse.text,
        quiz: aiResponse.quiz,
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1100);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    submitDashboardQuery(inputMessage);
    setInputMessage('');
  };

  const coreCompletedCount = CORE_ACTIVITY_IDS.filter(id => completedActivities.includes(id)).length;

  return (
    <div className="bg-[#0F172A] text-[#F8FAFC] rounded-2xl p-4 sm:p-8 border border-[rgba(148,163,184,0.1)] shadow-xs transition-all duration-300 flex flex-col flex-1 h-auto md:h-full select-none" id="mos_game_center">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed bottom-24 right-4 sm:right-8 bg-[#27354f] text-[#f8fafc] p-4 rounded-xl border border-[rgba(255,255,255,0.08)] shadow-[0_12px_40px_rgba(0,0,0,0.4)] z-50 flex items-center gap-4 max-w-sm"
          >
            <div className={cn(
              "text-[#f8fafc] w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold shrink-0",
              toastMessage.pts === 0 ? "bg-[#f59e0b]" : "bg-[#10b981]"
            )}>
              {toastMessage.pts === 0 ? "⚠️" : "🎖️"}
            </div>
            <div className="flex-1">
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#94a3b8] block leading-none mb-1">
                {toastMessage.pts === 0 ? "Оповещение" : "Достижение получено"}
              </span>
              <p className="text-xs font-bold leading-tight">{toastMessage.text}</p>
            </div>
            {toastMessage.pts > 0 && (
              <div className="bg-[#10b981] px-2 py-1 rounded text-[11px] font-mono font-bold shrink-0">+{toastMessage.pts} баллов</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container Header with Title & Tabs */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[rgba(148,163,184,0.1)] pb-5 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-[#27354f] text-[#f59e0b] p-3 rounded-2xl border border-[rgba(255,255,255,0.08)]">
            <Target size={24} className="stroke-[2.5px]" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-[#10b981] uppercase tracking-widest block mb-0.5">Игровой Центр Развития</span>
            <h2 className="text-24px font-bold text-[#f8fafc] tracking-tight">МосГорБюджет.Трек</h2>
          </div>
        </div>

        {/* Sub-Navigation Tabs - Configured to wrap elegantly for 100% visibility on all screens */}

        <div className="flex overflow-x-auto no-scrollbar p-1 bg-[#1e293b] border border-[rgba(148,163,184,0.1)] rounded-xl gap-1 relative scroll-smooth snap-x snap-mandatory flex-nowrap w-full sm:w-auto">
          {[
            { id: 'quizzes', label: 'Викторины', icon: '📝' },
            { id: 'minigames', label: 'Мини-игры', icon: '⚡' },
            { id: 'specials', label: 'Спецпроекты', icon: '🎁' },
            { id: 'mayor', label: 'Виртуальный мэр', icon: '👑' },
            { id: 'map', label: 'Карта города', icon: '🗺️' }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setActiveQuiz(null);
                  resetGameStates();
                  setTimeout(() => {
                    const el = document.getElementById('mos_game_center');
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 80);
                }}
                className={cn(
                  "relative flex-1 sm:flex-initial px-3.5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all outline-none whitespace-nowrap cursor-pointer z-10 snap-center shrink-0",
                  isActive 
                    ? "text-[#f8fafc] font-black -translate-y-[2px]" 
                    : "text-[#94a3b8] hover:text-[#f8fafc] hover:-translate-y-[1px]"
                )}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="active_tab_slide_dark"
                    className="absolute inset-0 bg-gradient-to-b from-[#2b3a53] to-[#1e293b] border-t border-[rgba(255,255,255,0.15)] border-b-2 border-b-[#10b981] border-x border-[rgba(148,163,184,0.15)] rounded-lg -z-10 shadow-[0_-1px_6px_rgba(16,185,129,0.15),0_6px_16px_rgba(0,0,0,0.4)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================== PREMIUM GLASSMORPHIC ACHIEVEMENTS HUD ================== */}
      {(() => {
        const getLevelInfo = (xp: number) => {
          if (xp <= 150) {
            return { level: 1, title: "Налоговый новичок", min: 0, max: 150, progress: (xp / 150) * 100, nextLevelXp: 150 };
          } else if (xp <= 400) {
            return { level: 2, title: "Бюджетный эксперт", min: 150, max: 400, progress: ((xp - 150) / 250) * 100, nextLevelXp: 400 };
          } else if (xp <= 750) {
            return { level: 3, title: "Финансовый аналитик", min: 400, max: 750, progress: ((xp - 400) / 350) * 100, nextLevelXp: 750 };
          } else if (xp <= 1200) {
            return { level: 4, title: "Бюджетный стратег", min: 750, max: 1200, progress: ((xp - 750) / 450) * 100, nextLevelXp: 1200 };
          } else {
            return { level: 5, title: "Городской стратег", min: 1200, max: 2500, progress: 100, nextLevelXp: 2500 };
          }
        };

        const currentLvl = getLevelInfo(totalXp);
        const percentXP = Math.round(currentLvl.progress);

        // Calculate badges status
        const isFisExpertUnlocked = completedActivities.includes('special-2') || totalXp >= 350;
        const isInvestorUnlocked = unlockedNfts.length > 0 || completedActivities.includes('game-1');
        const isMasterGpsUnlocked = completedActivities.includes('special-3') || completedActivities.includes('quiz-4');

        const badgeList = [
          { name: "Фискальный эксперт", desc: "Спецпроект 3-НДФЛ или 350+ XP", unlocked: isFisExpertUnlocked, progressText: "Рассчитайте вычет" },
          { name: "Инвестор района", desc: "Сбалансируйте район в Мэре", unlocked: isInvestorUnlocked, progressText: "Запустите симулятор" },
          { name: "Мастер госпрограмм", desc: "Викторина 04 или Спецраздел", unlocked: isMasterGpsUnlocked, progressText: "Пройдите 'Госпрограммы'" },
        ];

        const districtNftCards = [
          { id: 'hamovniki', name: 'Хамовники', emoji: '🏰' },
          { id: 'sokolniki', name: 'Сокольники', emoji: '🌲' },
          { id: 'tverskoy', name: 'Тверской', emoji: '🔔' },
          { id: 'krylatskoe', name: 'Крылатское', emoji: '🚴' },
          { id: 'vyhino', name: 'Выхино', emoji: '🚉' },
        ];

        return (
          <div className="space-y-8 mb-10 w-full">
            
            {/* Block A. Profile Header */}
            <div className="bg-[#27354f] rounded-2xl p-5 md:p-6 border border-[rgba(255,255,255,0.08)] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.35)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[12px] uppercase font-bold bg-[#10b981] text-[#f8fafc] px-3.5 py-1.5 rounded-full tracking-wider shrink-0 whitespace-nowrap shadow-xs">
                    Уровень {currentLvl.level}
                  </span>
                  <span className="text-[18px] font-bold text-[#f8fafc] leading-tight">
                    {currentLvl.title}
                  </span>
                </div>
                {/* Score balance representation */}
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-widest text-[#94a3b8] font-bold">Баланс:</span>
                  <span className="text-[#f59e0b] font-bold text-[18px]">{balance} Б</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-[12px] font-bold uppercase text-[#94a3b8] tracking-[0.05em] block">Измеритель XP</span>
                <div className="flex items-center gap-3 sm:gap-4">
                  
                  <div className="relative flex-1 h-3 bg-[#151f32]/80 rounded-full overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${percentXP}%`, background: 'linear-gradient(90deg, #f59e0b 0%, #10b981 100%)' }}
                    />
                    {/* Ticks 25%, 50%, 75% inside the track - sleek and subtle */}
                    {[25, 50, 75].map(tick => (
                      <div 
                        key={tick} 
                        className="absolute top-0 bottom-0 w-[1px] bg-[rgba(248,250,252,0.15)] pointer-events-none"
                        style={{ left: `${tick}%` }}
                      />
                    ))}
                  </div>

                  <div className="shrink-0 w-10 h-10 rounded-full bg-[#151f32] border border-[rgba(148,163,184,0.2)] flex items-center justify-center shadow-inner">
                    <span className="text-[#10b981] font-bold text-[13px]">{percentXP}%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[12px] text-[#94a3b8] mt-1.5 font-semibold">
                  <span className="shrink-0 font-mono text-[13px] text-[#f8fafc]">{totalXp} XP</span>
                  <span className="text-center bg-[#10b981]/10 text-[#10b981] px-2.5 py-0.5 rounded-full text-[11px] sm:text-[12px] whitespace-nowrap">
                    +{currentLvl.nextLevelXp - totalXp} до уровня {currentLvl.level + 1}
                  </span>
                  <span className="shrink-0 font-mono text-[13px] text-[#f8fafc]">{currentLvl.nextLevelXp} XP</span>
                </div>
              </div>
            </div>

            {/* Block B. Achievements Grid */}
            <div className="space-y-4">
              <h3 className="text-[14px] font-bold text-[#f59e0b] tracking-wider flex items-center gap-2">
                <Award size={18} />
                Достижения
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {badgeList.map((badge, idx) => (
                  <div 
                    key={idx}
                    className="bg-[#27354f] rounded-xl p-4 sm:p-5 border border-[rgba(255,255,255,0.08)] flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg transition-all shadow-[0_8px_30px_rgba(0,0,0,0.25)] min-h-[145px]"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                        badge.unlocked 
                          ? "bg-[#f59e0b] text-[#f8fafc]" 
                          : "bg-[#151f32]/80 text-[#475569] border border-[rgba(148,163,184,0.15)]"
                      )}>
                        {badge.unlocked ? <Award size={20} /> : <Lock size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[16px] font-bold text-[#f8fafc] mb-1 leading-snug truncate">{badge.name}</h4>
                        <p className="text-[13px] text-[#94a3b8] leading-relaxed line-clamp-2">
                          {badge.desc}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-4 pt-3 border-t border-[rgba(148,163,184,0.05)]">
                      {badge.unlocked ? (
                        <span className="bg-[#10b981]/20 text-[#34d399] px-3 py-1 rounded-full text-[12px] font-bold tracking-wide">
                          ✓ Выполнено
                        </span>
                      ) : (
                        <span className="bg-[#151f32] text-[#94a3b8] px-3 py-1 rounded-full text-[12px] font-medium tracking-wide flex items-center gap-1.5 border border-[rgba(148,163,184,0.1)]">
                          <Lock size={12} />
                          Заблокировано
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Block C. District Signs */}
            <div className="space-y-4">
              <h3 className="text-[14px] uppercase font-bold text-[#f59e0b] tracking-wider flex items-center gap-2">
                <MapIcon size={18} />
                Знаки отличия районов 
                <span className="ml-1 text-[#94a3b8] font-normal">({unlockedNfts.length}/5)</span>
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {districtNftCards.map((nft) => {
                  const isUnlocked = unlockedNfts.includes(nft.id);
                  return (
                    <div 
                      key={nft.id}
                      className="bg-[#27354f] border border-[rgba(255,255,255,0.08)] rounded-xl aspect-square flex flex-col items-center justify-center relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
                    >
                      <MapIcon 
                        size={80} 
                        className={cn(
                          "absolute opacity-10 -z-10 group-hover:scale-110 transition-transform", 
                          isUnlocked ? "text-[#f59e0b] opacity-20" : "text-[#475569]"
                        )} 
                        strokeWidth={1}
                      />
                      
                      <div className="flex items-center justify-center w-12 h-12 mb-3 z-10">
                        {isUnlocked ? (
                          <div className="text-[#f59e0b]">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        ) : (
                          <div className="bg-[#151f32] p-3 rounded-full border border-[rgba(255,255,255,0.05)]">
                            <Lock size={20} className="text-[#475569]" />
                          </div>
                        )}
                      </div>
                      
                      <span className={cn(
                        "text-[15px] font-bold z-10 px-2 text-center tracking-wide leading-tight",
                        isUnlocked ? "text-[#fbbf24] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" : "text-[#cbd5e1]"
                      )}>
                        {nft.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        );
      })()}



      {/* --- CONTENT CONTROLLER --- */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="h-full flex flex-col"
          >

        {/* ================== SUB-TAB 1: QUIZZES ================== */}
        {activeTab === 'quizzes' && (
          <div className="space-y-4">
            
            {!activeQuiz ? (
              // Quiz Grid Listing
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* DYNAMIC RANDOM BUDGET GENERATOR FOR HIGH INTERACTIVITY */}
                <div className="md:col-span-2 bg-[#27354f] p-6 rounded-2xl border border-[rgba(255,255,255,0.08)] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.35)] flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden group">
                  {/* Micro-Illustration */}
                  <div className="absolute inset-0 pointer-events-none opacity-5">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                      <pattern id="net" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M0 40V0H40" fill="none" stroke="#f8fafc" strokeWidth="1"/>
                        <circle cx="40" cy="40" r="1.5" fill="#f8fafc" />
                        <circle cx="0" cy="0" r="1.5" fill="#f8fafc" />
                      </pattern>
                      <rect width="100%" height="100%" fill="url(#net)" />
                    </svg>
                  </div>
                  
                  <div className="flex items-center gap-4 z-10 w-full md:w-auto">
                    <div className="w-12 h-12 rounded-full bg-[#f59e0b] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                      <Sparkles size={24} className="text-[#f8fafc]" />
                    </div>
                    <div>
                      <h3 className="text-[18px] font-bold text-[#f8fafc] mb-1">Случайный Финансовый Квиз</h3>
                      <p className="text-[#94a3b8] text-[14px]">
                        Соберите моментальный квиз дня из 52 уникальных фактов о Законе о бюджете Москвы на 2026 год. Каждый тест уникален!
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={startRandomQuiz}
                    className="bg-[#ef4444] text-[#f8fafc] hover:bg-[#f87171] px-6 py-3 rounded-lg text-[14px] font-bold shadow-[0_2px_4px_-1px_rgba(239,68,68,0.3)] select-none cursor-pointer duration-200 hover:-translate-y-0.5 active:translate-y-0 shrink-0 z-10 w-full md:w-auto text-center"
                  >
                    Сгенерировать & Начать (+150 Б)
                  </button>
                </div>

                {quizzesData.map((quiz) => {
                  const isCompleted = completedActivities.includes(quiz.id);
                  
                  // Audit #9: Lock conditions
                  let isLocked = false;
                  let lockReason = "";
                  
                  if (quiz.id === "quiz-4") {
                    const dependsCompleted = completedActivities.includes("quiz-1");
                    if (!dependsCompleted) {
                      isLocked = true;
                      lockReason = "Пройдите тест 'Доходы бюджета Москвы'.";
                    }
                  } else if (quiz.id === "quiz-5") {
                     const dependsCompleted = completedActivities.includes("quiz-2");
                     if (!dependsCompleted) {
                       isLocked = true;
                       lockReason = "Пройдите тест 'Расходы на промышленность'.";
                     }
                  }

                  const difficultyBorder = 
                    quiz.difficulty === "Легкий" ? "border-l-[#10b981]" :
                    quiz.difficulty === "Средний" ? "border-l-[#f59e0b]" :
                    "border-l-[#ef4444]";
                  
                  const difficultyColor = 
                    quiz.difficulty === "Легкий" ? "bg-[#10b981]" :
                    quiz.difficulty === "Средний" ? "bg-[#f59e0b]" :
                    "bg-[#ef4444]";

                  return (
                    <div 
                      key={quiz.id}
                      onClick={() => {
                        if (isLocked) {
                          // Visual cue for locked click - can scroll to top or flash
                        }
                      }}
                      className={cn(
                        "p-5 rounded-xl border-y border-r border-[rgba(255,255,255,0.08)] bg-[#27354f] transition-all duration-200 flex flex-col justify-between group border-l-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:-translate-y-1 hover:shadow-lg",
                        difficultyBorder,
                        isCompleted ? "opacity-80" : "",
                        isLocked ? "opacity-50 pointer-events-none" : ""
                      )}
                    >
                      <div className="relative">
                        {/* Points */}
                        <div className="absolute top-0 right-0 font-bold text-[14px] text-[#fbbf24]">
                          +{quiz.reward} Б
                        </div>

                        {/* Quiz Metadata Row */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className={cn(
                            "text-[12px] font-bold px-3 py-1 rounded-full uppercase tracking-wider text-[#f8fafc]",
                            difficultyColor
                          )}>
                            {quiz.difficulty}
                          </span>
                        </div>

                        <h3 className="text-[18px] font-bold text-[#f8fafc] leading-snug mb-1 pr-12">
                          {quiz.title}
                        </h3>
                        <p className="text-[#94a3b8] text-[14px] leading-relaxed line-clamp-2">
                          {quiz.topic}
                        </p>
                      </div>

                      {/* Overriding display for Locked state (Audit #9 Unlock conditions) */}
                      {isLocked ? (
                        <div className="mt-4 pt-4 border-t border-[rgba(148,163,184,0.1)] flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#94a3b8]">
                            <span>🔒 Заблокировано</span>
                          </div>
                          <p className="text-[12px] font-medium text-[#475569]">
                            {lockReason}
                          </p>
                        </div>
                      ) : (
                        /* Play Action Container */
                        <div className="mt-4 pt-4 border-t border-[rgba(148,163,184,0.1)] flex items-center justify-between">
                          {isCompleted ? (
                            <div className="flex items-center gap-1.5 text-[#10b981] text-[12px] font-bold">
                              <CheckCircle2 size={16} />
                              <span>Пройдено</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[#475569] text-[12px]">
                              <Clock size={14} />
                              <span>2 мин</span>
                            </div>
                          )}

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              startQuiz(quiz);
                            }}
                            className={cn(
                              "px-4 py-2 rounded-md text-[14px] font-bold transition-all duration-150 cursor-pointer flex items-center gap-1.5",
                              isCompleted 
                                ? "bg-[#334155] text-[#94a3b8] hover:bg-[#475569] hover:text-[#f8fafc]" 
                                : "bg-[#334155] text-[#f8fafc] hover:bg-[#475569]"
                            )}
                          >
                            <span>{isCompleted ? "Повторить" : "Начать"}</span>
                            <ArrowRight size={16} className="ml-1" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // ACTIVE QUIZ INTERFACE Screen
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#27354f] border border-[rgba(255,255,255,0.08)] p-6 md:p-8 rounded-2xl shadow-[0_8px_32px_-4px_rgba(0,0,0,0.35)]"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-[rgba(148,163,184,0.1)] pb-4 mb-6 gap-3 sm:gap-0">
                  <div>
                    <span className="text-[12px] font-bold uppercase text-[#94a3b8] tracking-widest block mb-1">активная сессия</span>
                    <h3 className="text-[18px] md:text-[20px] font-bold text-[#f8fafc] tracking-tight">{activeQuiz.title}</h3>
                  </div>
                  <button 
                    onClick={() => setActiveQuiz(null)}
                    className="text-[14px] font-bold text-[#94a3b8] hover:text-[#f8fafc] bg-[#334155] hover:bg-[#475569] px-4 py-2 rounded-lg w-max transition-colors"
                  >
                    Вернуться к списку
                  </button>
                </div>

                {/* Progress Indicators */}
                <div className="flex items-center justify-between text-[14px] font-bold text-[#94a3b8] mb-3">
                  <span>Вопрос {currentQuestionIndex + 1} из {activeQuiz.questions.length}</span>
                  <span>Правильно: <span className="text-[#f8fafc]">{score}</span></span>
                </div>
                
                {/* Bar */}
                <div className="w-full bg-[#334155] h-2 rounded-full overflow-hidden mb-8">
                  <div 
                    className="bg-[#10b981] h-full transition-all duration-300" 
                    style={{ width: `${((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100}%` }}
                  />
                </div>

                {/* Question */}
                <p className="text-[18px] md:text-[20px] font-semibold text-[#f8fafc] leading-snug mb-6">
                  {activeQuiz.questions[currentQuestionIndex].question}
                </p>

                {/* Options Loop with Green/Red validation */}
                <div className="space-y-3 mb-6">
                  {activeQuiz.questions[currentQuestionIndex].options.map((opt, oIdx) => {
                    const isCorrect = oIdx === activeQuiz.questions[currentQuestionIndex].correct;
                    const isClicked = selectedOption === oIdx;
                    const isAnySelected = selectedOption !== null;

                    return (
                      <button
                        key={oIdx}
                        disabled={isAnySelected}
                        onClick={() => handleSelectOption(oIdx)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border text-[16px] font-medium transition-all duration-150 outline-none flex items-center justify-between",
                          !isAnySelected 
                            ? "bg-[#334155] border-[rgba(148,163,184,0.1)] text-[#f8fafc] hover:border-[rgba(148,163,184,0.3)] hover:bg-[#475569]" 
                            : isClicked && isCorrect
                              ? "bg-[#10b981]/20 border-[#10b981] text-[#f8fafc]"
                              : isClicked && !isCorrect
                                ? "bg-[#ef4444]/20 border-[#ef4444] text-[#f8fafc]"
                                : isCorrect
                                  ? "bg-[#10b981]/10 border-[#10b981]/50 text-[#f8fafc]"
                                  : "bg-[#334155] border-[rgba(148,163,184,0.1)] text-[#94a3b8] opacity-50"
                        )}
                      >
                        <span className="max-w-[90%] leading-relaxed">{opt}</span>
                        {isAnySelected && (
                          <div className="shrink-0 ml-3">
                            {isCorrect ? (
                              <CheckCircle2 size={20} className="text-[#10b981]" />
                            ) : isClicked ? (
                              <span className="text-[#ef4444] font-bold text-lg leading-none">X</span>
                            ) : null}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Real-time explanation shown immediately on selected option */}
                {selectedOption !== null && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-[#334155] border border-[rgba(148,163,184,0.1)] rounded-xl mb-6 flex items-start gap-3"
                  >
                    <Info size={20} className="text-[#38bdf8] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[12px] uppercase font-bold text-[#38bdf8] tracking-widest block mb-1">Обоснование</span>
                      <p className="text-[14px] text-[#f8fafc] leading-relaxed">
                        {activeQuiz.questions[currentQuestionIndex].explanation}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Footer Next Button */}
                {selectedOption !== null && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleNextQuestion}
                      className="px-6 py-3 bg-[#ef4444] hover:bg-[#f87171] text-[#f8fafc] font-bold rounded-lg text-[14px] flex items-center gap-2 transition-all shadow-[0_2px_4px_-1px_rgba(239,68,68,0.3)]"
                    >
                      <span>{currentQuestionIndex + 1 === activeQuiz.questions.length ? "Завершить тест" : "Следующий вопрос"}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

          </div>
        )}


        {/* ================== SUB-TAB 2: GAMES ================== */}
        {activeTab === 'minigames' && (
          <div className="space-y-4">
            
            {!activeGameId ? (
              // Games Grid List
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Game 1 Item */}
                <div className={cn(
                  "p-5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#1e293b] transition-all flex flex-col justify-between",
                  completedActivities.includes('game-1') ? "bg-[#D1FAE5]/10 border-emerald-200" : "hover:border-neutral-300"
                )}>
                  <div>
                    <div className="flex justify-between items-center gap-2 mb-2">
                      <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#B45309] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Симулятор балансировки</span>
                      <span className="text-[11px] font-bold font-mono text-[#CC1111]">+150 Б</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-slate-100">Балансировщик бюджета</h3>
                    <p className="text-xs text-[#475569] font-medium leading-relaxed mt-1">
                      Распределите доли бюджета между расходами. Главная плановая цель — социальная сфера не менее 50%!
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {completedActivities.includes('game-1') ? (
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">Выполнено</span>
                    ) : <span />}
                    <button 
                      onClick={() => setActiveGameId('game-1')}
                      className="px-3.5 py-1.5 text-xs font-bold bg-[#CC1111] hover:bg-[#A30E0E] text-white rounded-lg transition-all"
                    >
                      Играть
                    </button>
                  </div>
                </div>

                {/* Game 2 Item */}
                <div className={cn(
                  "p-5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#1e293b] transition-all flex flex-col justify-between",
                  completedActivities.includes('game-2') ? "bg-[#D1FAE5]/10 border-emerald-200" : "hover:border-neutral-300"
                )}>
                  <div>
                    <div className="flex justify-between items-center gap-2 mb-2">
                      <span className="text-[9px] uppercase font-extrabold tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">фискальная инспекция</span>
                      <span className="text-[11px] font-bold font-mono text-[#CC1111]">+150 Б</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-slate-100">Финансовый Аудитор</h3>
                    <p className="text-xs text-[#475569] font-medium leading-relaxed mt-1">
                      Просканируйте 3 расходных ордера ГРБС Москвы и определите нецелевое нарушение Бюджетного кодекса.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {completedActivities.includes('game-2') ? (
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">Выполнено</span>
                    ) : <span />}
                    <button 
                      onClick={() => setActiveGameId('game-2')}
                      className="px-3.5 py-1.5 text-xs font-bold bg-[#CC1111] hover:bg-[#A30E0E] text-white rounded-lg transition-all"
                    >
                      Изучить
                    </button>
                  </div>
                </div>

                {/* Game 3 Item */}
                <div className={cn(
                  "p-5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#1e293b] transition-all flex flex-col justify-between",
                  completedActivities.includes('game-3') ? "bg-[#D1FAE5]/10 border-emerald-200" : "hover:border-neutral-300"
                )}>
                  <div>
                    <div className="flex justify-between items-center gap-2 mb-2">
                      <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#065F46] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Стратегический выбор</span>
                      <span className="text-[11px] font-bold font-mono text-[#CC1111]">+150 Б</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-slate-100">Инвест-Стратег</h3>
                    <p className="text-xs text-[#475569] font-medium leading-relaxed mt-1">
                      Сыграйте роль инвест-аналитика Москвы. Оцените приоритетные сферы научно-производственного развития.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {completedActivities.includes('game-3') ? (
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">Выполнено</span>
                    ) : <span />}
                    <button 
                      onClick={() => setActiveGameId('game-3')}
                      className="px-3.5 py-1.5 text-xs font-bold bg-[#CC1111] hover:bg-[#A30E0E] text-white rounded-lg transition-all"
                    >
                      Играть
                    </button>
                  </div>
                </div>

                {/* Game 4 Item */}
                <div className={cn(
                  "p-5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#1e293b] transition-all flex flex-col justify-between",
                  completedActivities.includes('game-4') ? "bg-[#D1FAE5]/10 border-emerald-200" : "hover:border-neutral-300"
                )}>
                  <div>
                    <div className="flex justify-between items-center gap-2 mb-2">
                      <span className="text-[9px] uppercase font-extrabold tracking-widest text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">возврат налога</span>
                      <span className="text-[11px] font-bold font-mono text-[#CC1111]">+150 Б</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-slate-100">Вычет-Клик</h3>
                    <p className="text-xs text-[#475569] font-medium leading-relaxed mt-1">
                      Создайте интерактивную декларацию, сбалансируйте лимиты возмещения расходов и получите вычет.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {completedActivities.includes('game-4') ? (
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">Выполнено</span>
                    ) : <span />}
                    <button 
                      onClick={() => setActiveGameId('game-4')}
                      className="px-3.5 py-1.5 text-xs font-bold bg-[#CC1111] hover:bg-[#A30E0E] text-white rounded-lg transition-all"
                    >
                      Собрать чек
                    </button>
                  </div>
                </div>

                {/* Game 5 Item */}
                <div className={cn(
                  "p-5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#1e293b] transition-all flex flex-col justify-between",
                  completedActivities.includes('game-5') ? "bg-[#D1FAE5]/10 border-emerald-200" : "hover:border-neutral-300"
                )}>
                  <div>
                    <div className="flex justify-between items-center gap-2 mb-2">
                      <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#475569] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 px-2 py-0.5 rounded">Московская промзона</span>
                      <span className="text-[11px] font-bold font-mono text-[#CC1111]">+150 Б</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-slate-100">Вектор Развития</h3>
                    <p className="text-xs text-[#475569] font-medium leading-relaxed mt-1">
                      Настройте технологические и экологические нормативы московских промышленных субсидий.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {completedActivities.includes('game-5') ? (
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">Выполнено</span>
                    ) : <span />}
                    <button 
                      onClick={() => setActiveGameId('game-5')}
                      className="px-3.5 py-1.5 text-xs font-bold bg-[#CC1111] hover:bg-[#A30E0E] text-white rounded-lg transition-all cursor-pointer"
                    >
                      Включить вектор
                    </button>
                  </div>
                </div>

                {/* Game 6: Interactive Mayor Launcher (Direct link) */}
                <div className="p-5 rounded-xl border-2 border-amber-300 bg-[#FFFDF5] transition-all flex flex-col justify-between hover:border-amber-400 hover:shadow-[0_4px_20px_rgba(245,158,11,0.15)]">
                  <div>
                    <div className="flex justify-between items-center gap-2 mb-2">
                      <span className="text-[9px] uppercase font-extrabold tracking-widest text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded">Районный симулятор</span>
                      <span className="text-[11px] font-bold font-mono text-[#CC1111]">+150 Б</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-amber-950 flex items-center gap-1.5">
                      <span>👑</span> Интерактивный мэр округа
                    </h3>
                    <p className="text-xs text-amber-900 font-medium leading-relaxed mt-1">
                      Примите управление округом Москвы, распределите бюджетные квоты и сдайте проект бюджета города!
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-amber-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded">Спецрежим</span>
                    <button 
                      onClick={() => {
                        setActiveTab('mayor');
                        setActiveQuiz(null);
                        resetGameStates();
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold bg-[#CC1111] hover:bg-[#A30E0E] text-white rounded-lg transition-all cursor-pointer"
                    >
                      Играть
                    </button>
                  </div>
                </div>

                {/* Game 7: Interactive Map Launcher (Direct link) */}
                <div className="p-5 rounded-xl border-2 border-blue-300 bg-[#F4F9FF] transition-all flex flex-col justify-between hover:border-blue-400 hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)]">
                  <div>
                    <div className="flex justify-between items-center gap-2 mb-2">
                      <span className="text-[9px] uppercase font-extrabold tracking-widest text-blue-800 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded">Векторная карта</span>
                      <span className="text-[11px] font-bold font-mono text-[#CC1111]">+150 Б</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-blue-950 flex items-center gap-1.5">
                      <span>🗺️</span> Интерактивная карта
                    </h3>
                    <p className="text-xs text-blue-900 font-medium leading-relaxed mt-1">
                      Исследуйте условные сценарии социальных объектов на демонстрационной векторной карте.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-blue-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-900 bg-blue-100/80 px-2.5 py-1 rounded">Разделы</span>
                    <button 
                      onClick={() => {
                        setActiveTab('map');
                        setActiveQuiz(null);
                        resetGameStates();
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold bg-[#CC1111] hover:bg-[#A30E0E] text-white rounded-lg transition-all cursor-pointer"
                    >
                      Открыть карту
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              // ACTIVE GAME DISPLAY CONTAINER
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-neutral-50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6"
              >
                {/* Back bar */}
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700/50 pb-3 mb-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#CC1111] tracking-wider">интерактивный симулятор активен</span>
                    <h4 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                      {activeGameId === 'game-1' && "Балансировщик бюджета Москвы"}
                      {activeGameId === 'game-2' && "Финансовый Аудитор"}
                      {activeGameId === 'game-3' && "Инвест-Стратег"}
                      {activeGameId === 'game-4' && "Вычет-Клик"}
                      {activeGameId === 'game-5' && "Вектор Развития"}
                    </h4>
                  </div>
                  <button 
                    onClick={resetGameStates}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-100 bg-slate-200 hover:bg-slate-300 transition px-3.5 py-1.5 rounded-lg"
                  >
                    Вернуться к играм
                  </button>
                </div>


                {/* ------ GAME 1 CONTENT ------ */}
                {activeGameId === 'game-1' && (
                  <div className="space-y-6">
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed mb-4">
                      Сбалансируйте доли так, чтобы их сумма составила <span className="text-emerald-700 font-bold">ровно 100%</span>. 
                      Законодательное требование развития столичной социальной поддержки: выделите на <span className="font-bold text-emerald-700">Социальную сферу не менее 50%</span>!
                    </p>

                    <div className="space-y-4 bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                      {/* Industrial Slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs sm:text-sm font-bold">
                          <span>⚙️ Промышленность и субсидии</span>
                          <span className="font-mono text-[#CC1111]">{game1Industry}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" value={game1Industry}
                          onChange={(e) => setGame1Industry(Number(e.target.value))}
                          className="w-full accent-[#CC1111] h-1 bg-slate-100 dark:bg-slate-800 rounded appearance-none"
                        />
                      </div>

                      {/* Social Services */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs sm:text-sm font-bold">
                          <span>❤️ Социальная поддержка граждан</span>
                          <span className="font-mono text-emerald-700">{game1Social}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" value={game1Social}
                          onChange={(e) => setGame1Social(Number(e.target.value))}
                          className="w-full accent-emerald-600 h-1 bg-slate-100 dark:bg-slate-800 rounded appearance-none"
                        />
                      </div>

                      {/* Transit System */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs sm:text-sm font-bold">
                          <span>🚇 Транспортная инфраструктура</span>
                          <span className="font-mono text-blue-700">{game1Transport}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" value={game1Transport}
                          onChange={(e) => setGame1Transport(Number(e.target.value))}
                          className="w-full accent-blue-600 h-1 bg-slate-100 dark:bg-slate-800 rounded appearance-none"
                        />
                      </div>
                    </div>

                    {/* Check panel */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border rounded-xl bg-white dark:bg-[#1e293b]">
                      <div>
                        <div className="text-xs font-bold text-slate-500">ОБЩИЙ РАСПРЕДЕЛЕННЫЙ БАЛАНС:</div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className={cn(
                            "text-xl sm:text-2xl font-mono font-bold",
                            game1Total === 100 ? "text-emerald-700" : "text-amber-600"
                          )}>
                            {game1Total}% / 100%
                          </span>
                        </div>
                      </div>

                      <button
                        disabled={game1Total !== 100}
                        onClick={() => {
                          if (game1Social >= 50) {
                            handleCompleteActivity('game-1', 150, "Поздравляем! Бюджет Москвы успешно сбалансирован: инвестиции в социальную сферу в рамках нормативов.");
                            resetGameStates();
                          } else {
                            showToast("Внимание: На долю Социальной поддержки выделено менее 50%. Бюджет Москвы социально ориентированный, увеличьте долю!", 0);
                          }
                        }}
                        className={cn(
                          "px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer",
                          game1Total === 100 
                            ? "bg-[#CC1111] hover:bg-[#A30E0E] text-white" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                        )}
                      >
                        Утвердить план
                      </button>
                    </div>

                    {game1Total !== 100 && (
                      <p className="text-[11px] text-amber-600 font-bold text-center">
                        ⚠️ Сумма весов должна составить ровно 100%, чтобы запустить утверждение!
                      </p>
                    )}
                  </div>
                )}


                {/* ------ GAME 2 CONTENT ------ */}
                {activeGameId === 'game-2' && (
                  <div className="space-y-4">
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-normal">
                      Проведите выездной аудит. Нажмите на тот финансовый ордер, который содержит грубейшее нецелевое нарушение Бюджетного кодекса РФ:
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { 
                          id: 1, 
                          title: "Субсидия заводу на закупку станков по договору №41-Ф — 45 млн ₽",
                          subTitle: "Получатель: ОАО Мостехмаш. Направление: Закупка станков лазерной резки отечественного производства.",
                          valid: true,
                          details: "Полностью целевая государственная поддержка московского производства. Соответствует программе импортозамещения."
                        },
                        { 
                          id: 2, 
                          title: "Выплата компенсации процентов по кредиту на модернизацию — 12 млн ₽",
                          subTitle: "Получатель: Фабрика Трехгорная. Решение: Компенсация процентных ставок по коммерческим займам на переоснащение.",
                          valid: true,
                          details: "Стандартная мера поддержки субъектов МСП. Абсолютно целевое расходование через средства департамента."
                        },
                        { 
                          id: 3, 
                          title: "Выделение бюджетных средств на покупку криптовалюты для резервов ГРБС — 80 млн ₽",
                          subTitle: "Получатель: Техно-Пул. Решение: Покупка токенизированных активов и мем-коинов в резервную казну департамента.",
                          valid: false,
                          details: "Грубое правонарушение! Бюджетный кодекс запрещает вложения бюджетных средств в криптовалюты, криптоактивы и спекулятивные необеспеченные цифровые инструменты."
                        }
                      ].map((card) => {
                        const isSelected = game2SelectedCard === card.id;
                        const hasChecked = game2SelectedCard !== null;

                        return (
                          <button
                            key={card.id}
                            disabled={hasChecked}
                            onClick={() => {
                              setGame2SelectedCard(card.id);
                              if (!card.valid) {
                                handleCompleteActivity('game-2', 150, "Ордер №3 проверен! Обнаружено нецелевое использование валютной статьи на криптовалюту.");
                              }
                            }}
                            className={cn(
                              "w-full text-left p-4 rounded-xl border transition-all text-xs sm:text-sm font-semibold flex flex-col gap-1",
                              !hasChecked 
                                ? "bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700/50 hover:border-neutral-400 hover:bg-neutral-50/50"
                                : isSelected && !card.valid
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                                  : isSelected && card.valid
                                    ? "bg-red-50 border-red-300 text-red-950"
                                    : "bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700/50 opacity-60"
                            )}
                          >
                            <span className="font-bold text-slate-900 dark:text-slate-100 leading-snug">{card.title}</span>
                            <span className="text-[11px] text-[#475569] font-medium leading-relaxed mt-0.5">{card.subTitle}</span>
                            
                            {hasChecked && isSelected && (
                              <div className="mt-3 pt-3 border-t border-dotted border-slate-300 flex items-start gap-2 text-slate-800 dark:text-slate-100">
                                <Info size={14} className="shrink-0 mt-0.5" />
                                <p className="text-xs font-medium leading-relaxed">{card.details}</p>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {game2SelectedCard !== null && (
                      <div className="mt-4 flex justify-end">
                        <button 
                          onClick={resetGameStates}
                          className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl text-xs sm:text-sm"
                        >
                          Завершить сессию
                        </button>
                      </div>
                    )}
                  </div>
                )}


                {/* ------ GAME 3 CONTENT ------ */}
                {activeGameId === 'game-3' && (
                  <div className="space-y-4">
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-normal">
                      Куда направить свободные лимиты инвестиционного развития Москвы для извлечения максимального технологического приоритета?
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        onClick={() => {
                          setGame3InvestResult('tech');
                          setGame3InnovationValue(15);
                          handleCompleteActivity('game-3', 150, "Вы выбрали Технопарк 'Строгино'! Москва получила прирост наукоемкости и высокотехнологичных цехов.");
                        }}
                        className="p-5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#1e293b] hover:border-[#CC1111] hover:bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between items-start text-left transition-all group cursor-pointer"
                      >
                        <div className="bg-emerald-50 text-emerald-700 text-lg w-9 h-9 rounded-lg flex items-center justify-center mb-3">🚀</div>
                        <h5 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 mb-1 group-hover:text-[#CC1111]">Вложить в Технопарк 'Строгино'</h5>
                        <p className="text-xs text-[#475569] leading-relaxed">Создание новых IT-производств, субсидирование закупки робототехнических модулей.</p>
                      </button>

                      <button
                        onClick={() => {
                          setGame3InvestResult('trade');
                          setGame3InnovationValue(2);
                        }}
                        className="p-5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#1e293b] hover:border-[#CC1111] hover:bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between items-start text-left transition-all group cursor-pointer"
                      >
                        <div className="bg-amber-50 text-[#B45309] text-lg w-9 h-9 rounded-lg flex items-center justify-center mb-3">🏪</div>
                        <h5 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 mb-1 group-hover:text-[#CC1111]">Вложить в розничную и оптовую торговлю</h5>
                        <p className="text-xs text-[#475569] leading-relaxed">Обычные коммерческие рынки. Имеют низкий технологический приоритет госфинансирования.</p>
                      </button>
                    </div>

                    {game3InvestResult && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "p-4 rounded-xl border flex items-start gap-3 mt-4 text-xs sm:text-sm font-semibold",
                          game3InvestResult === 'tech' 
                            ? "bg-emerald-50 border-emerald-300 text-emerald-950" 
                            : "bg-red-50 border-red-200 text-[#0F172A] dark:text-slate-100"
                        )}
                      >
                        <Info size={16} className="shrink-0 mt-0.5" />
                        <div>
                          {game3InvestResult === 'tech' ? (
                            <>
                              <span className="font-extrabold block text-emerald-800 uppercase tracking-wide text-[10px]">результат выбора</span>
                              <p className="mt-1">
                                Ключевой приоритет правительства Москвы сбалансирован! Инновационный Технопарк растет быстрее плана: <strong className="font-mono text-emerald-600">Рост инноваций +{game3InnovationValue}%</strong>!
                              </p>
                            </>
                          ) : (
                            <>
                              <span className="font-extrabold block text-amber-700 uppercase tracking-wide text-[10px]">предупреждение приоритета</span>
                              <p className="mt-1">
                                Розничные рынки развиваются за счет частного саморегулируемого капитала. Субсидии на них выделяются в низком приоритете. Перенаправьте средства в инновации, чтобы завершить миссию!
                              </p>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {game3InvestResult && (
                      <div className="mt-4 flex justify-end">
                        <button 
                          onClick={resetGameStates}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs sm:text-sm cursor-pointer transition shadow-xs"
                        >
                          Завершить сессию
                        </button>
                      </div>
                    )}
                  </div>
                )}


                {/* ------ GAME 4 CONTENT ------ */}
                {activeGameId === 'game-4' && (
                  <div className="space-y-4">
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-normal">
                      Добавьте статьи расходов в интерактивный ресивер вычетов. Совокупный лимит по соцвычетам составляет <strong className="font-mono">150 000 ₽</strong>. 
                      Попробуйте превысить его и завершите учебный расчёт. Данные никуда не отправляются.
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <button
                        onClick={() => setGame4List(prev => [...prev, 50000])}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-700/50 hover:border-slate-400 bg-white dark:bg-[#1e293b] rounded-lg text-xs font-bold cursor-pointer transition"
                      >
                        + Обучение в Вузе (50к)
                      </button>

                      <button
                        onClick={() => setGame4List(prev => [...prev, 30000])}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-700/50 hover:border-slate-400 bg-white dark:bg-[#1e293b] rounded-lg text-xs font-bold cursor-pointer transition"
                      >
                        + Спортивный абонемент (30к)
                      </button>

                      <button
                        onClick={() => setGame4List(prev => [...prev, 80000])}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-700/50 hover:border-slate-400 bg-white dark:bg-[#1e293b] rounded-lg text-xs font-bold cursor-pointer transition"
                      >
                        + Лечение / Стоматология (80к)
                      </button>

                      <button
                        onClick={() => setGame4List([])}
                        className="px-4 py-2 border border-red-200 bg-red-50 text-red-600 rounded-lg text-xs font-bold cursor-pointer transition"
                      >
                        Очистить чек
                      </button>
                    </div>

                    {/* Receipt visualizer */}
                    <div className="bg-white dark:bg-[#1e293b] border text-[#0F172A] dark:text-slate-100 p-5 rounded-2xl border-slate-200 dark:border-slate-700/50 max-w-sm mx-auto shadow-xs">
                      <div className="text-center pb-3 border-b border-dashed border-slate-300">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#CC1111]">УЧЕБНАЯ МОДЕЛЬ // СОЦВЫЧЕТ</span>
                        <h4 className="font-extrabold text-[#0F172A] dark:text-slate-100 text-sm mt-0.5">Черновой расчёт 3-НДФЛ</h4>
                      </div>

                      <div className="py-4 space-y-2 text-xs font-semibold leading-normal">
                        {game4List.length === 0 ? (
                          <div className="text-center text-slate-400 py-4 italic">Чек пуст. Тапайте кнопки категорий выше 👆</div>
                        ) : (
                          game4List.map((val, idx) => (
                            <div key={idx} className="flex justify-between font-mono">
                              <span>Пункт {idx + 1}: Социальные расходы</span>
                              <span>+{val.toLocaleString('ru-RU')} ₽</span>
                            </div>
                          ))
                        )}
                      </div>

                      {game4List.length > 0 && (
                        <div className="pt-3 border-t border-dashed border-slate-300 space-y-1.5 text-xs">
                          <div className="flex justify-between font-bold">
                            <span>Общая сумма расходов:</span>
                            <span className="font-mono text-slate-800 dark:text-slate-100">{game4RawSum.toLocaleString('ru-RU')} ₽</span>
                          </div>

                          <div className="flex justify-between font-bold text-[#CC1111]">
                            <span>Налоговая база с учетом лимита:</span>
                            <span className="font-mono">{game4ClampedSum.toLocaleString('ru-RU')} ₽</span>
                          </div>

                          <div className="flex justify-between font-extrabold text-emerald-700 text-sm mt-2 pt-2 border-t border-slate-100">
                            <span>Сумма к компенсации (13%):</span>
                            <span className="font-mono font-black">{game4Refund.toLocaleString('ru-RU')} ₽</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {game4RawSum > 150000 && (
                      <p className="text-[11px] text-amber-600 font-bold text-center">
                        💡 Лимит социальных вычетов (150 000 ₽) превышен! Налоговая база автоматически зафиксирована на максимальной планке. Сверх этого налог не возвращается.
                      </p>
                    )}

                    {game4RawSum > 0 && (
                      <div className="flex justify-center mt-4">
                        <button
                          onClick={() => {
                            if (game4RawSum >= 150000) {
                              handleCompleteActivity('game-4', 150, "Учебный расчёт завершён: при ставке 13% ориентир составляет 19 500 ₽.");
                              resetGameStates();
                            } else {
                              showToast("Вы добавили менее 150 000 ₽ расходов. Добавьте ещё расходов, чтобы превзойти лимит налоговой планки!", 0);
                            }
                          }}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs uppercase"
                        >
                          Завершить учебный расчёт
                        </button>
                      </div>
                    )}
                  </div>
                )}


                {/* ------ GAME 5 CONTENT ------ */}
                {activeGameId === 'game-5' && (
                  <div className="space-y-4">
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-normal">
                      Для выдачи субсидий московским промышленным предприятиям необходимо установить соответствие по трём критическим целевым KPI. Переведите все три селектора в положение <strong className="text-emerald-700">ОN</strong>:
                    </p>

                    <div className="space-y-3 bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                      {/* Toggle 1 */}
                      <button
                        onClick={() => setGame5Toggle1(!game5Toggle1)}
                        className="w-full flex items-center justify-between gap-3 p-3 border rounded-xl hover:bg-neutral-50 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-lg shrink-0">🏭</span>
                          <div className="text-left min-w-0">
                            <span className="text-xs sm:text-sm font-bold block text-slate-800 dark:text-slate-100 leading-tight">1. Модернизация цехов и станочного парка</span>
                            <span className="text-[10px] text-slate-400 font-medium block leading-normal">Роботизация и уход от импортных ЧПУ к отечественным образцам.</span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {game5Toggle1 ? (
                            <span className="text-emerald-600 text-[10px] sm:text-xs font-bold bg-emerald-100 px-2.5 py-1 rounded">АКТИВНО</span>
                          ) : (
                            <span className="text-slate-400 text-[10px] sm:text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">ВЫКЛ</span>
                          )}
                        </div>
                      </button>

                      {/* Toggle 2 */}
                      <button
                        onClick={() => setGame5Toggle2(!game5Toggle2)}
                        className="w-full flex items-center justify-between gap-3 p-3 border rounded-xl hover:bg-neutral-50 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-lg shrink-0">👥</span>
                          <div className="text-left min-w-0">
                            <span className="text-xs sm:text-sm font-bold block text-slate-800 dark:text-slate-100 leading-tight">2. Рост высокотехнологичных рабочих мест</span>
                            <span className="text-[10px] text-slate-400 font-medium block leading-normal">Трудоустройство выпускников профильных московских вузов на оклады от 100k ₽.</span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {game5Toggle2 ? (
                            <span className="text-emerald-600 text-[10px] sm:text-xs font-bold bg-emerald-100 px-2.5 py-1 rounded">АКТИВНО</span>
                          ) : (
                            <span className="text-slate-400 text-[10px] sm:text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">ВЫКЛ</span>
                          )}
                        </div>
                      </button>

                      {/* Toggle 3 */}
                      <button
                        onClick={() => setGame5Toggle3(!game5Toggle3)}
                        className="w-full flex items-center justify-between gap-3 p-3 border rounded-xl hover:bg-neutral-50 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-lg shrink-0">🍃</span>
                          <div className="text-left min-w-0">
                            <span className="text-xs sm:text-sm font-bold block text-slate-800 dark:text-slate-100 leading-tight">3. Снижение углеродных вредных выбросов</span>
                            <span className="text-[10px] text-slate-400 font-medium block leading-normal">Внедрение экологических систем фильтрации на заводах внутри МКАД.</span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {game5Toggle3 ? (
                            <span className="text-emerald-600 text-[10px] sm:text-xs font-bold bg-emerald-100 px-2.5 py-1 rounded">АКТИВНО</span>
                          ) : (
                            <span className="text-slate-400 text-[10px] sm:text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">ВЫКЛ</span>
                          )}
                        </div>
                      </button>
                    </div>

                    {game5Toggle1 && game5Toggle2 && game5Toggle3 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-4 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl font-bold text-xs"
                      >
                        🎉 Все KPI субсидирования выполнены! Вектор развития сбалансирован.
                      </motion.div>
                    )}

                    <div className="flex justify-center mt-3">
                      <button
                        onClick={() => {
                          if (game5Toggle1 && game5Toggle2 && game5Toggle3) {
                            handleCompleteActivity('game-5', 150, "Вектор Развития настроен! Получено 150 баллов.");
                            resetGameStates();
                          } else {
                            showToast("Пожалуйста, активируйте все 3 целевых переключателя (toggles) для достижения стратегической гармонии!", 0);
                          }
                        }}
                        className="px-5 py-2.5 bg-[#CC1111] hover:bg-[#A30E0E] text-white font-bold rounded-xl text-xs uppercase cursor-pointer"
                      >
                        Утвердить вектор
                      </button>
                    </div>

                  </div>
                )}

              </motion.div>
            )}

          </div>
        )}


        {/* ================== SUB-TAB 3: SPECIALS ================== */}
        {activeTab === 'specials' && (
          <div className="space-y-4">
            
            <div className="grid grid-cols-1 gap-4">
              
              {/* Special 1: local needs profile */}
              <div className={cn(
                "p-5 rounded-xl border transition-all",
                completedActivities.includes('special-1') 
                  ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-400" 
                  : "bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-[#334155]/60 text-slate-800 dark:text-[#f8fafc]"
              )}>
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase bg-[#CC1111]/10 text-[#CC1111] dark:bg-[#CC1111]/20 dark:text-red-400 px-2 py-0.5 rounded border border-[#CC1111]/15">Спецраздел 01</span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-[#f8fafc] mt-1">Учебный профиль потребностей</h3>
                    <p className="text-xs text-[#475569] dark:text-slate-300 font-medium leading-relaxed mt-0.5">
                      Познакомьтесь с принципом персонализации без ввода имени, возраста и других персональных данных.
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono text-[#CC1111] dark:text-red-400 shrink-0">+80 Б</span>
                </div>

                {completedActivities.includes('special-1') ? (
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-400 font-semibold rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle2 size={15} />
                    <span>Учебный сценарий пройден. Запросов во внешние государственные системы не выполнялось.</span>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      В рабочей версии роль можно выбирать вручную. Интеграция с Mos.ID — только возможное направление развития после согласований.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCompleteActivity('special-1', 80, "Учебный сценарий персонализации завершён без ввода персональных данных.")}
                      className="px-4 py-2 bg-[#CC1111] hover:bg-[#A30E0E] text-white font-bold rounded-lg text-xs uppercase cursor-pointer shrink-0"
                    >
                      Пройти сценарий
                    </button>
                  </div>
                )}
              </div>


              {/* Special 2: Fiscal Expert */}
              <div className={cn(
                "p-5 rounded-xl border transition-all",
                completedActivities.includes('special-2') 
                  ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-400" 
                  : "bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-[#334155]/60 text-slate-800 dark:text-[#f8fafc]"
              )}>
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase bg-[#CC1111]/10 text-[#CC1111] dark:bg-[#CC1111]/20 dark:text-red-400 px-2 py-0.5 rounded border border-[#CC1111]/15">Спецраздел 02</span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-[#f8fafc] mt-1">Фискальный Эксперт 3-НДФЛ</h3>
                    <p className="text-xs text-[#475569] dark:text-slate-300 font-medium leading-relaxed mt-0.5">
                      Предъявите расходы на обучение или спортивные секции объёмом более <span className="font-extrabold text-[#CC1111] dark:text-red-400">100 000 ₽</span> в год для подтверждения.
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono text-[#CC1111] dark:text-red-400 shrink-0">+120 Б</span>
                </div>

                {completedActivities.includes('special-2') ? (
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-400 font-semibold rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle2 size={15} />
                    <span>Учебный сценарий расчёта завершён. Во внешние системы ничего не отправлялось.</span>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Направление расходов:</span>
                      <span className="font-mono text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-md">
                        {spec2DeductionInput.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                    
                    <input 
                      type="range" min="0" max="250000" step="5000"
                      value={spec2DeductionInput}
                      onChange={(e) => setSpec2DeductionInput(Number(e.target.value))}
                      className="w-full accent-[#CC1111] h-1.5 bg-slate-200 dark:bg-slate-900 rounded appearance-none cursor-pointer"
                    />
                    
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => {
                          if (spec2DeductionInput >= 100000) {
                            handleCompleteActivity('special-2', 120, "Учебная фискальная миссия выполнена: задано более 100 000 ₽ расходов.");
                          } else {
                            showToast("Задайте расходы свыше 100 000 ₽ на ползунке!", 0);
                          }
                        }}
                        className="px-4 py-2 bg-slate-900 dark:bg-[#CC1111] hover:bg-slate-950 dark:hover:bg-[#A30E0E] text-white font-bold rounded-lg text-xs uppercase cursor-pointer"
                      >
                        Заявить лимит
                      </button>
                    </div>
                  </div>
                )}
              </div>


              {/* Special 3: Analytics Explorer */}
              <div className={cn(
                "p-5 rounded-xl border transition-all",
                completedActivities.includes('special-3') 
                  ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-400" 
                  : "bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-[#334155]/60 text-slate-800 dark:text-[#f8fafc]"
              )}>
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase bg-[#CC1111]/10 text-[#CC1111] dark:bg-[#CC1111]/20 dark:text-red-400 px-2 py-0.5 rounded border border-[#CC1111]/15">Спецраздел 03</span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-[#f8fafc] mt-1">Аналитический Сёрфинг Бюджета</h3>
                    <p className="text-xs text-[#475569] dark:text-slate-300 font-medium leading-relaxed mt-0.5">
                      Изучите направления столичного бюджета и выполните аналитическую проверку сфер здравоохранения и транспорта.
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono text-[#CC1111] dark:text-red-400 shrink-0">+100 Б</span>
                </div>

                {completedActivities.includes('special-3') ? (
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-400 font-semibold rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle2 size={15} />
                    <span>Аналитическое исследование пройдено. Баллы начислены.</span>
                  </div>
                ) : showSpec3Task ? (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Интерактивная панель исследования:</p>
                    
                    {/* Sector Tabs Selector */}
                    <div className="flex border-b border-slate-200 dark:border-slate-700">
                      {[
                        { id: 'health', label: '🏥 Здравоохранение', color: 'border-red-500' },
                        { id: 'transport', label: '🚇 Транспорт', color: 'border-blue-500' },
                        { id: 'education', label: '🏫 Образование', color: 'border-emerald-500' }
                      ].map(sec => (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => setActiveSpec3SubTab(sec.id as any)}
                          className={cn(
                            "flex-1 py-1.5 px-1 text-[11px] font-bold border-b-2 text-center transition-all cursor-pointer whitespace-nowrap",
                            activeSpec3SubTab === sec.id
                              ? `${sec.color} text-[#CC1111] dark:text-red-400 font-extrabold`
                              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          )}
                        >
                          {sec.label}
                        </button>
                      ))}
                    </div>

                    {/* Sector Description Box */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                      {activeSpec3SubTab === 'health' && (
                        <div>
                          <h4 className="font-extrabold text-[#CC1111] dark:text-red-400 mb-1 text-xs">Раздел: Столичное Здравоохранение (2026)</h4>
                          <p>
                            На программу развития здравоохранения Москвы в 2026 году предусмотрено <strong>615 млрд ₽</strong> без учёта оплаты медицинской помощи из Фонда ОМС. Детализацию мероприятий следует проверять на портале budget.mos.ru.
                          </p>
                        </div>
                      )}
                      {activeSpec3SubTab === 'transport' && (
                        <div>
                          <h4 className="font-extrabold text-blue-600 dark:text-blue-400 mb-1 text-xs">Раздел: Развитие Транспортной Системы (2026)</h4>
                          <p>
                            Транспортный сектор Москвы получает крупные инвестиции. Ведётся прокладка новых радиальных линий метрополитена (Троицкой и Рублево-Архангельской), а также расширение экологически чистого транспорта, снижающего выбросы вредных веществ.
                          </p>
                        </div>
                      )}
                      {activeSpec3SubTab === 'education' && (
                        <div>
                          <h4 className="font-extrabold text-emerald-600 dark:text-emerald-400 mb-1 text-xs">Раздел: Столичное Образование & МЭШ (2026)</h4>
                          <p>
                            В 2026 году продолжается массовый запуск проекта модернизации учебных заведений по единому московскому стандарту. За счёт расширения функционала цифрового облака <strong>«Московская Электронная Школа» (МЭШ)</strong> учащиеся получают доступ к интеллектуальным учебным помощникам.
                          </p>
                        </div>
                      )}

                      {/* Explore Checklist Trigger */}
                      <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase">
                            {spec3CheckedSectors.includes(activeSpec3SubTab) ? "✅ Сектор изучен" : "⚠️ Изучение не подтверждено"}
                          </span>
                          {!spec3CheckedSectors.includes(activeSpec3SubTab) && (
                            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                              Пожалуйста, внимательно ознакомьтесь с представленной информацией по данному направлению бюджета, прежде чем подтверждать изучение. 
                            </span>
                          )}
                        </div>
                        
                        {!spec3CheckedSectors.includes(activeSpec3SubTab) ? (
                          <button
                            type="button"
                            onClick={() => setSpec3CheckedSectors(p => [...p, activeSpec3SubTab])}
                            className="px-4 py-2 sm:py-1.5 w-full sm:w-auto shrink-0 text-xs font-extrabold text-white bg-slate-900 dark:bg-[#CC1111] hover:bg-[#CC1111] dark:hover:bg-[#A30E0E] rounded-lg transition-all cursor-pointer shadow-sm"
                          >
                            Подтвердить изучение сектора
                          </button>
                        ) : (
                          <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg animate-pop whitespace-nowrap">Изучение подтверждено</span>
                        )}
                      </div>
                    </div>

                    {/* All sectors completed check-in */}
                    {spec3CheckedSectors.length === 3 ? (
                      <div className="p-4 bg-[#FFFDF5] dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-900/60 rounded-xl space-y-4 animate-fade-in text-slate-900 dark:text-slate-300 mt-2 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500 text-lg">❓</span>
                          <span className="text-sm font-black uppercase text-amber-800 dark:text-amber-400">Контрольный Аналитический Опрос:</span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-200">
                          Вы успешно изучили ключевые направления расходования бюджета. Основываясь на аналитических данных, какая из столичных программ традиционно лидирует по общему объёму финансирования транспортной связности и капитальных инвестиций?
                        </p>
                        
                        <div className="flex flex-col gap-2">
                          {[
                            { id: 'opt_a', text: 'Развитие транспортной системы (метрополитен, МЦД, закупка электробусов)' },
                            { id: 'opt_b', text: 'Организация раздачи зонтиков у автобусных павильонов' },
                            { id: 'opt_c', text: 'Уличное декорирование фасадов под кубический Brutalism' }
                          ].map(opt => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setSpec3QuestionAnswer(opt.id)}
                              className={cn(
                                "text-left text-xs font-semibold px-3 py-2 border rounded-lg transition-all cursor-pointer",
                                spec3QuestionAnswer === opt.id
                                  ? "border-amber-400 bg-amber-100/60 text-amber-950 dark:bg-amber-950/40 dark:text-amber-300 border-amber-400"
                                  : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-300"
                              )}
                            >
                              {opt.id === 'opt_a' ? '🟢' : '⚪'} {opt.text}
                            </button>
                          ))}
                        </div>

                        {spec3QuestionAnswer === 'opt_a' ? (
                          <div className="p-3 border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-lg leading-relaxed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pop">
                            <span className="text-[13px]">✅ Абсолютно верно! Строительство новых станций метрополитена, закупка новейших электробусов и трамваев, а также внедрение Московских центральных диаметров (МЦД) исторически формируют самую значительную долю капитальных затрат бюджета города Москвы для обеспечения максимальной связности районов и повышения качества жизни горожан.</span>
                            <button
                              type="button"
                              onClick={() => {
                                handleCompleteActivity('special-3', 100, "Спецпроект Аналитический сёрфинг пройден! Вы изучили финансовые сводки и успешно подтвердили результаты.");
                                setShowSpec3Task(false);
                              }}
                              className="px-5 py-3 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] uppercase tracking-wide font-black rounded-xl flex justify-center items-center gap-2 select-none active:scale-95 cursor-pointer shadow-md transition-all shrink-0"
                            >
                              Получить +100 XP
                            </button>
                          </div>
                        ) : spec3QuestionAnswer && (
                          <div className="p-2 border border-red-300 bg-red-50 text-red-800 text-xs font-bold rounded-lg animate-fade-in">
                            ❌ Неверно. Предложенная сфера не относится к ключевым бюджетоемким статьям столицы на 2026 год.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-[10px] text-slate-400 dark:text-slate-500 italic font-semibold">
                        Изучите все 3 сектора (нажимая «Подтвердить изучение...» во всех 3-х вкладках), чтобы открыть зачётный вопрос ({spec3CheckedSectors.length} из 3)
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowSpec3Task(true)}
                      className="px-4 py-2 bg-[#CC1111] hover:bg-[#A30E0E] text-white font-bold rounded-lg text-xs uppercase cursor-pointer"
                    >
                      Изучить 3 сектора экономики
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}


        {/* ================== SUB-TAB 4: VIRTUAL MAYOR (👑) ================== */}
        {activeTab === 'mayor' && (() => {
          const d = MAYOR_DISTRICTS.find(x => x.id === selectedMayorDistrict) || MAYOR_DISTRICTS[0];
          const totalAllocated = mayorEducation + mayorTransport + mayorHealthcare;
          const deficitMln = Math.max(0, totalAllocated - d.budget);
          const deficitPercent = Math.min(100, Math.round((deficitMln / d.budget) * 100));
          
          // Calculate predictions in real-time
          let rawComfort = (mayorEducation * d.preferenceMultiplier.education) + 
                           (mayorTransport * d.preferenceMultiplier.transport) + 
                           (mayorHealthcare * d.preferenceMultiplier.healthcare);
          let residentComfort = Math.round((rawComfort / (d.budget * 1.45)) * 100);
          residentComfort = Math.min(100, Math.max(15, residentComfort));
          if (totalAllocated > d.budget * 1.15) {
            // Penalize comfort for excessive debt
            residentComfort = Math.max(10, residentComfort - Math.round((totalAllocated - d.budget * 1.15) * 0.7));
          }

          let rawEcon = (mayorTransport * 1.4 + mayorEducation * 1.0 + Math.max(0, d.budget - totalAllocated) * 0.5);
          let economicEfficiency = Math.round((rawEcon / (d.budget * 1.35)) * 100);
          economicEfficiency = Math.min(100, Math.max(10, economicEfficiency));
          if (totalAllocated > d.budget * 1.1) {
            economicEfficiency = Math.max(10, economicEfficiency - Math.round((totalAllocated - d.budget * 1.1) * 0.9));
          }

          const budgetStatus = totalAllocated <= d.budget 
            ? 'perfect' 
            : totalAllocated <= d.budget * 1.08 
              ? 'warning' 
              : 'deficit_danger';

          const runSimForecast = () => {
            let statusText = '';
            let isWin = false;

            if (budgetStatus === 'deficit_danger') {
              statusText = `В учебной модели дефицит слишком высок (${deficitPercent}%). Перераспределите условные средства и повторите расчёт.`;
            } else if (residentComfort < 55) {
              statusText = `Бюджет сбалансирован, но условный индекс комфорта снизился до ${residentComfort}%. Повысьте финансирование дефицитных направлений.`;
            } else {
              isWin = true;
              statusText = `Симуляция для района ${d.name} успешно пройдена: учтён приоритет «${d.primaryDemand}» и сохранён баланс условных средств.`;
            }

            setSimulationReport({
              residentComfort,
              economicEfficiency,
              budgetDeficit: deficitPercent,
              deficitMln,
              status: budgetStatus,
              summaryMsg: statusText,
              unlockedNft: isWin ? d.id : undefined
            });

            // If win, unlock the NFT card persistently!
            if (isWin) {
              if (!unlockedNfts.includes(d.id)) {
                setUnlockedNfts(prev => [...prev, d.id]);
              }
              const rewardKey = 'mayor-success-' + d.id;
              if (!completedActivities.includes(rewardKey)) {
                handleCompleteActivity(rewardKey, 150, `Учебный сценарий района ${d.name} успешно сбалансирован. Получена коллекционная карточка.`);
              } else {
                showToast(`Проведена успешная симуляция для района ${d.name}!`, 20);
              }
            }
          };

          return (
            <div className="space-y-6" id="mayor_simulator_panel">
              {/* Promo Banner */}
              <div className="bg-linear-to-r from-slate-900 to-slate-800 p-6 rounded-2xl border border-white/5 text-white flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 uppercase font-bold tracking-wider text-[9px] bg-[#CC1111] text-white px-2.5 py-1 rounded">
                    👑 Симулятор государственного управления
                  </span>
                  <h3 className="text-lg font-black tracking-tight mt-1">Виртуальный Мэр Москвы</h3>
                  <p className="text-slate-300 text-xs font-medium leading-relaxed max-w-2xl">
                    Управляйте финансами столичных районов в роли Мэра! Выберите административный округ и распределите целевые средства по ключевым госпрограммам. Цель — максимизировать индекс комфорта жителей и инвестиционную привлекательность, уложившись в установленный годовой лимит.
                  </p>
                </div>
                <div className="bg-white dark:bg-[#1e293b]/10 p-3 rounded-2xl border border-white/10 shrink-0 text-amber-300 text-3xl animate-bounce">
                  👑
                </div>
              </div>

              {/* Core Simulator Workspace */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Column Left (ID: 7): Parameters Selection & Sliders */}
                <div className="lg:col-span-7 bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 space-y-6">
                  
                  {/* District Selection Tabs */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-[#CC1111] uppercase tracking-wider block">1. Выбор района управления</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {MAYOR_DISTRICTS.map((item) => (
                        <button
                          key={item.id}
                          id={`btn_mayor_dst_${item.id}`}
                          onClick={() => {
                            setSelectedMayorDistrict(item.id);
                            setSimulationReport(null);
                          }}
                          className={cn(
                            "py-2 px-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer",
                            selectedMayorDistrict === item.id
                              ? "bg-slate-900 border-slate-900 text-white shadow-md scale-[1.03]"
                              : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800"
                          )}
                        >
                          <span className="text-base leading-none">{item.coatOfArms}</span>
                          <span className="truncate w-full text-center text-[10px] sm:text-xxs">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Choosen District Context Card */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50/60 relative overflow-hidden">
                    <div className="absolute top-1.5 right-2 px-1 rounded bg-slate-200/50 text-[7px] font-mono font-black text-slate-500 uppercase tracking-widest leading-none py-0.5">ID: {d.id.toUpperCase()}-2026</div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-1.5 sm:mt-0">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <span className="text-2xl shrink-0 p-2.5 bg-white dark:bg-[#1e293b] rounded-xl border shadow-xs leading-none">{d.coatOfArms}</span>
                        <div className="sm:hidden flex-1 min-w-0">
                          <span className="text-[9px] uppercase font-black tracking-wider text-[#CC1111] leading-none block">Паспорт района</span>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate leading-snug">Район {d.name}</h4>
                        </div>
                      </div>
                      
                      <div className="min-w-0 flex-1 w-full space-y-1">
                        <h4 className="hidden sm:flex items-center justify-between gap-3 font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                          <span>Администрирование: Район {d.name}</span>
                          <span className="text-[10px] font-black text-[#CC1111] bg-[#CC1111]/10 px-2.5 py-0.5 rounded border border-[#CC1111]/10 shrink-0 font-mono">
                            Лимит {d.budget} млн ₽
                          </span>
                        </h4>

                        <div className="sm:hidden flex items-center justify-between gap-2 bg-white dark:bg-[#1e293b]/80 p-2 rounded-lg border border-slate-100/80">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Лимит бюджета:</span>
                          <span className="text-xs font-black text-[#CC1111] font-mono">{d.budget} млн ₽</span>
                        </div>
                        
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{d.description}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-700/50/85 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                      <div className="bg-white dark:bg-[#1e293b]/85 p-3 rounded-xl border border-slate-100">
                        <span className="text-slate-400 font-bold uppercase block text-[8px] tracking-wider mb-0.5">Главный запрос жителей</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-xs leading-normal block">{d.primaryDemand}</span>
                      </div>
                      <div className="bg-white dark:bg-[#1e293b]/85 p-3 rounded-xl border border-slate-100">
                        <span className="text-slate-400 font-bold uppercase block text-[8px] tracking-wider mb-0.5">Основной проект-хорда</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-xs leading-normal block">{d.mainProject}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sliders allocation mechanism */}
                  <div className="space-y-5">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <label className="text-[10px] font-extrabold text-[#CC1111] uppercase tracking-wider">
                        2. Распределение субсидий (млн руб.)
                      </label>
                      <span className="text-xxs font-bold text-slate-400">Минимум: 5 млн, Максимум: 100 млн на сферу</span>
                    </div>

                    {/* Slider 1: Education */}
                    <div className="space-y-1.5" id="slider_group_education">
                      <div className="flex justify-between items-center font-bold text-xs text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <span>🎒</span>
                          <span>Новый стандарт образования (школы)</span>
                        </span>
                        <span className="font-mono text-[#CC1111] bg-[#CC1111]/5 border border-[#CC1111]/10 px-2.5 py-0.5 rounded-lg text-xs">
                          {mayorEducation} млн ₽
                        </span>
                      </div>
                      <input 
                        type="range" min="5" max="100" step="5"
                        value={mayorEducation}
                        onChange={(e) => {
                          setMayorEducation(Number(e.target.value));
                          setSimulationReport(null);
                        }}
                        className="w-full accent-[#CC1111] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer"
                      />
                      <p className="text-[9px] text-slate-400 font-medium">Множитель удовлетворенности района: <strong className="text-slate-600 font-bold">x{d.preferenceMultiplier.education}</strong></p>
                    </div>

                    {/* Slider 2: Transport */}
                    <div className="space-y-1.5" id="slider_group_transport">
                      <div className="flex justify-between items-center font-bold text-xs text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <span>🚇</span>
                          <span>Электробусы и развязки ТПУ</span>
                        </span>
                        <span className="font-mono text-[#CC1111] bg-[#CC1111]/5 border border-[#CC1111]/10 px-2.5 py-0.5 rounded-lg text-xs">
                          {mayorTransport} млн ₽
                        </span>
                      </div>
                      <input 
                        type="range" min="5" max="100" step="5"
                        value={mayorTransport}
                        onChange={(e) => {
                          setMayorTransport(Number(e.target.value));
                          setSimulationReport(null);
                        }}
                        className="w-full accent-[#CC1111] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer"
                      />
                      <p className="text-[9px] text-slate-400 font-medium">Множитель удовлетворенности района: <strong className="text-slate-600 font-bold">x{d.preferenceMultiplier.transport}</strong></p>
                    </div>

                    {/* Slider 3: Healthcare */}
                    <div className="space-y-1.5" id="slider_group_health">
                      <div className="flex justify-between items-center font-bold text-xs text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <span>🏥</span>
                          <span>Поликлиники, Спорт и Мой Район</span>
                        </span>
                        <span className="font-mono text-[#CC1111] bg-[#CC1111]/5 border border-[#CC1111]/10 px-2.5 py-0.5 rounded-lg text-xs">
                          {mayorHealthcare} млн ₽
                        </span>
                      </div>
                      <input 
                        type="range" min="5" max="100" step="5"
                        value={mayorHealthcare}
                        onChange={(e) => {
                          setMayorHealthcare(Number(e.target.value));
                          setSimulationReport(null);
                        }}
                        className="w-full accent-[#CC1111] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer"
                      />
                      <p className="text-[9px] text-slate-400 font-medium">Множитель удовлетворенности района: <strong className="text-slate-600 font-bold">x{d.preferenceMultiplier.healthcare}</strong></p>
                    </div>

                  </div>

                </div>

                {/* Column Right (ID: 5) - Real-Time Dashboard & Gauges & Simulate button */}
                <div className="lg:col-span-5 flex flex-col gap-6">

                  {/* Real-time Indicator Gauges */}
                  <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-4">
                        3. Индикаторы моделирования бюджета
                      </h4>

                      <div className="space-y-4">
                        
                        {/* Gauge 1: Comfort */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>Индекс комфорта жителей районного округа</span>
                            <span className={cn(
                              "font-mono font-black",
                              residentComfort >= 70 ? "text-emerald-600" : residentComfort >= 50 ? "text-amber-600" : "text-rose-600"
                            )}>{residentComfort}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all duration-300 rounded-full",
                                residentComfort >= 70 ? "bg-emerald-500" : residentComfort >= 50 ? "bg-amber-500" : "bg-rose-500"
                              )}
                              style={{ width: `${residentComfort}%` }}
                            />
                          </div>
                          <span className="text-[8px] text-slate-400 font-semibold leading-none">Удовлетворенность зависит от целевого профиля и лоббизма жителей</span>
                        </div>

                        {/* Gauge 2: Economic Efficiency */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>Коэффициент экономической эффективности</span>
                            <span className={cn(
                              "font-mono font-black",
                              economicEfficiency >= 70 ? "text-emerald-600" : economicEfficiency >= 45 ? "text-amber-600" : "text-rose-600"
                            )}>{economicEfficiency}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all duration-300 rounded-full",
                                economicEfficiency >= 70 ? "bg-indigo-500" : economicEfficiency >= 45 ? "bg-amber-500" : "bg-rose-500"
                              )}
                              style={{ width: `${economicEfficiency}%` }}
                            />
                          </div>
                          <span className="text-[8px] text-slate-400 font-semibold leading-none">Стимулируется развитием транспортно-пересадочных узлов ТПУ и профицитом</span>
                        </div>

                        {/* Gauge 3: Budget Balance Bar */}
                        <div className="p-3.5 rounded-xl border border-slate-100 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700">Общие расходы:</span>
                            <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">{totalAllocated} млн / {d.budget} млн ₽</span>
                          </div>
                          
                          {totalAllocated <= d.budget ? (
                            <div className="p-2 bg-emerald-500/10 border border-emerald-500/15 rounded text-emerald-800 text-[10px] font-bold flex items-center gap-1.5 leading-none">
                              <span className="text-emerald-600 font-black text-sm">✓</span>
                              <span>Укладываетесь в лимит. Профицит: <strong className="font-mono">{d.budget - totalAllocated} млн ₽</strong></span>
                            </div>
                          ) : budgetStatus === 'warning' ? (
                            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-amber-800 text-[10px] font-bold flex items-center gap-1.5 leading-none">
                              <span className="text-amber-600 font-black text-xs">⚠</span>
                              <span>Допустимый дефицит: <strong className="font-mono">+{deficitMln} млн ₽ ({deficitPercent}%)</strong></span>
                            </div>
                          ) : (
                            <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded text-rose-800 text-[10px] font-bold flex items-center gap-1.5 leading-none">
                              <span className="text-rose-600 font-black text-xs">🛑</span>
                              <span>Критический дефицит! Бюджет отклонен ФКУ на <strong className="font-mono">{deficitMln} млн ₽</strong></span>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>

                    {/* Launch projection simulation action */}
                    <button
                      id="btn_trigger_mayor_forecast"
                      onClick={runSimForecast}
                      className={cn(
                        "w-full py-3.5 rounded-xl text-xs font-black uppercase text-white shadow-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2",
                        budgetStatus === 'deficit_danger' 
                          ? "bg-slate-400 hover:bg-slate-50 dark:bg-slate-800/500" 
                          : "bg-gradient-to-r from-[#CC1111] to-[#E11D48] hover:scale-[1.01] hover:shadow-md"
                      )}
                    >
                      <span>🔄</span>
                      <span>Провести заседание & Утвердить Бюджет Закон</span>
                    </button>
                  </div>

                </div>

              </div>

              {/* Simulation Result Report overlay/modal block */}
              <AnimatePresence>
                {simulationReport && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 10 }}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50/80 bg-[#1E293B] text-white shadow-2xl relative overflow-hidden"
                    id="sim_report_canvas"
                  >
                    <div className="absolute top-0 right-0 w-80 h-full bg-radial from-slate-800/80 to-transparent pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-white/10 relative z-10">
                      <div>
                        <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">Заключение Контрольно-Счётной Палаты Москвы</span>
                        <h4 className="text-base font-extrabold text-white mt-0.5">Экспертный отчёт по проекту бюджета округа {d.name}</h4>
                      </div>
                      <div className="shrink-0 flex gap-2">
                        {simulationReport.unlockedNft ? (
                          <span className="bg-emerald-500/20 text-emerald-400 font-black text-[10px] border border-emerald-500/30 py-1 px-3 rounded-lg leading-tight">
                            ✓ УСПЕШНО ОДОБРЕНО
                          </span>
                        ) : (
                          <span className="bg-rose-500/20 text-rose-400 font-black text-[10px] border border-rose-500/30 py-1 px-3 rounded-lg leading-tight">
                            ✗ ОТКЛОНЕНО МЭРИЕЙ
                          </span>
                        )}
                        <button 
                          onClick={() => setSimulationReport(null)}
                          className="text-white/40 hover:text-white/80 font-bold bg-white dark:bg-[#1e293b]/10 hover:bg-white dark:bg-[#1e293b]/15 px-2 py-1 rounded text-xs select-none cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-4 relative z-10">
                      
                      {/* Report details summary message */}
                      <div className="md:col-span-8 space-y-3">
                        <p className={cn(
                          "text-xs font-semibold leading-relaxed p-3.5 rounded-xl border",
                          simulationReport.unlockedNft 
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-100" 
                            : "bg-rose-500/10 border-rose-500/20 text-rose-100"
                        )}>
                          {simulationReport.summaryMsg}
                        </p>

                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="p-3 bg-slate-800/80 rounded-xl border border-white/5">
                            <span className="block text-slate-400 text-[8px] uppercase font-bold">Комфорт жителей</span>
                            <span className="text-sm font-black text-amber-300">{simulationReport.residentComfort}%</span>
                          </div>
                          <div className="p-3 bg-slate-800/80 rounded-xl border border-white/5">
                            <span className="block text-slate-400 text-[8px] uppercase font-bold">Эффективность</span>
                            <span className="text-sm font-black text-emerald-400">{simulationReport.economicEfficiency}%</span>
                          </div>
                          <div className="p-3 bg-slate-800/80 rounded-xl border border-white/5">
                            <span className="block text-slate-400 text-[8px] uppercase font-bold">Дефицит бюджета</span>
                            <span className="text-sm font-black text-rose-400">{simulationReport.budgetDeficit}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Collectible district premium card preview */}
                      <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-900/60 rounded-xl border border-white/10 text-center">
                        {simulationReport.unlockedNft ? (
                          <div className="space-y-2 group">
                            <div className="w-16 h-20 bg-linear-to-b from-amber-500/20 via-slate-800 to-black rounded-lg border border-amber-500/50 shadow-lg mx-auto flex flex-col items-center justify-center p-1 relative overflow-hidden animate-pulse">
                              <span className="text-2xl">{d.coatOfArms}</span>
                              <span className="text-[7px] text-amber-300 font-extrabold uppercase mt-1 tracking-wider">ЗНАК ОТКРЫТ</span>
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-white">Успех! Получено:</p>
                              <p className="text-[10px] font-bold text-amber-400 leading-tight">Знак: «Инвестор {d.name}»</p>
                              <span className="text-[9px] text-emerald-400 font-bold font-mono">+150 XP & +150 Б</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5 opacity-45">
                            <span className="text-3xl block filter grayscale">🔒</span>
                            <p className="text-[10px] text-slate-400 font-bold leading-tight">Наградной знак закрыт</p>
                            <p className="text-[8px] text-slate-500 leading-none">Сбалансируйте годовой бюджет района до нормы дефицита (до 8%)!</p>
                          </div>
                        )}
                      </div>

                    </div>

                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          );
        })()}


        {/* ================== SUB-TAB 5: CITY FINANCIAL MAP (🗺️) ================== */}
        {activeTab === 'map' && (() => {
          const activeMapDistrict = MAYOR_DISTRICTS.find(x => x.id === selectedMapDistrictId) || MAYOR_DISTRICTS[0];

          return (
            <div className="space-y-6" id="city_budget_map_panel">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50/60 text-xs">
                <span className="font-extrabold text-[#CC1111] uppercase select-none block text-[10px] tracking-wider">🗺️ Мониторинг Финансовых Округов Москвы</span>
                <p className="text-[#475569] font-medium leading-relaxed max-w-4xl mt-0.5">
                  Нажмите на округ, чтобы открыть демонстрационный сценарий. Значения на карте условные и не являются официальной районной статистикой.
                </p>
              </div>

              {/* Map Layout Workspace */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Column Left (ID: 6) - SVG Map Canvas */}
                <div className="lg:col-span-7 bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 flex flex-col justify-between items-center min-h-[380px]">
                  <div className="w-full flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100">Интерактивный картографический макет ОЭЗ</span>
                    <span className="text-[10px] font-bold text-slate-400">Нажмите на любой узел района</span>
                  </div>

                  {/* HIGH FIDELITY GEOMETRIC INTERACTIVE SVG MAP OF MOSCOW DISTRICTS */}
                  <svg 
                    viewBox="0 0 540 400" 
                    className="w-full max-w-[460px] h-auto drop-shadow-md select-none"
                    id="moscow_svg_canvas"
                  >
                    {/* Background Grid */}
                    <g opacity="0.3">
                      <line x1="50" y1="0" x2="50" y2="400" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="5,5" />
                      <line x1="150" y1="0" x2="150" y2="400" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="5,5" />
                      <line x1="250" y1="0" x2="250" y2="400" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="5,5" />
                      <line x1="350" y1="0" x2="350" y2="400" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="5,5" />
                      <line x1="450" y1="0" x2="450" y2="400" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="5,5" />
                      <line x1="0" y1="100" x2="540" y2="100" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="5,5" />
                      <line x1="0" y1="200" x2="540" y2="200" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="5,5" />
                      <line x1="0" y1="300" x2="540" y2="300" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="5,5" />
                    </g>

                    {/* SVG PATHS / POLYGONS DEFINITION FOR DISTRICTS */}
                    {/* 1. Тверской - Центральный округ */}
                    <path
                      d="M210,150 L310,150 L310,210 L210,210 Z"
                      fill={selectedMapDistrictId === 'tverskoy' ? '#CC1111' : '#F1F5F9'}
                      stroke={selectedMapDistrictId === 'tverskoy' ? '#8C0B0B' : '#CBD5E1'}
                      strokeWidth={selectedMapDistrictId === 'tverskoy' ? '3.5' : '1.5'}
                      className="transition-all duration-300 cursor-pointer hover:opacity-85"
                      onClick={() => setSelectedMapDistrictId('tverskoy')}
                    />
                    <text x="260" y="185" fill={selectedMapDistrictId === 'tverskoy' ? '#FFFFFF' : '#475569'} fontSize="10" fontWeight="900" textAnchor="middle" className="pointer-events-none select-none font-sans">
                      Тверской (ЦАО)
                    </text>

                    {/* 2. Хамовники - Юго-Западный узел */}
                    <path
                      d="M130,225 L205,212 L245,280 L170,300 Z"
                      fill={selectedMapDistrictId === 'hamovniki' ? '#CC1111' : '#F1F5F9'}
                      stroke={selectedMapDistrictId === 'hamovniki' ? '#8C0B0B' : '#CBD5E1'}
                      strokeWidth={selectedMapDistrictId === 'hamovniki' ? '3.5' : '1.5'}
                      className="transition-all duration-300 cursor-pointer hover:opacity-85"
                      onClick={() => setSelectedMapDistrictId('hamovniki')}
                    />
                    <text x="185" y="255" fill={selectedMapDistrictId === 'hamovniki' ? '#FFFFFF' : '#475569'} fontSize="10" fontWeight="900" textAnchor="middle" className="pointer-events-none select-none font-sans">
                      Хамовники
                    </text>

                    {/* 3. Сокольники - Северо-Восток/Восток */}
                    <path
                      d="M315,100 L415,70 L435,145 L315,145 Z"
                      fill={selectedMapDistrictId === 'sokolniki' ? '#CC1111' : '#F1F5F9'}
                      stroke={selectedMapDistrictId === 'sokolniki' ? '#8C0B0B' : '#CBD5E1'}
                      strokeWidth={selectedMapDistrictId === 'sokolniki' ? '3.5' : '1.5'}
                      className="transition-all duration-300 cursor-pointer hover:opacity-85"
                      onClick={() => setSelectedMapDistrictId('sokolniki')}
                    />
                    <text x="370" y="120" fill={selectedMapDistrictId === 'sokolniki' ? '#FFFFFF' : '#475569'} fontSize="10" fontWeight="900" textAnchor="middle" className="pointer-events-none select-none font-sans">
                      Сокольники
                    </text>

                    {/* 4. Крылатское - Западный узел */}
                    <path
                      d="M60,110 L195,110 L185,195 L65,170 Z"
                      fill={selectedMapDistrictId === 'krylatskoe' ? '#CC1111' : '#F1F5F9'}
                      stroke={selectedMapDistrictId === 'krylatskoe' ? '#8C0B0B' : '#CBD5E1'}
                      strokeWidth={selectedMapDistrictId === 'krylatskoe' ? '3.5' : '1.5'}
                      className="transition-all duration-300 cursor-pointer hover:opacity-85"
                      onClick={() => setSelectedMapDistrictId('krylatskoe')}
                    />
                    <text x="130" y="145" fill={selectedMapDistrictId === 'krylatskoe' ? '#FFFFFF' : '#475569'} fontSize="10" fontWeight="900" textAnchor="middle" className="pointer-events-none select-none font-sans">
                      Крылатское
                    </text>

                    {/* 5. Выхино-Жулебино - Юго-Восток */}
                    <path
                      d="M315,215 L435,215 L460,310 L350,315 Z"
                      fill={selectedMapDistrictId === 'vyhino' ? '#CC1111' : '#F1F5F9'}
                      stroke={selectedMapDistrictId === 'vyhino' ? '#8C0B0B' : '#CBD5E1'}
                      strokeWidth={selectedMapDistrictId === 'vyhino' ? '3.5' : '1.5'}
                      className="transition-all duration-300 cursor-pointer hover:opacity-85"
                      onClick={() => setSelectedMapDistrictId('vyhino')}
                    />
                    <text x="390" y="270" fill={selectedMapDistrictId === 'vyhino' ? '#FFFFFF' : '#475569'} fontSize="10" fontWeight="900" textAnchor="middle" className="pointer-events-none select-none font-sans">
                      Выхино (ЮВАО)
                    </text>

                    {/* Custom title labels */}
                    <text x="270" y="30" fill="#0F172A" fontSize="13" fontWeight="900" textAnchor="middle" className="font-sans select-none pointer-events-none">
                      СХЕМАТИЧЕСКАЯ ФИНАНСОВАЯ КАРТА ГОРОДА МОСКВЫ
                    </text>
                  </svg>

                  <div className="text-[10px] text-slate-400 font-medium italic mt-2 text-center">
                    Округа окрашиваются в <strong className="text-[#CC1111] font-bold">красный</strong> при активном фокусе. Нажмите на любой район на схеме, чтобы изучить сводки по нему.
                  </div>
                </div>

                {/* Column Right (ID: 5) - Selected District Stats & Actions */}
                <div className="lg:col-span-5 bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 flex flex-col justify-between">
                  <div className="space-y-4">
                    
                    {/* Header profile of chosen district */}
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <span className="text-3xl p-2.5 bg-slate-50 dark:bg-slate-800/50 border rounded-xl shadow-xs">{activeMapDistrict.coatOfArms}</span>
                      <div>
                        <span className="text-[9px] uppercase font-black text-[#CC1111] block tracking-wide">Паспорт Района Москвы 2026</span>
                        <h4 className="text-base font-extrabold text-[#0F172A] dark:text-slate-100 leading-tight">Район {activeMapDistrict.name}</h4>
                      </div>
                    </div>

                    {/* Numerical indicators */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 rounded-xl">
                        <span className="text-[8px] uppercase font-bold text-slate-400 block mb-0.5">Бюджет лимит</span>
                        <span className="text-xs font-black font-mono text-slate-900 dark:text-slate-100">{activeMapDistrict.budget} млн ₽</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 rounded-xl">
                        <span className="text-[8px] uppercase font-bold text-slate-400 block mb-0.5">Сборы НДФЛ в год</span>
                        <span className="text-xs font-black font-mono text-emerald-600">{activeMapDistrict.revenueFromNdfMln} млн ₽</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 rounded-xl">
                        <span className="text-[8px] uppercase font-bold text-slate-400 block mb-0.5">Безработица</span>
                        <span className="text-xs font-black font-mono text-slate-900 dark:text-slate-100">{activeMapDistrict.unemploymentRate}</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 rounded-xl">
                        <span className="text-[8px] uppercase font-bold text-slate-400 block mb-0.5">Статус знака отличия</span>
                        <span className="text-xs font-extrabold text-[#CC1111] flex items-center gap-1">
                          {unlockedNfts.includes(activeMapDistrict.id) ? (
                            <span className="text-emerald-500 font-black">ЗНАК ОТКРЫТ</span>
                          ) : (
                            <span className="text-slate-400">ЗНАК ЗАКРЫТ</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Main target program text blocks */}
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <div className="bg-slate-50 dark:bg-slate-800/50/60 p-2.5 rounded-lg border border-slate-100/50">
                        <span className="text-slate-400 font-extrabold uppercase block text-[8px] tracking-wider">Главный запрос жителей округа:</span>
                        <p className="font-extrabold text-slate-800 dark:text-slate-100 text-xs mt-1 leading-snug">{activeMapDistrict.primaryDemand}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50/60 p-2.5 rounded-lg border border-slate-100/50">
                        <span className="text-slate-400 font-extrabold uppercase block text-[8px] tracking-wider">Стратегический проект-реновация:</span>
                        <p className="font-extrabold text-slate-800 dark:text-slate-100 text-xs mt-1 leading-snug">{activeMapDistrict.mainProject}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50/60 p-2.5 rounded-lg border border-slate-100/50">
                        <span className="text-slate-400 font-extrabold uppercase block text-[8px] tracking-wider">Исторический профиль:</span>
                        <p className="font-medium text-slate-600 text-xs mt-1 leading-relaxed">{activeMapDistrict.description}</p>
                      </div>
                    </div>

                  </div>

                  {/* Quick Action Button - Link to Virtual Mayor */}
                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <button
                      id="btn_map_transition_to_mayor"
                      onClick={() => {
                        setSelectedMayorDistrict(activeMapDistrict.id);
                        setSimulationReport(null);
                        setActiveTab('mayor');
                      }}
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xxs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all hover:shadow-md"
                    >
                      <span>👑 Принять финансовое управление районом {activeMapDistrict.name}</span>
                      <span>→</span>
                    </button>
                  </div>

                </div>

              </div>

            </div>
          );
        })()}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ================== BOTTOM SECTION: LOCAL BUDGET REFERENCE ================== */}
      <div className="mt-8 pt-6 border-t border-[#E2E8F0] dark:border-[#334155]/60 space-y-4" id="budget_ai_assistant">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#CC1111]/10 text-[#CC1111] p-1.5 rounded-lg border border-[#CC1111]/15">
              <Bot size={18} className="stroke-[2.5px]" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#0F172A] dark:text-white tracking-tight flex items-center gap-1.5">
                <span>Интерактивный бюджетный справочник</span>
                <span className="text-[9px] font-extrabold uppercase bg-[#CC1111]/15 text-[#CC1111] px-1.5 py-0.5 rounded leading-none select-none">Локальная база</span>
                <span 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-amber-400 cursor-help text-[11px] font-bold select-none shrink-0"
                  title="Подготовленные ответы; не официальный консультант и не генеративный ИИ"
                >
                  ⓘ
                </span>
              </h3>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={() => {
              const freshHistory = [
                {
                  id: 'welcome',
                  sender: 'ai' as const,
                  text: "Привет! Это интерактивный справочник конкурсного прототипа. Он отвечает по заранее подготовленным темам и не является официальным консультантом. Напишите **«викторина»**, чтобы запустить учебный квиз дня.",
                  timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                }
              ];
              setChatHistory(freshHistory);
              safeLocalStorage.setItem('mos_ai_chat_history', JSON.stringify(freshHistory));
            }}
            className="text-[10px] font-bold text-slate-400 hover:text-red-700 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:border-red-200 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md transition cursor-pointer select-none"
          >
            Очистить диалог
          </button>
        </div>

        {/* Integrated Chat Panel with Sticky Bottom Input Bar (P1-7 / Audit) */}
        <div className="border border-[#E2E8F0] dark:border-[#334155]/60 bg-[#FAFAFA] dark:bg-slate-900/40 rounded-2xl flex flex-col h-[350px] overflow-hidden shadow-xs">
          
          {/* Scrollable Chat Messages Layer */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 h-full no-scrollbar">
            {chatHistory.map((msg) => {
              const isAI = msg.sender === 'ai';
              return (
                <div 
                  key={msg.id}
                  className={cn(
                    "flex gap-2.5 max-w-[85%] md:max-w-[75%]",
                    isAI ? "self-start" : "self-end flex-row-reverse"
                  )}
                >
                  {/* Avatar Icon */}
                  <div 
                    className={cn(
                      "w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs select-none",
                      isAI ? "bg-[#0F172A] text-white" : "bg-red-100 text-[#CC1111] border border-red-200"
                    )}
                  >
                    {isAI ? <Bot size={13} /> : <UserIcon size={13} />}
                  </div>

                  {/* Bubble */}
                  <div className="space-y-1 min-w-0">
                    <div 
                      className={cn(
                        "p-3 rounded-xl text-xs font-semibold leading-relaxed shadow-xs border break-words",
                        isAI 
                          ? "bg-[#0F172A] text-white border-neutral-800 rounded-tl-none whitespace-pre-wrap animate-pop" 
                          : "bg-white dark:bg-[#1e293b] text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700/50 rounded-tr-none animate-pop"
                      )}
                    >
                      {msg.text.split('\n').map((line, lIdx) => (
                        <p key={lIdx} className={cn(lIdx > 0 ? "mt-1.5" : "")}>
                          {line.split('**').map((part, pIdx) => {
                            const isBold = pIdx % 2 === 1;
                            return isBold ? (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => submitDashboardQuery(part)}
                                className="inline-block text-amber-400 hover:text-amber-300 font-extrabold hover:underline underline-offset-2 cursor-pointer transition-all duration-150 text-left active:scale-95 bg-transparent dark:text-white border-none p-0 mx-0.5"
                                title={`Спросить про "${part}"`}
                              >
                                {part}
                              </button>
                            ) : part;
                          })}
                        </p>
                      ))}

                      {/* Active Quiz Card for launching dynamically */}
                      {isAI && msg.quiz && (
                        <div className="mt-3.5 pt-3 border-t border-neutral-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-900/40 p-3 rounded-lg border border-neutral-800">
                          <div className="text-left shrink-0">
                            <span className="text-[9px] uppercase font-bold text-amber-400 block tracking-tight">Доступно учебное испытание</span>
                            <span className="text-[11px] font-extrabold text-white block leading-none mt-0.5">{msg.quiz.title}</span>
                            <span className="text-[10px] text-neutral-400 mt-0.5 block">Тема: {msg.quiz.topic}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (msg.quiz) {
                                startQuiz(msg.quiz);
                                const element = document.getElementById('mos_game_center');
                                element?.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-[#CC1111] hover:bg-[#A30E0E] text-white font-extrabold text-[11px] rounded-lg shadow-xs select-none hover:scale-105 transition duration-150 cursor-pointer text-center whitespace-nowrap uppercase leading-none"
                          >
                            Принять вызов (+150 Б)
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 block px-1 text-right">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2.5 max-w-[75%] self-start animate-pulse">
                <div className="w-7 h-7 rounded-lg bg-[#0F172A] text-white flex items-center justify-center text-xs shrink-0 select-none">
                  <Bot size={13} />
                </div>
                <div className="bg-[#0F172A] text-white border border-neutral-800 p-3.5 rounded-xl rounded-tl-none font-bold text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Scollable Preset Topics Row (User Request) */}
          <div className="px-3 py-2 bg-slate-100 dark:bg-slate-950 border-t border-[#E2E8F0] dark:border-neutral-800 shrink-0">
            <div className="text-[9px] uppercase font-bold text-[#475569] dark:text-slate-400 tracking-wider mb-1.5 px-0.5">Выберите тему ответа:</div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
              {[
                { label: '🤖 Начать Экскурсию с Фини', q: 'экскурсия' },
                { label: '📊 Доходы и Налоги', q: 'доход налог ндфл' },
                { label: '🚇 Метро и Транспорт', q: 'транспорт метро электробус' },
                { label: '🏥 Медицина и ЕМИАС', q: 'медицина емиас лекарства' },
                { label: '🏫 Школы и Образование', q: 'школа образование мэш' },
                { label: '⚙️ Промышленность & Субсидии', q: 'промышленность субсидии' },
                { label: '👨‍👩‍👦 Социальная поддержка', q: 'социальная доплаты льготы' },
                { label: '🎮 Пройти Викторину', q: 'викторина' },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => submitDashboardQuery(chip.q)}
                  className="px-2.5 py-1 text-[10px] font-bold bg-white dark:bg-[#1e293b] hover:bg-[#CC1111] hover:text-white dark:hover:bg-[#CC1111] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[rgba(255,255,255,0.06)] rounded-full whitespace-nowrap transition-all cursor-pointer select-none active:scale-95 leading-none"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sticky Bottom Form bar */}
          <div className="p-3 border-t border-[#E2E8F0] dark:border-[#334155]/60 bg-white dark:bg-slate-900 shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input 
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Задайте вопрос о бюджете Москвы (доходы, налоги, метро, медицина, образование)..."
                className="flex-1 text-base md:text-xs font-semibold p-2.5 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[#CC1111]/70 dark:focus:border-amber-500 rounded-xl outline-none bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white min-w-0"
              />
              <button 
                type="submit"
                disabled={!inputMessage.trim()}
                className={cn(
                  "px-4 rounded-xl shadow-xs transition duration-150 flex items-center justify-center cursor-pointer select-none",
                  inputMessage.trim() 
                    ? "bg-[#CC1111] text-white hover:bg-[#A30E0E]" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 pointer-events-none"
                )}
              >
                <Send size={15} className="md:mr-1.5" />
                <span className="text-xs font-bold hidden md:inline">Спросить</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Track Overall Completion progress */}
      <div className="mt-8 pt-5 border-t border-[#E2E8F0] dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#475569] uppercase tracking-wider">
            <Award size={14} className="text-[#CC1111]" />
            <span>Общий прогресс учебного трека</span>
          </div>
          <p className="text-xs text-[#475569] font-medium mt-0.5 italic">Миссии повышают общую финансовую грамотность москвичей.</p>
        </div>

        <div className="w-full md:w-64 space-y-1.5 shrink-0">
          <div className="flex justify-between items-baseline text-xs font-bold text-[#0F172A] dark:text-slate-100">
            <span>Завершено:</span>
            <span className="font-mono text-[#CC1111]">{coreCompletedCount} из 13 заданий ({Math.round((coreCompletedCount / 13) * 100)}%)</span>
          </div>
          <div className="w-full bg-[#F1F5F9] border border-[#E2E8F0] dark:border-slate-800 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-600 h-full transition-all duration-500" 
              style={{ width: `${(coreCompletedCount / 13) * 100}%` }}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
