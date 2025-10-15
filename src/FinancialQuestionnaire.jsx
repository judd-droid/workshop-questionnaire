import React, { useState, useCallback, useMemo, useRef } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, TrendingUp, Camera } from 'lucide-react';

const FinancialQuestionnaire = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({
    name: '',
    ageRange: '',
    hasKids: '',
    kidsCount: '',
    insuranceCoverage: [],
    retirementPlan: '',
    emergencyFund: '',
    debtSituation: '',
    topConcern: ''
  });
  const [showSummary, setShowSummary] = useState(false);

  const SCRIPT_URL = import.meta.env.VITE_SHEETS_WEBAPP_URL;

  const submitResponses = useCallback(async () => {
    if (!SCRIPT_URL) {
      console.error('Missing VITE_SHEETS_WEBAPP_URL');
      return;
    }
    const payload = {
      ...answers,
      responseId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ua: navigator.userAgent,
      ref: document.referrer
    };
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      });
    } catch (e) {
      console.error('Sheets submit failed', e);
    }
  }, [answers, SCRIPT_URL]);

  // --------------------------
  // Questionnaire (same as before)
  // --------------------------
  const questions = [
    { id: 'name', question: "What's your name?", type: 'text', placeholder: 'Your name here' },
    { id: 'ageRange', question: "Which age bracket are you in?", type: 'choice', options: ['20-29', '30-39', '40-49', '50+'] },
    { id: 'hasKids', question: "Do you have kids or dependents?", type: 'choice', options: ['Yes', 'No', 'Planning to have kids'] },
    {
      id: 'insuranceCoverage', question: "What insurance do you currently have?", subtitle: "Select all that apply",
      type: 'multiple', options: ['Life Insurance', 'Health/Medical', 'None yet', 'Not sure']
    },
    { id: 'retirementPlan', question: "Are you actively saving for retirement?", type: 'choice',
      options: ['Yes, regularly', 'Occasionally', 'Not yet', "What's a retirement plan? 😅"] },
    { id: 'emergencyFund', question: "Do you have an emergency fund?", subtitle: "3-6 months of expenses saved", type: 'choice',
      options: ['Yes, fully funded', 'Working on it', 'Not yet', 'Emergency... what?'] },
    { id: 'debtSituation', question: "How's your debt situation?", type: 'choice',
      options: ['Debt-free! 🎉', 'Manageable', 'Bit stressed about it', 'Prefer not to say'] },
    { id: 'topConcern', question: "What's your biggest financial concern right now?", type: 'choice',
      options: ['Saving enough', 'Managing expenses', 'Protecting my family', 'Planning for the future', 'Growing my money'] }
  ];

  const handleAnswer = (questionId, value) => {
    if (questions[currentStep].type === 'multiple') {
      const current = answers[questionId] || [];
      const newValue = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      setAnswers({ ...answers, [questionId]: newValue });
    } else {
      setAnswers({ ...answers, [questionId]: value });
    }
  };

  const canProceed = () => {
    const currentQ = questions[currentStep];
    const answer = answers[currentQ.id];
    if (currentQ.type === 'text') return String(answer).trim().length > 0;
    if (currentQ.type === 'multiple') return answer && answer.length > 0;
    return answer !== '';
  };

  const nextStep = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      submitResponses();
      setShowSummary(true);
    }
  };

  const prevStep = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  // --------------------------
  // Coverage mapping & persona
  // --------------------------
  const coverage = useMemo(() => {
    const has = (x) => (answers.insuranceCoverage || []).includes(x);
    const dep = answers.hasKids === 'Yes' || answers.hasKids === 'Planning to have kids';

    const mapEF = {
      'Yes, fully funded': 'Covered',
      'Working on it': 'Work in Progress',
      'Not yet': 'Gap',
      'Emergency... what?': 'Gap'
    };
    const mapRet = {
      'Yes, regularly': 'Covered',
      'Occasionally': 'Work in Progress',
      'Not yet': 'Gap',
      "What's a retirement plan? 😅": 'Gap'
    };
    const mapDebt = {
      'Debt-free! 🎉': 'Covered',
      'Manageable': 'Work in Progress',
      'Bit stressed about it': 'Gap',
      'Prefer not to say': 'Work in Progress'
    };

    const obj = {
      medical: has('Health/Medical') ? 'Covered' : 'Gap',
      income: has('Life Insurance') ? 'Covered' : (dep ? 'Gap' : 'Work in Progress'),
      emergency: mapEF[answers.emergencyFund] || 'Work in Progress',
      debt: mapDebt[answers.debtSituation] || 'Work in Progress',
      retirement: mapRet[answers.retirementPlan] || 'Work in Progress'
    };

    // Only add Education tile if kids now/planned
    if (answers.hasKids === 'Yes') obj.education = 'Work in Progress';
    else if (answers.hasKids === 'Planning to have kids') obj.education = 'Work in Progress';
    // if 'No', omit entirely by not setting education

    return obj;
  }, [answers]);

  const persona = useMemo(() => {
    const vals = Object.values(coverage);
    const covered = vals.filter(s => s === 'Covered').length;
    const wip = vals.filter(s => s === 'Work in Progress').length;
    const gaps = vals.filter(s => s === 'Gap').length;
  
    const dep = answers.hasKids === 'Yes' || answers.hasKids === 'Planning to have kids';
    const hasLife = (answers.insuranceCoverage || []).includes('Life Insurance');
    const efCovered = coverage.emergency === 'Covered';
    const debtFree = coverage.debt === 'Covered';
    const retCovered = coverage.retirement === 'Covered';
    const growthIntent =
      answers.topConcern === 'Growing my money' ||
      answers.topConcern === 'Planning for the future';
  
    // 👉 New top rule: truly at square one
    if (covered === 0 && gaps >= 3) {
      return {
        name: 'Getting Started',
        lines: [
          "You’re fresh on the journey—perfect time to set the basics right.",
          "We’ll lock in safety nets first so every next step feels easier."
        ],
        gradient: 'from-amber-500 to-rose-500'
      };
    }
  
    // Growth once defenses are in place
    if (efCovered && retCovered && growthIntent) {
      return {
        name: 'Growth-Oriented Planner',
        lines: [
          "You’ve nailed the safety nets and you’re eyeing the next level.",
          "Let’s focus on smart growth moves that match your comfort and goals."
        ],
        gradient: 'from-indigo-500 to-emerald-500'
      };
    }
  
    // Family-first with protection in place
    if (dep && hasLife) {
      return {
        name: 'Family Protector',
        lines: [
          "You’re prioritizing your loved ones—solid move.",
          "We’ll fine-tune the numbers so protection and savings stay balanced."
        ],
        gradient: 'from-indigo-500 to-purple-500'
      };
    }
  
    // Defensive pro, missing retirement engine
    if (efCovered && debtFree && !retCovered) {
      return {
        name: 'Safety-First Guardian',
        lines: [
          "Your defenses are tight—great job keeping things stable.",
          "Next up: build a retirement engine that quietly compounds for you."
        ],
        gradient: 'from-teal-500 to-indigo-500'
      };
    }
  
    // Early momentum: some coverage, some gaps
    if (gaps >= 2) {
      return {
        name: 'Starting Strong',
        lines: [
          "You’re getting the essentials on your radar—good start.",
          "We’ll tackle the big wins first so momentum comes fast."
        ],
        gradient: 'from-rose-500 to-amber-500'
      };
    }
  
    // Default
    return {
      name: 'Free-Spirited Builder',
      lines: [
        "You like living in the moment, but you’re laying foundations too.",
        "Our goal is to keep your YOLO energy—with smart safety nets."
      ],
      gradient: 'from-violet-500 to-fuchsia-500'
    };
  }, [answers, coverage]);

  const tiles = useMemo(() => {
    const base = [
      { key: 'medical', label: 'Medical', state: coverage.medical },
      { key: 'income', label: 'Income Protection', state: coverage.income },
      { key: 'retirement', label: 'Retirement', state: coverage.retirement },
      { key: 'emergency', label: 'Emergency Fund', state: coverage.emergency },
      { key: 'debt', label: 'Debt', state: coverage.debt }
    ];
    if (coverage.education) base.splice(3, 0, { key: 'education', label: "Kids’ Education", state: coverage.education });
    return base;
  }, [coverage]);

  const coveredTiles = tiles.filter(t => t.state === 'Covered');
  const needsTiles = tiles.filter(t => t.state !== 'Covered'); // Work in Progress or Gap

  // --------------------------
  // Save Photo
  // --------------------------
  const resultRef = useRef(null);
  const saveImage = async () => {
    if (!resultRef.current) return;
    try {
      const { toPng } = await import('html-to-image'); // lazy-load
      const dataUrl = await toPng(resultRef.current, { cacheBust: true, pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${answers.name || 'your'}-coverage-map.png`;
      a.click();
    } catch (e) {
      console.error('Save image failed', e);
    }
  };

  const onBook = () => {
    // TODO: wire up Calendly/WhatsApp/your booking flow here
    console.log('Book Personalized Consultation clicked');
  };

  // --------------------------
  // Summary view
  // --------------------------
  if (showSummary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 flex items-center justify-center">
        <div ref={resultRef} className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Persona header */}
          <div className={`p-8 bg-gradient-to-r ${persona.gradient} text-white`}>
            <p className="text-white/90 text-sm mb-2">Hi {answers.name || 'there'} 👋</p>
            <h2 className="text-2xl md:text-3xl font-bold">{persona.name}</h2>
            <p className="mt-3 opacity-95">{persona.lines[0]}</p>
            <p className="opacity-95">{persona.lines[1]}</p>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            {/* Covered */}
            {coveredTiles.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Congratulations with these:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {coveredTiles.map(t => <CoverageTile key={t.key} label={t.label} state={t.state} />)}
                </div>
              </section>
            )}

            {/* Needs help */}
            {needsTiles.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">I can help you with these:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {needsTiles.map(t => <CoverageTile key={t.key} label={t.label} state={t.state} />)}
                </div>
              </section>
            )}

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={saveImage}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
                title="Save a picture of these results"
              >
                <Camera className="w-5 h-5" />
                Save Photo of Result
              </button>
              <button
                onClick={onBook}
                className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:scale-[1.01] transition"
              >
                Book a Personalized Consultation
              </button>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full py-3 px-6 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------
  // Question view (unchanged)
  // --------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">Question {currentStep + 1} of {questions.length}</span>
            <span className="text-sm font-medium text-indigo-600">{Math.min(100, Math.round(progress))}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {currentQuestion.question}
            </h2>
            {currentQuestion.subtitle && (
              <p className="text-gray-500 text-lg">{currentQuestion.subtitle}</p>
            )}
          </div>

          {/* Answer Options */}
          <div className="space-y-3 mb-8">
            {currentQuestion.type === 'text' ? (
              <input
                type="text"
                value={answers[currentQuestion.id]}
                onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                placeholder={currentQuestion.placeholder}
                className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:outline-none transition-colors"
                autoFocus
              />
            ) : (
              currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(currentQuestion.id, option)}
                  className={`w-full px-6 py-4 text-left rounded-2xl border-2 transition-all text-lg font-medium
                    ${(currentQuestion.type === 'multiple' 
                      ? (answers[currentQuestion.id] || []).includes(option)
                      : answers[currentQuestion.id] === option)
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/50'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {(currentQuestion.type === 'multiple' 
                      ? (answers[currentQuestion.id] || []).includes(option)
                      : answers[currentQuestion.id] === option) && (
                      <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
            )}
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className={`flex-1 px-6 py-3 rounded-full font-medium transition-all flex items-center justify-center gap-2
                ${canProceed()
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg hover:scale-105'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
            >
              {currentStep === questions.length - 1 ? 'Complete' : 'Continue'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Brand Footer */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          VML Financial Wellness Workshop
        </div>
      </div>
    </div>
  );
};

// --------------------------
// Small components
// --------------------------
const stateStyles = {
  'Covered': 'border-emerald-300 bg-emerald-50 text-emerald-800',
  'Work in Progress': 'border-amber-300 bg-amber-50 text-amber-800',
  'Gap': 'border-rose-300 bg-rose-50 text-rose-800'
};

const CoverageTile = ({ label, state }) => (
  <div className={`rounded-2xl border-2 p-4 flex items-center justify-between ${stateStyles[state] || 'border-gray-200 bg-gray-50 text-gray-700'}`}>
    <span className="font-semibold">{label}</span>
    <span className="text-sm px-3 py-1 rounded-full bg-white/70">{state}</span>
  </div>
);

export default FinancialQuestionnaire;
