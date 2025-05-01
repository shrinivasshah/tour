import { useState } from 'react';
import AccessibleTour from './accessible-tour';
import './App.css';

function App() {
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Define tour steps
  const tourSteps = [
    {
      title: "Welcome to the Tour",
      content: "This is a fully accessible tour that guides you through the important features of our application.",
      position: "bottom" as const
    },
    {
      title: "Header Section",
      content: "This is the main heading of our application where you can find important information.",
      targetSelector: "h1",
      position: "bottom" as const
    },
    {
      title: "Description",
      content: "Here you can find a brief description about what this application does.",
      targetSelector: "p:nth-of-type(1)",
      position: "right" as const
    },
    {
      title: "Tour Button",
      content: "You can restart the tour anytime by clicking this button.",
      targetSelector: ".start-tour-btn",
      position: "top" as const
    }
  ];

  const handleTourComplete = () => {
    console.log("Tour completed!");
  };

  return (
    <div className="app-container">
      <h1>Welcome to the Tour</h1>
      <p>This is a simple tour example using React and TypeScript.</p>
      <p>Click the button below to start the tour.</p>
      <button 
        className="start-tour-btn" 
        onClick={() => setIsTourOpen(true)}
        aria-label="Start guided tour"
      >
        Start Tour
      </button>

      <AccessibleTour
        steps={tourSteps}
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onComplete={handleTourComplete}
      />
    </div>
  );
}

export default App;