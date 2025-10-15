import React, { useState, useCallback, useMemo, useRef } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, TrendingUp, Camera } from 'lucide-react';
import { Calendar, CalendarDays, Zap, Phone, ShieldCheck, Facebook } from 'lucide-react';

const FinancialQuestionnaire = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({
    name: '',
    ageRange: '',
    hasKids: '',
    kidsCount: '',
    educationConfidence: '',
    insuranceCoverage: [],
    protectionConfidence: '',     // NEW
    retirementPlan: '',
    retirementConfidence: '',     // NEW
    emergencyFund: '',
    debtSituation: '',
    topConcern: ''
  });
  const [showSummary, setShowSummary] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingOption, setBookingOption] = useState('');
  const [mobile, setMobile] = useState('');
  const [bookingStatus, setBookingStatus] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'error'
  const inFlightRef = useRef(false);

  const Spinner = () => (
    <svg className="animate-spin -ml-1 mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
    </svg>
  );

  // near your other useState calls
  const [responseId] = useState(() =>
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  // open booking page
  const onBook = () => setShowBooking(true);
  
  // optional: basic validation
  const canSubmitBooking = bookingOption && mobile.trim().length >= 10;
  
  // optional: you can POST these to Sheets later if you want
  const submitBooking = async () => {
    if (!SCRIPT_URL || !canSubmitBooking || inFlightRef.current || bookingStatus === 'sent') return;
  
    inFlightRef.current = true;
    setBookingStatus('sending');
    window.navigator.vibrate?.(10); // tiny haptic on mobile
  
    const payload = {
      responseId,               // same ID as the initial submit
      bookingOption,
      mobile,
      ua: navigator.userAgent,
      ref: document.referrer
    };
  
    // Optimistic UX: show "Sent!" quickly even if network takes a sec
    const minDelay = new Promise((r) => setTimeout(r, 600));
  
    try {
      // Fire-and-forget write; we don't need to await for UX, but we still do with a minimum delay
      const network = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      });
  
      await Promise.race([Promise.all([network, minDelay]), minDelay]);
      setBookingStatus('sent');
    } catch (e) {
      console.error('Booking submit failed', e);
      setBookingStatus('error');
    } finally {
      // Keep the dedupe guard on briefly; prevent rapid re-taps
      setTimeout(() => { inFlightRef.current = false; }, 1200);
    }
  };
    
  const SCRIPT_URL = import.meta.env.VITE_SHEETS_WEBAPP_URL;

  const submitResponses = useCallback(async () => {
    if (!SCRIPT_URL) {
      console.error('Missing VITE_SHEETS_WEBAPP_URL');
      return;
    }
    const payload = {
      ...answers,
      responseId,
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
  const allQuestions = [
    { id: 'name', question: "What's your name?", type: 'text', placeholder: 'Your name here' },
  
    { id: 'ageRange', question: "Which age bracket are you in?", type: 'choice',
      options: ['20-29', '30-39', '40-49', '50+'] },
  
    { id: 'hasKids', question: "Do you have kids or dependents?", type: 'choice',
      options: ['Yes', 'No', 'Planning to have kids'] },

    { id: 'educationConfidence',
      question: 'How does college funding feel?',
      subtitle: 'Go with your gut',
      type: 'choice',
      options: ['Feels covered', 'Saving but not there yet', 'Not yet'],
      showIf: (a) => a.hasKids === 'Yes'
    },
  
    { id: 'insuranceCoverage', question: "What insurance do you currently have?",
      subtitle: "Select all that apply", type: 'multiple',
      options: ['Life Insurance', 'Health/Medical', 'None yet / not sure'] },
  
    // NEW — only if Life Insurance chosen OR has/plan dependents
    { id: 'protectionConfidence',
      question: "How does your current protection feel?",
      subtitle: "No need for numbers—just vibes",
      type: 'choice',
      options: ['Feels solid', 'Have some but not sure', 'None yet'],
      showIf: (a) => (a.insuranceCoverage || []).includes('Life Insurance')
                || a.hasKids === 'Yes'
                || a.hasKids === 'Planning to have kids'
    },
  
    { id: 'retirementPlan', question: "Are you actively saving for retirement?", type: 'choice',
      options: ['Yes, regularly', 'Occasionally', 'Not yet', "What's a retirement plan? 😅"] },
  
    // NEW — always ask after they answered the plan
    { id: 'retirementConfidence',
      question: "How does your retirement saving feel?",
      subtitle: "Go with your gut",
      type: 'choice',
      options: ['Feels on track', 'Making a start', "Haven't started"],
      showIf: (a) => a.retirementPlan !== ''
    },
  
    { id: 'emergencyFund', question: "Do you have an emergency fund?",
      subtitle: "3-6 months of expenses saved", type: 'choice',
      options: ['Yes, fully funded', 'Working on it', 'Not yet', 'Emergency... what?'] },
  
    { id: 'debtSituation', question: "How's your debt situation?", type: 'choice',
      options: ['Debt-free! 🎉', 'Manageable', 'Bit stressed about it', 'Prefer not to say'] },
  
    { id: 'topConcern', question: "What's your biggest financial concern right now?", type: 'choice',
      options: ['Saving enough', 'Managing expenses', 'Protecting my family', 'Planning for the future', 'Growing my money'] }
  ];
  
  const questions = useMemo(
    () => allQuestions.filter(q => !q.showIf || q.showIf(answers)),
    [answers]
  );

  const handleAnswer = (questionId, value) => {
    if (questions[currentStep].type === 'multiple') {
      const current = answers[questionId] || [];
      const exclusive = 'None yet / not sure';
  
      let next;
      if (current.includes(value)) {
        next = current.filter(v => v !== value);
      } else {
        next = value === exclusive
          ? [exclusive]                                  // pick only the exclusive
          : [...current.filter(v => v !== exclusive), value]; // remove exclusive if present
      }
      setAnswers({ ...answers, [questionId]: next });
      return;
    }
    setAnswers({ ...answers, [questionId]: value });
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
    const mapDebt = {
      'Debt-free! 🎉': 'Covered',
      'Manageable': 'Work in Progress',
      'Bit stressed about it': 'Gap',
      'Prefer not to say': 'Work in Progress'
    };

    // Education
    let education; // undefined means "don’t show tile"
    if (answers.hasKids === 'Yes') {
      switch (answers.educationConfidence) {
        case 'Feels covered':               education = 'Covered'; break;
        case 'Saving but not there yet':    education = 'Work in Progress'; break;
        case 'Not yet':                     education = 'Gap'; break;
        default:                            education = undefined; // unanswered → hide
      }
    }
  
    // Income protection via vibe check (fallback to old logic if missing)
    let incomeState;
    if (answers.protectionConfidence) {
      incomeState =
        answers.protectionConfidence === 'Feels solid' ? 'Covered' :
        answers.protectionConfidence === 'Have some but not sure' ? 'Work in Progress' :
        // 'None yet'
        (dep ? 'Gap' : 'Work in Progress');
    } else {
      incomeState = has('Life Insurance') ? 'Covered' : (dep ? 'Gap' : 'Work in Progress');
    }
  
    // Retirement via vibe check + plan answer
    let retirementState;
    const plan = answers.retirementPlan;
    const rc = answers.retirementConfidence;
    
    if (plan === 'Not yet' || plan === "What's a retirement plan? 😅") {
      retirementState = 'Gap';
    } else if (rc) {
      retirementState =
        rc === 'Feels on track'
          ? (plan === 'Yes, regularly' ? 'Covered' : 'Work in Progress')
          : rc === 'Making a start'
            ? 'Work in Progress'
            : 'Gap'; // "Haven't started"
    } else {
      retirementState =
        plan === 'Yes, regularly' ? 'Covered' :
        plan === 'Occasionally' ? 'Work in Progress' : 'Gap';
    }
  
    const obj = {
      medical: has('Health/Medical') ? 'Covered' : 'Gap',
      income: incomeState,
      retirement: retirementState,
      emergency: mapEF[answers.emergencyFund] || 'Work in Progress',
      debt: mapDebt[answers.debtSituation] || 'Work in Progress'
    };
    if (education) obj.education = education;   // only include when defined
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
        name: 'Foundation Builder',
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
        name: 'Strong Starter',
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
      const { toBlob, toPng } = await import('html-to-image');
  
      // 1) Render to blob (best for Web Share with files)
      let blob = await toBlob(resultRef.current, { cacheBust: true, pixelRatio: 2 });
  
      // 2) If iOS can share files, open Share Sheet (Photos → "Save Image")
      if (blob && navigator.canShare && window.File) {
        const file = new File([blob], `${answers.name || 'your'}-coverage-map.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Your Coverage Map',
            text: 'Here’s my financial coverage map.'
          });
          return; // done
        }
      }
  
      // 3) Fallback: open the image in a new tab (user taps Share → Save Image)
      const dataUrl = await toPng(resultRef.current, { cacheBust: true, pixelRatio: 2 });
      const win = window.open();
      if (win) {
        win.document.write(`<img src="${dataUrl}" style="width:100%;height:auto" />`);
        win.document.title = 'Coverage Map';
      } else {
        // final fallback: trigger a download (lands in Files app)
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${answers.name || 'your'}-coverage-map.png`;
        a.click();
      }
    } catch (e) {
      console.error('Save image failed', e);
    }
  };

  // --------------------------
  // Show Booking
  // --------------------------
  if (showBooking) {
    const options = [
      { id: 'today', label: 'Today', sub: 'I’m free today — text me slots', icon: <Zap className="w-5 h-5" /> },
      { id: 'next_week', label: "Next week — let's find a common time", sub: 'We’ll pick a time that fits us both', icon: <CalendarDays className="w-5 h-5" /> },
      { id: 'after_next_week', label: "After next week — let's discuss", sub: 'Plan ahead, no rush', icon: <Calendar className="w-5 h-5" /> }
    ];
  
    const openFacebook = () => {
      const webUrl = 'https://www.facebook.com/juddstamaria';
      const appUrl = `fb://facewebmodal/f?href=${encodeURIComponent(webUrl)}`;
      const start = Date.now();
      window.location.href = appUrl;
      setTimeout(() => {
        if (Date.now() - start < 1500) window.open(webUrl, '_blank');
      }, 800);
    };
  
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-0 overflow-hidden">
  
          {/* Gradient header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8">
            <h2 className="text-2xl md:text-3xl font-bold">Pick a time that works for you.</h2>
            <p className="mt-1 text-white/90">Free 30-minute chat, no commitments. Let me help you!</p>
          </div>
  
          <div className="p-6 md:p-8">
            {/* Choices */}
            <div className="grid grid-cols-1 gap-3 mb-6">
              {options.map(opt => {
                const selected = bookingOption === opt.label;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setBookingOption(opt.label)}
                    className={`w-full text-left rounded-2xl border-2 transition-all p-4
                      ${selected
                        ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`shrink-0 p-2 rounded-xl ${selected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {opt.icon}
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900">{opt.label}</div>
                        <div className="text-sm text-gray-600">{opt.sub}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
  
            {/* Mobile input */}
            <label className="block text-sm font-medium text-gray-700 mb-2">How do I contact you?</label>
            <div className="relative mb-2">
              <Phone className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                inputMode="tel"
                placeholder="e.g., 0917 123 4567"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
              <ShieldCheck className="w-4 h-4" />
              <span>Your number stays private—used only to confirm a time.</span>
            </div>
  
            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={submitBooking}
                disabled={!canSubmitBooking || bookingStatus !== 'idle'}
                aria-busy={bookingStatus === 'sending'}
                className={`flex-1 px-5 py-3 rounded-xl font-semibold transition
                  ${bookingStatus === 'sending' ? 'bg-indigo-300 text-white cursor-wait'
                    : bookingStatus === 'sent' ? 'bg-emerald-600 text-white'
                    : canSubmitBooking ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:scale-[1.01]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                {bookingStatus === 'sending' ? 'Sending…'
                  : bookingStatus === 'sent' ? "Sent! I’ll text you shortly"
                  : 'Text me the plan'}
              </button>
  
              <button
                onClick={openFacebook}
                className="flex-1 px-5 py-3 rounded-xl border-2 text-[#1877F2] border-[#1877F2] bg-[#1877F2]/10 hover:bg-[#1877F2]/20 transition font-semibold flex items-center justify-center gap-2"
                title="Open my Facebook profile"
              >
                <Facebook className="w-5 h-5" />
                Add me on Facebook!
              </button>
            </div>
  
            {/* Error note only */}
            <div className="mt-2 text-center" aria-live="polite">
              {bookingStatus === 'error' && (
                <span className="text-rose-700">Hmm, that didn’t go through. Try again?</span>
              )}
            </div>
  
            <button
              onClick={() => setShowBooking(false)}
              className="mt-6 w-full py-3 px-6 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition-colors"
            >
              Back to Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------
  // Summary view
  // --------------------------
  if (showSummary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 flex items-center justify-center">
        <div ref={resultRef} className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Persona header */}
          <div className={`p-8 bg-gradient-to-r ${persona.gradient} text-white`}>
            <p className="text-white/90 text-sm mb-2">
              Hi {answers.name || 'there'}! <span className="opacity-95">You're a:</span>
            </p>
            <h2 className="text-2xl md:text-3xl font-bold">{persona.name}</h2>
            <p className="mt-3 opacity-95">{persona.lines[0]}</p>
            <p className="opacity-95">{persona.lines[1]}</p>

            {/* NEW: top concern pill */}
            {answers.topConcern && (
              <span className="inline-block mt-4 text-sm font-medium bg-white/15 backdrop-blur px-3 py-1 rounded-full">
                We’ll prioritize: {answers.topConcern}
              </span>
            )}
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
                Show Me My Next Steps
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
