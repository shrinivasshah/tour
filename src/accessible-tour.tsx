import React, { useState, useRef, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import styles from './accessible-tour.module.scss';

interface TourStep {
  title: string;
  content: string;
  targetSelector?: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  disableOverlay?: boolean;
  disableBeacon?: boolean;
}

interface AccessibleWalkTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  className?: string;
  showProgress?: boolean;
  showSkipButton?: boolean;
  showCloseButton?: boolean;
  showNavigation?: boolean;
  showPrevButton?: boolean;
  styles?: {
    overlay?: React.CSSProperties;
    spotlight?: React.CSSProperties;
    tooltip?: React.CSSProperties;
    content?: React.CSSProperties;
    buttonNext?: React.CSSProperties;
    buttonBack?: React.CSSProperties;
    buttonSkip?: React.CSSProperties;
    buttonClose?: React.CSSProperties;
  };
}

const AccessibleWalkTour: React.FC<AccessibleWalkTourProps> = ({
  steps,
  isOpen,
  onClose,
  onComplete,
  className = '',
  showProgress = true,
  showSkipButton = true,
  showCloseButton = true,
  showNavigation = true,
  showPrevButton = true,
  styles: customStyles = {},
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [tooltipPlacement, setTooltipPlacement] = useState<'top' | 'right' | 'bottom' | 'left'>('bottom');
  const [beaconVisible, setBeaconVisible] = useState(false);

  const tooltipRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const beaconRef = useRef<HTMLDivElement | null>(null);
  const announcer = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const firstFocusableElementRef = useRef<HTMLElement | null>(null);
  const lastFocusableElementRef = useRef<HTMLElement | null>(null);
  const nextStepRef = useRef<number>(0);
  const targetElementRef = useRef<Element | null>(null);
  const scrollListenerRef = useRef<(() => void) | null>(null);

  const modifiedElements = useRef<Map<Element, { prop: string; value: string }[]>>(new Map());
  const elementsWithAriaHidden = useRef<Map<Element, string | null>>(new Map());
  const mainContentRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    return Array.from(focusableElements);
  };

  const setupFocusTrap = useCallback(() => {
    if (!tooltipRef.current) return;

    const focusableElements = getFocusableElements(tooltipRef.current);
    if (focusableElements.length === 0) return;

    firstFocusableElementRef.current = focusableElements[0];
    lastFocusableElementRef.current = focusableElements[focusableElements.length - 1];

    const title = tooltipRef.current.querySelector<HTMLElement>('#tour-title');
    if (title) {
      title.focus();
    } else if (firstFocusableElementRef.current) {
      firstFocusableElementRef.current.focus();
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isVisible || !tooltipRef.current) return;

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

  const createBeacon = useCallback((targetElement: Element) => {
    if (beaconRef.current) {
      beaconRef.current.remove();
      beaconRef.current = null;
    }

    const currentTourStep = steps[currentStep];
    if (currentTourStep.disableBeacon) return;

    const beacon = document.createElement('div');
    beacon.className = styles.tourBeacon;
    document.body.appendChild(beacon);
    beaconRef.current = beacon;

    const targetRect = targetElement.getBoundingClientRect();
    beacon.style.top = `${window.scrollY + targetRect.top + targetRect.height / 2}px`;
    beacon.style.left = `${window.scrollX + targetRect.left + targetRect.width / 2}px`;

    // Add animation keyframes if they're not already added
    if (!document.getElementById('tour-beacon-keyframes')) {
      const style = document.createElement('style');
      style.id = 'tour-beacon-keyframes';
      style.textContent = `
        @keyframes beaconPulse {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          70% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    setBeaconVisible(true);
    return beacon;
  }, [currentStep, steps]);

  const highlightTarget = useCallback(
    (targetElement: Element) => {
      targetElementRef.current = targetElement;

      if (spotlightRef.current) {
        spotlightRef.current.remove();
        spotlightRef.current = null;
      }

      const spotlight = document.createElement('div');
      spotlight.className = styles.tourSpotlight;
      document.body.appendChild(spotlight);
      spotlightRef.current = spotlight;

      const updateSpotlightPosition = () => {
        // Get fresh position after scrolling
        const updatedRect = targetElement.getBoundingClientRect();
        const padding = 8; // Increased padding

        spotlight.style.top = `${window.scrollY + updatedRect.top - padding}px`;
        spotlight.style.left = `${window.scrollX + updatedRect.left - padding}px`;
        spotlight.style.width = `${updatedRect.width + padding * 2}px`;
        spotlight.style.height = `${updatedRect.height + padding * 2}px`;
        
        // Apply custom spotlight styles if provided
        if (customStyles.spotlight) {
          Object.entries(customStyles.spotlight).forEach(([key, value]) => {
            spotlight.style[key as any] = value as string;
          });
        }
      };

      // Initial position
      updateSpotlightPosition();

      if (targetElement instanceof HTMLElement) {
        const computedStyle = window.getComputedStyle(targetElement);
        const currentPosition = computedStyle.position;

        if (currentPosition === 'static') {
          setAndTrackStyle(targetElement, 'position', 'relative');
        }

        setAndTrackStyle(targetElement, 'zIndex', '10000');
      }

      // Scroll into view with smooth behavior
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
      
      // Update spotlight position and show beacon in a more structured way
      const updatePositionsAfterScroll = () => {
        updateSpotlightPosition();
        
        if (!currentTourStep.disableBeacon) {
          // Hide beacon after a short delay
          setTimeout(() => {
            setBeaconVisible(false);
            if (beaconRef.current) {
              beaconRef.current.style.display = 'none';
            }
          }, 500);
        }
      };

      // Allow time for scrolling to complete before updating positions
      setTimeout(updatePositionsAfterScroll, 400);

      return Promise.resolve();
    },
    [setAndTrackStyle, createBeacon]
  );

  const calculateTooltipPosition = useCallback(() => {
    const currentTourStep = steps[currentStep];
    if (!currentTourStep.targetSelector || !tooltipRef.current) return;

    const targetElement = targetElementRef.current || document.querySelector(currentTourStep.targetSelector);
    if (!targetElement) return;

    const targetRect = targetElement.getBoundingClientRect();
    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const position = currentTourStep.position || 'bottom';

    setTooltipPlacement(position);

    const tooltipHeight = tooltipRect.height;
    const tooltipWidth = tooltipRect.width;
    const spacing = 15; // Space between target and tooltip
    const arrowSize = 10; // Size of the tooltip arrow

    let top, left;

    switch (position) {
      case 'top':
        top = targetRect.top - tooltipHeight - spacing;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.right + spacing;
        break;
      case 'bottom':
        top = targetRect.bottom + spacing;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.left - tooltipWidth - spacing;
        break;
    }

    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 10; // Minimum padding from viewport edge

    // Adjust horizontally if needed
    if (left < padding) {
      left = padding;
    } else if (left + tooltipWidth > viewportWidth - padding) {
      left = viewportWidth - tooltipWidth - padding;
    }

    // Adjust vertically if needed
    if (top < padding) {
      top = padding;
    } else if (top + tooltipHeight > viewportHeight - padding) {
      top = viewportHeight - tooltipHeight - padding;
    }

    // Return the new position for the tooltip
    return {
      top: window.scrollY + top,
      left: window.scrollX + left
    };
  }, [currentStep, steps]);

  const positionTooltip = useCallback(() => {
    const position = calculateTooltipPosition();
    if (position) {
      setTooltipPosition(position);
    }
  }, [calculateTooltipPosition]);

  // Update positions on scroll or resize
  const updatePositions = useCallback(() => {
    if (isVisible && !isTransitioning && targetElementRef.current) {
      // Get fresh position information for the target
      const targetRect = targetElementRef.current.getBoundingClientRect();
      const isTargetInViewport = (
        targetRect.top >= 0 &&
        targetRect.left >= 0 &&
        targetRect.bottom <= window.innerHeight &&
        targetRect.right <= window.innerWidth
      );
      
      // Update spotlight position
      if (spotlightRef.current) {
        const padding = 8;
        
        spotlightRef.current.style.top = `${window.scrollY + targetRect.top - padding}px`;
        spotlightRef.current.style.left = `${window.scrollX + targetRect.left - padding}px`;
      }
      
      // Update beacon position if visible
      if (beaconVisible && beaconRef.current) {
        beaconRef.current.style.top = `${window.scrollY + targetRect.top + targetRect.height / 2}px`;
        beaconRef.current.style.left = `${window.scrollX + targetRect.left + targetRect.width / 2}px`;
      }
      
      // Update tooltip position
      positionTooltip();
      
      // If target is out of viewport and we're not already scrolling, scroll to it
      if (!isTargetInViewport) {
        targetElementRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }
    }
  }, [isVisible, isTransitioning, positionTooltip, beaconVisible]);

  // Debounced version for resize events
  const debouncedUpdatePositions = useCallback(
    debounce(updatePositions, 50),
    [updatePositions]
  );

  const cleanupHighlight = useCallback(() => {
    if (spotlightRef.current) {
      spotlightRef.current.remove();
      spotlightRef.current = null;
    }

    if (beaconRef.current) {
      beaconRef.current.remove();
      beaconRef.current = null;
    }

    targetElementRef.current = null;
    setBeaconVisible(false);

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

  const makeBackgroundElementsInert = useCallback(() => {
    const mainContent = document.querySelector('main') || 
                        document.querySelector('#root') || 
                        document.querySelector('#app') ||
                        document.body;
    
    mainContentRef.current = mainContent as HTMLElement;
    
    if (mainContent) {
      elementsWithAriaHidden.current.clear();
      
      Array.from(mainContent.children).forEach(child => {
        if (child === tooltipRef.current || 
            child === backdropRef.current ||
            child === spotlightRef.current ||
            child === beaconRef.current ||
            child === announcer.current) {
          return;
        }
        
        const originalAriaHidden = child.getAttribute('aria-hidden');
        elementsWithAriaHidden.current.set(child, originalAriaHidden);
        
        child.setAttribute('aria-hidden', 'true');
      });
    }
    
    if (targetElementRef.current) {
      targetElementRef.current.setAttribute('aria-hidden', 'false');
    }
  }, []);

  const restoreBackgroundElements = useCallback(() => {
    elementsWithAriaHidden.current.forEach((value, element) => {
      if (value === null) {
        element.removeAttribute('aria-hidden');
      } else {
        element.setAttribute('aria-hidden', value);
      }
    });
    
    elementsWithAriaHidden.current.clear();
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
      
      makeBackgroundElementsInert();
    } else {
      setIsVisible(false);
      cleanupHighlight();
      setCurrentStep(0);
      
      restoreBackgroundElements();

      if (previousActiveElement.current && 'focus' in previousActiveElement.current) {
        previousActiveElement.current.focus();
      }

      document.body.removeEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.removeEventListener('keydown', handleKeyDown);
      cleanupHighlight();
      restoreBackgroundElements();
    };
  }, [isOpen, currentStep, steps, handleKeyDown, announce, cleanupHighlight, makeBackgroundElementsInert, restoreBackgroundElements]);

  useEffect(() => {
    if (isVisible) {
      cleanupHighlight();

      if (currentStep < steps.length) {
        const step = steps[currentStep];
        const targetElement = document.querySelector(step.targetSelector || '');
        if (targetElement) {
          highlightTarget(targetElement).then(() => {
            setTimeout(() => {
              positionTooltip();
              setupFocusTrap();
              
              makeBackgroundElementsInert();
              
              if (targetElementRef.current) {
                targetElementRef.current.setAttribute('aria-hidden', 'false');
              }
            }, 100);
          });
        }
        announce(`Tour step ${currentStep + 1} of ${steps.length}: ${step.title}. ${step.content}`);
      }
    }
  }, [currentStep, isVisible, steps, positionTooltip, setupFocusTrap, announce, cleanupHighlight, highlightTarget, makeBackgroundElementsInert]);

  useEffect(() => {
    const handleResize = () => {
      if (isVisible) {
        debouncedUpdatePositions();
      }
    };

    const handleScroll = () => {
      if (isVisible) {
        requestAnimationFrame(updatePositions);
      }
    };

    scrollListenerRef.current = handleScroll;

    if (isVisible) {
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (scrollListenerRef.current) {
        window.removeEventListener('scroll', scrollListenerRef.current);
      }
    };
  }, [isVisible, debouncedUpdatePositions, updatePositions]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setIsTransitioning(true);
      nextStepRef.current = currentStep + 1;

      if (tooltipRef.current) {
        tooltipRef.current.style.opacity = '0';
      }

      setTimeout(() => {
        setCurrentStep(nextStepRef.current);
        setTimeout(() => {
          if (tooltipRef.current) {
            tooltipRef.current.style.opacity = '1';
          }
          setIsTransitioning(false);
        }, 50);
      }, 200);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setIsTransitioning(true);
      nextStepRef.current = currentStep - 1;

      if (tooltipRef.current) {
        tooltipRef.current.style.opacity = '0';
      }

      setTimeout(() => {
        setCurrentStep(nextStepRef.current);
        setTimeout(() => {
          if (tooltipRef.current) {
            tooltipRef.current.style.opacity = '1';
          }
          setIsTransitioning(false);
        }, 50);
      }, 200);
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
  const showOverlay = !currentTourStep.disableOverlay;

  return (
    <>
      <div
        ref={announcer}
        aria-live="assertive"
        aria-atomic="true"
        className={styles.srOnly}
        role="status"
      />

      {showOverlay && (
        <div
          ref={backdropRef}
          className={styles.tourBackdrop}
          aria-hidden="true"
          onClick={onClose}
          style={customStyles.overlay}
        />
      )}

      <div
        ref={tooltipRef}
        className={`${styles.tourTooltip} ${className} ${isTransitioning ? styles.transitioning : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-content"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          ...(customStyles.tooltip || {})
        }}
      >
        <div 
          className={`${styles.tooltipArrow} ${
            tooltipPlacement === 'top' ? styles.arrowTop : 
            tooltipPlacement === 'right' ? styles.arrowRight : 
            tooltipPlacement === 'bottom' ? styles.arrowBottom : 
            styles.arrowLeft
          }`}
        />

        <header className={styles.tooltipHeader}>
          <h2 id="tour-title" tabIndex={-1} className={styles.tooltipTitle}>
            {currentTourStep.title}
          </h2>
          {showCloseButton && (
            <button 
              aria-label="Close tour" 
              onClick={onClose}
              className={styles.closeButton}
              style={customStyles.buttonClose}
            >
              ×
            </button>
          )}
        </header>

        <div 
          id="tour-content" 
          className={styles.tooltipContent}
          style={customStyles.content}
        >
          {currentTourStep.content}
        </div>

        <footer className={styles.tooltipFooter}>
          {showProgress && (
            <div className={styles.progressIndicator}>
              {currentStep + 1} of {steps.length}
            </div>
          )}
          
          <div className={styles.buttonContainer}>
            {showNavigation && (
              <>
                {showPrevButton && currentStep > 0 && (
                  <button 
                    onClick={handlePrevious} 
                    aria-label="Previous step" 
                    disabled={isTransitioning}
                    className={styles.backButton}
                    style={customStyles.buttonBack}
                  >
                    Back
                  </button>
                )}

                {currentStep < steps.length - 1 ? (
                  <button 
                    onClick={handleNext} 
                    aria-label="Next step" 
                    disabled={isTransitioning}
                    className={styles.nextButton}
                    style={customStyles.buttonNext}
                  >
                    Next
                  </button>
                ) : (
                  <button 
                    onClick={handleComplete} 
                    aria-label="Complete tour" 
                    disabled={isTransitioning}
                    className={styles.finishButton}
                    style={customStyles.buttonNext}
                  >
                    Finish
                  </button>
                )}
              </>
            )}
          </div>
        </footer>
      </div>
    </>
  );
};

export default AccessibleWalkTour;