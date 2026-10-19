import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  Gem,
  Mountain,
  Palmtree,
  PiggyBank,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react';

const vibes = [
  {
    id: 'relaxed',
    label: 'Relaxed',
    description: 'Slow days, room to breathe',
    icon: Palmtree,
    iconStyle: 'bg-emerald-50 text-emerald-600',
  },
  {
    id: 'adventure',
    label: 'Adventure',
    description: 'Make every day count',
    icon: Mountain,
    iconStyle: 'bg-orange-50 text-orange-600',
  },
  {
    id: 'luxury',
    label: 'Luxury',
    description: 'A little extra comfort',
    icon: Gem,
    iconStyle: 'bg-violet-50 text-violet-600',
  },
  {
    id: 'budget',
    label: 'Budget',
    description: 'Big experiences, less spend',
    icon: PiggyBank,
    iconStyle: 'bg-blue-50 text-blue-600',
  },
];

const initialMessages = [
  {
    id: 'welcome',
    role: 'assistant',
    text: 'Your itinerary is ready to fine-tune. Choose a travel vibe or tell me what you’d like to change.',
  },
];

function VibeRefinementChat({ initialVibe = 'relaxed', onVibeChange, onSendFeedback }) {
  const [selectedVibe, setSelectedVibe] = useState(
    vibes.some((vibe) => vibe.id === initialVibe) ? initialVibe : 'relaxed',
  );
  const [messages, setMessages] = useState(initialMessages);
  const [feedback, setFeedback] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const selectVibe = (vibe) => {
    setSelectedVibe(vibe.id);
    onVibeChange?.(vibe.id);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const request = feedback.trim();
    if (!request || isSending) return;

    const userMessage = { id: `user-${Date.now()}`, role: 'user', text: request };
    setMessages((current) => [...current, userMessage]);
    setFeedback('');
    setIsSending(true);

    try {
      const result = await onSendFeedback?.(request, selectedVibe);
      const responseText =
        typeof result === 'string' && result.trim()
          ? result
          : `Got it — I’ll adjust your itinerary to feel more ${selectedVibe}.`;
      setMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: 'assistant', text: responseText },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: error instanceof Error
            ? `I couldn’t update the itinerary: ${error.message}`
            : 'I couldn’t update the itinerary. Please try again.',
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6" aria-label="Refine your itinerary">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <Sparkles size={16} aria-hidden="true" />
              Vibe selector
            </div>
            <h2 className="text-xl font-semibold text-slate-900">How do you want this trip to feel?</h2>
            <p className="mt-1 text-sm text-slate-500">Choose a style to guide your itinerary.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {vibes.map((vibe) => {
            const Icon = vibe.icon;
            const isSelected = selectedVibe === vibe.id;

            return (
              <motion.button
                key={vibe.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => selectVibe(vibe)}
                whileHover={{ y: -3, scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  isSelected
                    ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`mb-3 grid size-10 place-items-center rounded-lg ${
                    isSelected
                      ? 'bg-emerald-100 text-emerald-700'
                        : vibe.iconStyle
                  }`}
                >
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="block text-sm font-semibold text-slate-900">{vibe.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{vibe.description}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <span className="grid size-10 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <Bot size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Itinerary assistant</h2>
            <p className="text-xs text-slate-500">Tell me what you’d like to refine</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <span className="size-2 rounded-full bg-emerald-500" />
            Ready
          </span>
        </div>

        <div
          className="flex max-h-[360px] min-h-56 flex-col gap-4 overflow-y-auto bg-slate-50/70 p-5 sm:p-6"
          aria-live="polite"
          aria-label="Chat messages"
        >
          <AnimatePresence initial={false}>
            {messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 12, x: isUser ? 12 : -12 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-emerald-700 shadow-sm">
                      <Bot size={16} aria-hidden="true" />
                    </span>
                  )}
                  <p
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[75%] ${
                      isUser
                        ? 'rounded-br-md bg-emerald-700 text-white'
                        : message.isError
                          ? 'rounded-bl-md border border-red-100 bg-red-50 text-red-700'
                          : 'rounded-bl-md border border-slate-100 bg-white text-slate-700'
                    }`}
                  >
                    {message.text}
                  </p>
                  {isUser && (
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-600">
                      <UserRound size={16} aria-hidden="true" />
                    </span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {isSending && (
            <div className="flex items-center gap-2.5 text-sm text-slate-500" role="status">
              <span className="grid size-8 place-items-center rounded-full bg-white text-emerald-700 shadow-sm">
                <Bot size={16} aria-hidden="true" />
              </span>
              Updating your itinerary…
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="border-t border-slate-100 bg-white p-4 sm:p-5" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="itinerary-feedback">
            Your itinerary feedback
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
            <input
              id="itinerary-feedback"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="e.g. Make day 2 more adventurous"
              maxLength={1000}
              disabled={isSending}
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              disabled={!feedback.trim() || isSending}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              aria-label="Send feedback"
            >
              <Send size={17} aria-hidden="true" />
            </motion.button>
          </div>
          <p className="mt-2 px-1 text-xs text-slate-400">
            Your plan will keep the same structure while we apply your feedback.
          </p>
        </form>
      </div>
    </section>
  );
}

export default VibeRefinementChat;