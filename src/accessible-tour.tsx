import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './accessible-tour.module.scss';

interface TourStep {
  title: string;
  content: string;
  targetSelector?: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
}

interface AccessibleTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const AccessibleTour: React.FC<AccessibleTourProps> = ({
  steps,
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [pointerClass, setPointerClass] = useState<string>(styles.pointerUp); // Default pointer
  
  const dialogRef = useRef<HTMLDivElement>(null);
  const announcer = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const firstFocusableElementRef = useRef<HTMLElement | null>(null);
  const lastFocusableElementRef = useRef<HTMLElement | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  // Find all focusable elements within a container
  const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    return Array.from(focusableElements);
  };

  // Set up focus trap
  const setupFocusTrap = useCallback(() => {
    if (!dialogRef.current) return;

    const focusableElements = getFocusableElements(dialogRef.current);
    if (focusableElements.length === 0) return;

    firstFocusableElementRef.current = focusableElements[0];
    lastFocusableElementRef.current = focusableElements[focusableElements.length - 1];
    
    // Focus the dialog title or first element
    const title = dialogRef.current.querySelector<HTMLElement>('#tour-title');
    if (title) {
      title.focus();
    } else if (firstFocusableElementRef.current) {
      firstFocusableElementRef.current.focus();
    }
  }, []);

  // Handle keyboard navigation and trap focus
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isVisible || !dialogRef.current) return;

    // Close on escape
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    // Handle tab key to trap focus
    if (e.key === 'Tab') {
      if (!firstFocusableElementRef.current || !lastFocusableElementRef.current) return;

      // If shift+tab and focus is on first element, move to last element
      if (e.shiftKey && document.activeElement === firstFocusableElementRef.current) {
        e.preventDefault();
        lastFocusableElementRef.current.focus();
        return;
      }

      // If tab and focus is on last element, move to first element
      if (!e.shiftKey && document.activeElement === lastFocusableElementRef.current) {
        e.preventDefault();
        firstFocusableElementRef.current.focus();
        return;
      }
    }
  }, [isVisible, onClose]);

  // Announce changes for screen readers
  const announce = useCallback((message: string) => {
    if (announcer.current) {
      announcer.current.textContent = '';
      // Forcing the browser to register the change
      setTimeout(() => {
        if (announcer.current) {
          announcer.current.textContent = message;
        }
      }, 10);
    }
  }, []);

  // Get the appropriate pointer class based on position
  const getPointerClass = (position?: 'top' | 'right' | 'bottom' | 'left'): string => {
    switch (position) {
      case 'top':
        return styles.pointerDown;
      case 'right':
        return styles.pointerLeft;
      case 'bottom':
        return styles.pointerUp;
      case 'left':
        return styles.pointerRight;
      default:
        return styles.pointerUp; // Default to pointing up
    }
  };

  // Position the dialog relative to the target element
  const positionDialog = useCallback(() => {
    const currentTourStep = steps[currentStep];
    if (!currentTourStep.targetSelector || !dialogRef.current) return;

    const targetElement = document.querySelector(currentTourStep.targetSelector);
    if (!targetElement) return;

    const targetRect = targetElement.getBoundingClientRect();
    const dialog = dialogRef.current;
    const position = currentTourStep.position || 'bottom';
    
    // Set the pointer class based on position
    const newPointerClass = getPointerClass(position);
    setPointerClass(newPointerClass);

    // Create or update highlight element
    if (!highlightRef.current) {
      const highlight = document.createElement('div');
      highlight.className = styles.targetHighlight;
      document.body.appendChild(highlight);
      highlightRef.current = highlight;
    }

    const highlight = highlightRef.current;
    highlight.style.left = `${targetRect.left}px`;
    highlight.style.top = `${targetRect.top}px`;
    highlight.style.width = `${targetRect.width}px`;
    highlight.style.height = `${targetRect.height}px`;

    // Make sure the highlighted element is visible
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Position the dialog - adjust positions to account for the pointers
    switch (position) {
      case 'top':
        dialog.style.top = `${targetRect.top - dialog.offsetHeight - 20}px`; // Extra space for pointer
        dialog.style.left = `${targetRect.left + (targetRect.width / 2) - (dialog.offsetWidth / 2)}px`;
        break;
      case 'right':
        dialog.style.left = `${targetRect.right + 20}px`; // Extra space for pointer
        dialog.style.top = `${targetRect.top + (targetRect.height / 2) - (dialog.offsetHeight / 2)}px`;
        break;
      case 'bottom':
        dialog.style.top = `${targetRect.bottom + 20}px`; // Extra space for pointer
        dialog.style.left = `${targetRect.left + (targetRect.width / 2) - (dialog.offsetWidth / 2)}px`;
        break;
      case 'left':
        dialog.style.left = `${targetRect.left - dialog.offsetWidth - 20}px`; // Extra space for pointer
        dialog.style.top = `${targetRect.top + (targetRect.height / 2) - (dialog.offsetHeight / 2)}px`;
        break;
    }
    
    // Keep the dialog within viewport bounds
    const dialogRect = dialog.getBoundingClientRect();
    if (dialogRect.left < 0) {
      dialog.style.left = '10px';
    } else if (dialogRect.right > window.innerWidth) {
      dialog.style.left = `${window.innerWidth - dialogRect.width - 10}px`;
    }
    
    if (dialogRect.top < 0) {
      dialog.style.top = '10px';
    } else if (dialogRect.bottom > window.innerHeight) {
      dialog.style.top = `${window.innerHeight - dialogRect.height - 10}px`;
    }
  }, [currentStep, steps]);

  // Clean up highlight element
  const removeHighlight = useCallback(() => {
    if (highlightRef.current) {
      highlightRef.current.remove();
      highlightRef.current = null;
    }
  }, []);

  // Effect for handling tour open/close
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Store the current active element to restore focus when closing
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        announce(`Tour step ${currentStep + 1} of ${steps.length}: ${step.title}`);
      }
      
      // Add event listener for keyboard navigation
      document.addEventListener('keydown', handleKeyDown);
    } else {
      setIsVisible(false);
      removeHighlight();
      
      // Restore focus to the previous active element
      if (previousActiveElement.current && 'focus' in previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
      
      // Remove event listener
      document.removeEventListener('keydown', handleKeyDown);
    }
    
    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      removeHighlight();
    };
  }, [isOpen, currentStep, steps, handleKeyDown, announce, removeHighlight]);

  // Effect for handling step changes
  useEffect(() => {
    if (isVisible) {
      // Force re-render the dialog by changing its key
      setDialogKey(prevKey => prevKey + 1);
      
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        
        // Position dialog after a small delay to ensure DOM is ready
        setTimeout(() => {
          positionDialog();
          setupFocusTrap();
          // Announce the new step for screen readers
          announce(`Tour step ${currentStep + 1} of ${steps.length}: ${step.title}. ${step.content}`);
        }, 100);
      }
    }
  }, [currentStep, isVisible, steps, positionDialog, setupFocusTrap, announce]);

  // Window resize handler to reposition the dialog
  useEffect(() => {
    const handleResize = () => {
      if (isVisible) {
        positionDialog();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isVisible, positionDialog]);

  // Handle navigation between steps
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete();
    onClose();
    setCurrentStep(0);
  };

  if (!isVisible || !steps[currentStep]) {
    return null;
  }

  const currentTourStep = steps[currentStep];

  return (
    <>
      {/* Visually hidden announcer for screen readers */}
      <div
        ref={announcer}
        aria-live="assertive"
        aria-atomic="true"
        className={styles.srOnly}
        role="status"
      />
      
      <div className={styles.tourOverlay} aria-hidden="true" onClick={onClose}>
        {/* Using the key prop to force re-render on step change */}
        <div
          key={dialogKey}
          ref={dialogRef}
          className={`${styles.tourDialog} ${pointerClass}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-content"
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          <header className={styles.tourHeader}>
            <h2 
              id="tour-title" 
              tabIndex={-1}
              className={styles.tourTitle}
            >
              {currentTourStep.title}
            </h2>
            <button
              className={styles.closeButton}
              aria-label="Close tour"
              onClick={onClose}
            >
              ×
            </button>
          </header>
          
          <div id="tour-content" className={styles.tourContent}>
            {currentTourStep.content}
          </div>
          
          <footer className={styles.tourControls}>
            <div className={styles.tourProgress}>
              Step {currentStep + 1} of {steps.length}
            </div>
            <div className={styles.tourButtons}>
              {currentStep > 0 && (
                <button onClick={handlePrevious} aria-label="Previous step">
                  Previous
                </button>
              )}
              
              {currentStep < steps.length - 1 ? (
                <button onClick={handleNext} aria-label="Next step">
                  Next
                </button>
              ) : (
                <button onClick={handleComplete} aria-label="Complete tour">
                  Finish
                </button>
              )}
            </div>
          </footer>
        </div>
      </div>
    </>
  );
};

export default AccessibleTour;