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
  const [pointerClass, setPointerClass] = useState<string>(styles.pointerUp);

  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const announcer = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const firstFocusableElementRef = useRef<HTMLElement | null>(null);
  const lastFocusableElementRef = useRef<HTMLElement | null>(null);

  const modifiedElements = useRef<Map<Element, { prop: string; value: string }[]>>(new Map());

  const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    return Array.from(focusableElements);
  };

  const setupFocusTrap = useCallback(() => {
    if (!dialogRef.current) return;

    const focusableElements = getFocusableElements(dialogRef.current);
    if (focusableElements.length === 0) return;

    firstFocusableElementRef.current = focusableElements[0];
    lastFocusableElementRef.current = focusableElements[focusableElements.length - 1];

    const title = dialogRef.current.querySelector<HTMLElement>('#tour-title');
    if (title) {
      title.focus();
    } else if (firstFocusableElementRef.current) {
      firstFocusableElementRef.current.focus();
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isVisible || !dialogRef.current) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        if (!firstFocusableElementRef.current || !lastFocusableElementRef.current) return;

        if (e.shiftKey && document.activeElement === firstFocusableElementRef.current) {
          e.preventDefault();
          lastFocusableElementRef.current.focus();
          return;
        }

        if (!e.shiftKey && document.activeElement === lastFocusableElementRef.current) {
          e.preventDefault();
          firstFocusableElementRef.current.focus();
          return;
        }
      }
    },
    [isVisible, onClose]
  );

  const announce = useCallback((message: string) => {
    if (announcer.current) {
      announcer.current.textContent = '';
      setTimeout(() => {
        if (announcer.current) {
          announcer.current.textContent = message;
        }
      }, 10);
    }
  }, []);

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
        return styles.pointerUp;
    }
  };

  const setAndTrackStyle = useCallback((element: Element, property: string, value: string) => {
    const originalValue = element instanceof HTMLElement ? element.style[property as any] || '' : '';

    if (!modifiedElements.current.has(element)) {
      modifiedElements.current.set(element, []);
    }

    modifiedElements.current.get(element)?.push({
      prop: property,
      value: originalValue,
    });

    if (element instanceof HTMLElement) {
      element.style[property as any] = value;
    }
  }, []);

  const highlightTarget = useCallback(
    (targetElement: Element) => {
      const targetRect = targetElement.getBoundingClientRect();

      if (spotlightRef.current) {
        spotlightRef.current.remove();
        spotlightRef.current = null;
      }

      const spotlight = document.createElement('div');
      spotlight.className = styles.targetSpotlight;
      document.body.appendChild(spotlight);
      spotlightRef.current = spotlight;

      const padding = 5;
      spotlight.style.top = `${targetRect.top - padding}px`;
      spotlight.style.left = `${targetRect.left - padding}px`;
      spotlight.style.width = `${targetRect.width + padding * 2}px`;
      spotlight.style.height = `${targetRect.height + padding * 2}px`;

      if (targetElement instanceof HTMLElement) {
        const computedStyle = window.getComputedStyle(targetElement);
        const currentPosition = computedStyle.position;

        if (currentPosition === 'static') {
          setAndTrackStyle(targetElement, 'position', 'relative');
        }

        setAndTrackStyle(targetElement, 'zIndex', '10000');
        setAndTrackStyle(targetElement, 'backgroundColor', 'rgba(255, 255, 255, 0.1)');
      }

      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    },
    [setAndTrackStyle]
  );

  const positionDialog = useCallback(() => {
    const currentTourStep = steps[currentStep];
    if (!currentTourStep.targetSelector || !dialogRef.current) return;

    const targetElement = document.querySelector(currentTourStep.targetSelector);
    if (!targetElement) return;

    const targetRect = targetElement.getBoundingClientRect();
    const dialog = dialogRef.current;
    const position = currentTourStep.position || 'bottom';

    const newPointerClass = getPointerClass(position);
    setPointerClass(newPointerClass);

    highlightTarget(targetElement);

    switch (position) {
      case 'top':
        dialog.style.top = `${targetRect.top - dialog.offsetHeight - 20}px`;
        dialog.style.left = `${targetRect.left + targetRect.width / 2 - dialog.offsetWidth / 2}px`;
        break;
      case 'right':
        dialog.style.left = `${targetRect.right + 20}px`;
        dialog.style.top = `${targetRect.top + targetRect.height / 2 - dialog.offsetHeight / 2}px`;
        break;
      case 'bottom':
        dialog.style.top = `${targetRect.bottom + 20}px`;
        dialog.style.left = `${targetRect.left + targetRect.width / 2 - dialog.offsetWidth / 2}px`;
        break;
      case 'left':
        dialog.style.left = `${targetRect.left - dialog.offsetWidth - 20}px`;
        dialog.style.top = `${targetRect.top + targetRect.height / 2 - dialog.offsetHeight / 2}px`;
        break;
    }

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
  }, [currentStep, steps, highlightTarget]);

  const cleanupHighlight = useCallback(() => {
    if (spotlightRef.current) {
      spotlightRef.current.remove();
      spotlightRef.current = null;
    }

    if (backdropRef.current) {
      backdropRef.current.style.clipPath = 'none';
      backdropRef.current.style.webkitClipPath = 'none';
    }

    modifiedElements.current.forEach((styles, element) => {
      if (element instanceof HTMLElement) {
        styles.forEach(({ prop, value }) => {
          if (value === '') {
            element.style[prop as any] = '';
          } else {
            element.style[prop as any] = value;
          }
        });
      }
    });

    modifiedElements.current.clear();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      previousActiveElement.current = document.activeElement as HTMLElement;

      if (currentStep < steps.length) {
        const step = steps[currentStep];
        announce(`Tour step ${currentStep + 1} of ${steps.length}: ${step.title}`);
      }

      document.body.addEventListener('keydown', handleKeyDown);
    } else {
      setIsVisible(false);
      cleanupHighlight();
      setCurrentStep(0);

      if (previousActiveElement.current && 'focus' in previousActiveElement.current) {
        previousActiveElement.current.focus();
      }

      document.body.removeEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.removeEventListener('keydown', handleKeyDown);
      cleanupHighlight();
    };
  }, [isOpen, currentStep, steps, handleKeyDown, announce, cleanupHighlight]);

  useEffect(() => {
    if (isVisible) {
      cleanupHighlight();

      if (currentStep < steps.length) {
        const step = steps[currentStep];
        positionDialog();
        setupFocusTrap();
        announce(`Tour step ${currentStep + 1} of ${steps.length}: ${step.title}. ${step.content}`);
      }
    }
  }, [currentStep, isVisible, steps, setupFocusTrap, announce, cleanupHighlight, positionDialog]);

  useEffect(() => {
    const handleResize = () => {
      if (isVisible) {
        cleanupHighlight();
        positionDialog();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isVisible, positionDialog, cleanupHighlight]);

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
      <div
        ref={announcer}
        aria-live="assertive"
        aria-atomic="true"
        className={styles.srOnly}
        role="status"
      />

      <div
        ref={backdropRef}
        className={styles.tourBackdrop}
        aria-hidden="true"
        onClick={onClose}
      />

      <div
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
          <h2 id="tour-title" tabIndex={-1} className={styles.tourTitle}>
            {currentTourStep.title}
          </h2>
          <button className={styles.closeButton} aria-label="Close tour" onClick={onClose}>
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
    </>
  );
};

export default AccessibleTour;