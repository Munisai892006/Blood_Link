import React, { useState } from 'react';
import { HelpCircle, XCircle, Send, Globe, ShieldAlert, Sparkles, Volume2, Copy, Check } from 'lucide-react';

export default function AssistantModal({ isOpen, onClose, language }) {
  const [query, setQuery] = useState('');
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: language === 'te'
        ? "నమస్కారం! నేను బ్లడ్‌లింక్ 3.0 డిజిటల్ సహాయకుడిని. రక్తదానం, అత్యవసర అభ్యర్థనలు లేదా ప్లాట్‌ఫారమ్ మార్గదర్శకాల గురించి నన్ను అడగండి."
        : language === 'hi'
        ? "नमस्ते! मैं ब्लडलिंक 3.0 डिजिटल सहायक हूँ। रक्तदान, आपातकालीन अनुरोध या प्लेटफ़ॉर्म नियमों के बारे में मुझसे पूछें।"
        : "Hello! I am your BloodLink 3.0 AI Assistant. Ask me about donor eligibility, emergency blood requests, quiet hours, or logistics coordination."
    }
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSpeak = (text, idx) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (language === 'te') utterance.lang = 'te-IN';
      else if (language === 'hi') utterance.lang = 'hi-IN';
      else utterance.lang = 'en-US';

      utterance.onend = () => setSpeakingIdx(null);
      setSpeakingIdx(idx);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const quickQuestions = [
    { en: "How do I submit an emergency request without logging in?", te: "లాగిన్ లేకుండా అత్యవసర అభ్యర్థన ఎలా సమర్పించాలి?", hi: "बिना लॉगिन आपातकालीन अनुरोध कैसे भेजें?" },
    { en: "How can I track my request status with Reference ID?", te: "రిఫరెన్స్ IDతో నా అభ్యర్థనను ఎలా ట్రాక్ చేయాలి?", hi: "रेफरेंस आईडी से स्टेटस कैसे ट्रैक करें?" },
    { en: "Who can donate blood?", te: "రక్తదానం చేయడానికి అర్హత ఎవరికి ఉంది?", hi: "रक्तदान कौन कर सकता है?" },
    { en: "How do donors accept or withdraw responses?", te: "దాతలు అంగీకారం లేదా ఉపసంహరణ ఎలా చేస్తారు?", hi: "दाता सहमति या वापसी कैसे करते हैं?" },
    { en: "How is my location privacy protected?", te: "నా లొకేషన్ గోప్యత ఎలా రక్షించబడుతుంది?", hi: "मेरी लोकेशन गोपनीयता कैसे सुरक्षित है?" }
  ];

  const handleSendQuery = async (textToSend) => {
    const q = textToSend || query;
    if (!q.trim()) return;

    const userMsg = { sender: 'user', text: q };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, language })
      });

      const data = await res.json();
      setLoading(false);

      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: data.answer,
          isClinicalFallback: data.is_clinical_fallback
        }
      ]);
    } catch (err) {
      setLoading(false);
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: "I am having trouble connecting to the knowledge base. Please try again shortly."
        }
      ]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl flex flex-col h-[560px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blood-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Multilingual Platform Assistant</h3>
              <p className="text-[11px] text-slate-500">English • తెలుగు • हिन्दी (FR-LNG-001)</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto space-y-3 p-1 text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl ${
                  m.sender === 'user'
                    ? 'bg-blood-600 text-white rounded-tr-xs'
                    : m.isClinicalFallback
                    ? 'bg-rose-50 text-rose-950 border border-rose-300 rounded-tl-xs font-medium'
                    : 'bg-slate-100 text-slate-800 rounded-tl-xs'
                }`}
              >
                {m.isClinicalFallback && (
                  <div className="flex items-center space-x-1.5 font-bold text-rose-800 mb-1">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Clinical Safety Boundary</span>
                  </div>
                )}
                <div className="leading-relaxed">{m.text}</div>
                {m.sender === 'assistant' && (
                  <div className="flex items-center space-x-2 pt-2 text-[10px] text-slate-500">
                    <button
                      onClick={() => handleSpeak(m.text, idx)}
                      className={`hover:text-slate-900 flex items-center space-x-1 ${speakingIdx === idx ? 'text-blood-600 font-bold' : ''}`}
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>{speakingIdx === idx ? 'Speaking...' : 'Listen'}</span>
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => handleCopy(m.text, idx)}
                      className="hover:text-slate-900 flex items-center space-x-1"
                    >
                      {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedIdx === idx ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-500 p-3 rounded-2xl text-xs animate-pulse">
                Thinking in selected language...
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {quickQuestions.map((chip, i) => {
            const label = chip[language] || chip.en;
            return (
              <button
                key={i}
                onClick={() => handleSendQuery(label)}
                className="text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full transition"
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery();
          }}
          className="flex gap-2 pt-2 border-t border-slate-100"
        >
          <input
            type="text"
            placeholder="Type your question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
          />
          <button
            type="submit"
            className="bg-blood-600 hover:bg-blood-700 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center space-x-1"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
}
