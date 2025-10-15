import React, { useState, useCallback } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, TrendingUp } from 'lucide-react';

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
        mode: 'no-cors' // fire-and-forget; Apps Script doesn't send CORS headers
      });
    } catch (e) {
      console.error('Sheets submit failed', e);
    }
  }, [answers, SCRIPT_URL]);

  const questions = [
    {
      id: 'name',
      question: "What's your name?",
      type: 'text',
      placeholder: 'Your name here'
    },
    {
      id: 'ageRange',
      question: "Which age bracket are you in?",
      type: 'choice',
      options: ['20-29', '30-39', '40-49', '50+']
    },
    {
      id: 'hasKids',
      question: "Do you have kids or dependents?",
      type: 'choice',
      options: ['Yes', 'No', 'Planning to have kids']
    },
    {
      id: 'insuranceCoverage',
      question: "What insurance do you currently have?",
      subtitle: "Select all that apply",
      type: 'multiple',
      options: ['Life Insurance', 'Health/Medical', 'None yet', 'Not sure']
    },
    {
      id: 'retirementPlan',
      question: "Are you actively saving for retirement?",
      type: 'choice',
      options: ['Yes, regularly', 'Occasionally', 'Not yet', 'What\'s a retirement plan? 😅']
    },
    {
      id: 'emergencyFund',
      question: "Do you have an emergency fund?",
      subtitle: "3-6 months of expenses saved",
      type: 'choice',
      options: ['Yes, fully funded', 'Working on it', 'Not yet', 'Emergency... what?']
    },
    {
      id: 'debtSituation',
      question: "How's your debt situation?",
      type: 'choice',
      options: ['Debt-free! 🎉', 'Manageable', 'Bit stressed about it', 'Prefer not to say']
    },
    {
      id: 'topConcern',
      question: "What's your biggest financial concern right now?",
      type: 'choice',
      options: ['Saving enough', 'Managing expenses', 'Protecting my family', 'Planning for the future', 'Growing my money']
    }
  ];

  const handleAnswer = (questionId, value) => {
    if (questions[currentStep].type === 'multiple') {
      const current = answers[questionId] || [];
      const newValue = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      setAnswers({ ...answers, [questionId]: newValue });
    } else {
      setAnswers({ ...answers, [questionId]: value });
    }
  };

  const canProceed = () => {
    const currentQ = questions[currentStep];
    const answer = answers[currentQ.id];

    if (currentQ.type === 'text') return answer.trim().length > 0;
    if (currentQ.type === 'multiple') return answer && answer.length > 0;
    return answer !== '';
  };

  const nextStep = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      submitResponses();         // <-- call it here
      setShowSummary(true);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  if (showSummary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">All Set, {answers.name}! 👏</h2>
            <p className="text-gray-600">Here's your financial profile snapshot</p>
          </div>

          <div className="space-y-4 bg-gray-50 rounded-2xl p-6">
            <SummaryItem label="Age Range" value={answers.ageRange} />
            <SummaryItem label="Dependents" value={answers.hasKids} />
            <SummaryItem
              label="Insurance Coverage"
              value={answers.insuranceCoverage.length > 0 ? answers.insuranceCoverage.join(', ') : 'None'}
            />
            <SummaryItem label="Retirement Planning" value={answers.retirementPlan} />
            <SummaryItem label="Emergency Fund" value={answers.emergencyFund} />
            <SummaryItem label="Debt Status" value={answers.debtSituation} />
            <SummaryItem label="Top Priority" value={answers.topConcern} />
          </div>

          <div className="mt-8 text-center">
            <div className="bg-indigo-50 rounded-xl p-6 border-2 border-indigo-200">
              <TrendingUp className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
              <p className="text-gray-700 font-medium">
                We'll use this to personalize today's workshop and consultation for you!
              </p>
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full py-3 px-6 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-300 transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">Question {currentStep + 1} of {questions.length}</span>
            <span className="text-sm font-medium text-indigo-600">{Math.round(progress)}%</span>
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

const SummaryItem = ({ label, value }) => (
  <div className="flex justify-between items-start py-3 border-b border-gray-200 last:border-0">
    <span className="font-medium text-gray-600">{label}</span>
    <span className="text-gray-900 text-right font-semibold max-w-xs">{value}</span>
  </div>
);

export default FinancialQuestionnaire;
