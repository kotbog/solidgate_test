import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import AbFramework, { Experiment, EventData } from './ABFramework';

const experiments: Experiment[] = [
  {
    id: 'homepage_banner',
    variants: [
      { name: 'control', allocation: 50 },
      { name: 'treatment', allocation: 50 },
    ],
  },
];

const ab = new AbFramework(experiments);

function App() {
  const [variant, setVariant] = useState<string>('');

  useEffect(() => {
    const assignedVariant = ab.getVariant('homepage_banner');
    setVariant(assignedVariant);

    const exposureEvent: EventData = {
      experimentId: 'homepage_banner',
      variant: assignedVariant,
      eventType: 'exposure',
      timestamp: new Date().toISOString(),
    };

    ab.trackEvent(exposureEvent);
  }, []);

  const handleButtonClick = () => {
    const interactionEvent: EventData = {
      experimentId: 'homepage_banner',
      variant: variant,
      eventType: 'interaction',
      timestamp: new Date().toISOString(),
    };

    ab.trackEvent(interactionEvent);
    alert(`You clicked the ${variant} button!`);
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        {variant === 'treatment' ? (
          <p style={{ color: 'lightgreen' }}>
            Welcome to the new experience!
          </p>
        ) : (
          <p>
            Edit <code>src/App.tsx</code> and save to reload.
          </p>
        )}
        <button className="App-link" onClick={handleButtonClick}>
          {variant === 'treatment' ? 'Try New Feature' : 'Learn React'}
        </button>
      </header>
    </div>
  );
}

export default App;
