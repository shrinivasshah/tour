import React, { useState, useEffect, useRef, createContext } from 'react';
import { STEP_TYPES } from '../constants/tour-steps';
import TourOverlay from '../components/tour-overlay';
import { createPortal } from 'react-dom';

// Define types
export interface TourStep {
  targetId: string;
  title: string;
  content: React.ReactNode | (() => React.ReactNode);
  type?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  highlightColor?: string;
  highlightPadding?: number;
}

export interface TourOptions {
  showButtons?: boolean;
  showProgress?: boolean;
  allowClose?: boolean;
  disableScroll?: boolean;
  backdropOpacity?: number;
  defaultStepOptions?: {
    type?: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
  };
  onStart?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onStepChange?: (newIndex: number, prevIndex: number) => void;
}

export interface TourContextType {
  isActive: boolean;
  currentStep: number;
  tourSteps: TourStep[];
  options: TourOptions;
  targetRefs?: React.MutableRefObject<Map<string, HTMLElement>>;
  registerTarget: (id: string, ref: HTMLElement) => void;
  startTour: (steps: TourStep[], options?: TourOptions) => void;
  endTour: (completed?: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
}

// Create context with a default value
export const TourContext = createContext<TourContextType>({
  isActive: false,
  currentStep: 0,
  tourSteps: [],
  options: {},
  registerTarget: () => {},
  startTour: () => {},
  endTour: () => {},
  nextStep: () => {},
  prevStep: () => {},
  goToStep: () => {},
});

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tourSteps, setTourSteps] = useState<TourStep[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [options, setOptions] = useState<TourOptions>({
    showButtons: true,
    showProgress: true,
    allowClose: true,
    disableScroll: true,
    backdropOpacity: 0.5,
    defaultStepOptions: {
      type: STEP_TYPES.TOOLTIP,
      position: 'bottom',
    },
    onStart: () => {},
    onComplete: () => {},
    onCancel: () => {},
    onStepChange: () => {},
  });
  
  // Refs for elements
  const targetRefs = useRef<Map<string, HTMLElement>>(new Map());
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Register a target element for a step
  const registerTarget = (id: string, ref: HTMLElement): void => {
    if (ref && id) {
      targetRefs.current.set(id, ref);
    }
  };

  // Start the tour
  const startTour = (steps: TourStep[], tourOptions: TourOptions = {}): void => {
    setTourSteps(steps);
    setOptions(prev => ({ ...prev, ...tourOptions }));
    setCurrentStep(0);
    setIsActive(true);
    
    if (tourOptions.onStart) {
      tourOptions.onStart();
    } else if (options.onStart) {
      options.onStart();
    }
  };

  // End the tour
  const endTour = (completed: boolean = false): void => {
    setIsActive(false);
    
    if (completed) {
      if (options.onComplete) options.onComplete();
    } else {
      if (options.onCancel) options.onCancel();
    }
  };

  // Navigate to next step
  const nextStep = (): void => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prevStep => {
        const nextStepIndex = prevStep + 1;
        if (options.onStepChange) {
          options.onStepChange(nextStepIndex, prevStep);
        }
        return nextStepIndex;
      });
    } else {
      endTour(true);
    }
  };

  // Navigate to previous step
  const prevStep = (): void => {
    if (currentStep > 0) {
      setCurrentStep(prevStep => {
        const prevStepIndex = prevStep - 1;
        if (options.onStepChange) {
          options.onStepChange(prevStepIndex, prevStep);
        }
        return prevStepIndex;
      });
    }
  };

  // Go to a specific step
  const goToStep = (index: number): void => {
    if (index >= 0 && index < tourSteps.length) {
      setCurrentStep(prevStep => {
        if (options.onStepChange) {
          options.onStepChange(index, prevStep);
        }
        return index;
      });
    }
  };

  // Handle element scrolling when changing steps
  useEffect(() => {
    const scrollToElement = () => {
      if (!isActive || !tourSteps[currentStep]) return;
      
      const { targetId } = tourSteps[currentStep];
      const targetElement = targetRefs.current.get(targetId);
      
      if (targetElement && options.disableScroll !== true) {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        scrollTimeoutRef.current = setTimeout(() => {
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }, 300);
      }
    };
    
    scrollToElement();
    
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [currentStep, isActive, tourSteps, options.disableScroll]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Context value
  const contextValue: TourContextType = {
    isActive,
    currentStep,
    tourSteps,
    options,
    targetRefs,
    registerTarget,
    startTour,
    endTour,
    nextStep,
    prevStep,
    goToStep,
  };

  return (
    <TourContext.Provider value={contextValue}>
      {children}
      {isActive && tourSteps.length > 0 && <TourOverlay />}
    </TourContext.Provider>
  );
};