import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Heart,
  MapPin,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import './TripForm.css';

const steps = [
  { title: 'Destination', description: 'Where and when?', icon: MapPin },
  { title: 'Travel style', description: 'Set your trip details', icon: SlidersHorizontal },
  { title: 'Preferences', description: 'Make it your own', icon: Heart },
];

const interestOptions = [
  'Food',
  'Culture',
  'Nature',
  'History',
  'Adventure',
  'Shopping',
];

const initialFormData = {
  destination: '',
  start_date: '',
  end_date: '',
  budget: '',
  num_travelers: '1',
  travel_pace: 'moderate',
  interests: [],
  dietary_needs: '',
};

function TripForm({ onSubmit }) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState('');

  const updateField = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setError('');
  };

  const toggleInterest = (interest) => {
    setFormData((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest],
    }));
  };

  const handleNext = () => {
    if (step === 0) {
      if (!formData.destination.trim() || !formData.start_date || !formData.end_date) {
        setError('Enter a destination and both trip dates to continue.');
        return;
      }
      if (formData.end_date < formData.start_date) {
        setError('The end date must be on or after the start date.');
        return;
      }
    }

    if (step === 1) {
      const budget = Number(formData.budget);
      if (formData.budget === '' || !Number.isFinite(budget) || budget < 0) {
        setError('Enter a budget of zero or more.');
        return;
      }
      if (!Number.isInteger(Number(formData.num_travelers)) || Number(formData.num_travelers) < 1) {
        setError('Travelers must be a whole number of at least one.');
        return;
      }
    }

    setError('');
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const handleBack = () => {
    setError('');
    setStep((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (step !== steps.length - 1) return;

    const trip = {
      ...formData,
      budget: Number(formData.budget),
      num_travelers: Number(formData.num_travelers),
      dietary_needs: formData.dietary_needs
        .split(',')
        .map((need) => need.trim())
        .filter(Boolean),
    };

    onSubmit?.(trip);
  };

  const ActiveIcon = steps[step].icon;

  return (
    <section className="trip-form" aria-labelledby="trip-form-title">
      <header className="trip-form__header">
        <div className="trip-form__eyebrow">
          <Compass size={16} aria-hidden="true" />
          <span>Your next adventure</span>
        </div>
        <h1 id="trip-form-title">Plan a trip that feels like you</h1>
        <p>Tell us a little about your plans and we’ll help shape your itinerary.</p>
      </header>

      <ol className="trip-form__steps" aria-label="Trip form progress">
        {steps.map((item, index) => {
          const StepIcon = item.icon;
          const isComplete = index < step;
          const isCurrent = index === step;

          return (
            <li
              className={`trip-form__step${isCurrent ? ' is-current' : ''}${isComplete ? ' is-complete' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
              key={item.title}
            >
              <span className="trip-form__step-icon">
                {isComplete ? <Check size={18} aria-hidden="true" /> : <StepIcon size={18} aria-hidden="true" />}
              </span>
              <span className="trip-form__step-copy">
                <span className="trip-form__step-title">{item.title}</span>
                <span className="trip-form__step-description">{item.description}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <form className="trip-form__card" onSubmit={handleSubmit} noValidate>
        <div className="trip-form__card-heading">
          <span className="trip-form__card-icon">
            <ActiveIcon size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="trip-form__step-count">STEP {step + 1} OF {steps.length}</p>
            <h2>{steps[step].title}</h2>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            className="trip-form__fields"
            key={step}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {step === 0 && (
              <>
                <label className="trip-form__field">
                  <span>Destination</span>
                  <input
                    autoComplete="off"
                    name="destination"
                    onChange={updateField}
                    placeholder="e.g. Kyoto, Japan"
                    required
                    value={formData.destination}
                  />
                </label>
                <div className="trip-form__field-row">
                  <label className="trip-form__field">
                    <span>Start date</span>
                    <input
                      name="start_date"
                      onChange={updateField}
                      required
                      type="date"
                      value={formData.start_date}
                    />
                  </label>
                  <label className="trip-form__field">
                    <span>End date</span>
                    <input
                      name="end_date"
                      min={formData.start_date || undefined}
                      onChange={updateField}
                      required
                      type="date"
                      value={formData.end_date}
                    />
                  </label>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="trip-form__field-row">
                  <label className="trip-form__field">
                    <span>Budget</span>
                    <div className="trip-form__input-prefix">
                      <span aria-hidden="true">$</span>
                      <input
                        min="0"
                        name="budget"
                        onChange={updateField}
                        placeholder="2,000"
                        required
                        step="0.01"
                        type="number"
                        value={formData.budget}
                      />
                    </div>
                  </label>
                  <label className="trip-form__field">
                    <span>Number of travelers</span>
                    <input
                      min="1"
                      name="num_travelers"
                      onChange={updateField}
                      required
                      type="number"
                      value={formData.num_travelers}
                    />
                  </label>
                </div>
                <label className="trip-form__field">
                  <span>Travel pace</span>
                  <select name="travel_pace" onChange={updateField} value={formData.travel_pace}>
                    <option value="relaxed">Relaxed — plenty of downtime</option>
                    <option value="moderate">Moderate — a little of everything</option>
                    <option value="fast">Fast — see as much as possible</option>
                  </select>
                </label>
              </>
            )}

            {step === 2 && (
              <>
                <fieldset className="trip-form__interests">
                  <legend>What are you interested in?</legend>
                  <p className="trip-form__hint">Choose all that sound like you.</p>
                  <div className="trip-form__interest-grid">
                    {interestOptions.map((interest) => {
                      const selected = formData.interests.includes(interest);
                      return (
                        <label
                          className={`trip-form__interest${selected ? ' is-selected' : ''}`}
                          key={interest}
                        >
                          <input
                            checked={selected}
                            onChange={() => toggleInterest(interest)}
                            type="checkbox"
                            value={interest}
                          />
                          <span className="trip-form__checkbox" aria-hidden="true">
                            {selected && <Check size={14} />}
                          </span>
                          {interest}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <label className="trip-form__field">
                  <span>Dietary needs</span>
                  <input
                    name="dietary_needs"
                    onChange={updateField}
                    placeholder="e.g. vegetarian, gluten-free"
                    value={formData.dietary_needs}
                  />
                  <span className="trip-form__hint">Separate multiple needs with commas.</span>
                </label>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="trip-form__footer">
          {error && <p className="trip-form__error" role="alert">{error}</p>}
          <div className="trip-form__actions">
            {step > 0 ? (
              <button className="trip-form__button trip-form__button--back" onClick={handleBack} type="button">
                <ArrowLeft size={17} aria-hidden="true" />
                Back
              </button>
            ) : (
              <span />
            )}
            {step < steps.length - 1 ? (
              <button className="trip-form__button trip-form__button--next" onClick={handleNext} type="button">
                Next
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            ) : (
              <button className="trip-form__button trip-form__button--submit" type="submit">
                <Sparkles size={17} aria-hidden="true" />
                Generate Itinerary
              </button>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}

export default TripForm;