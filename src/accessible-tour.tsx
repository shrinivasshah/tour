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
  // Add state to track if we should create aria-hidden barriers
  const [isDialogMounted, setIsDialogMounted] = useState(false);

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
  // Add ref for tracking aria-hidden elements
  const ariaHiddenElements = useRef<Map<Element, string | null>>(new Map());

  const modifiedElements = useRef<Map<Element, { prop: string; value: string }[]>>(new Map());

  // Function to hide all content from screen readers except the tour
  const hideContentFromScreenReaders = useCallback(() => {
    // Clear previous aria-hidden attributes
    ariaHiddenElements.current.forEach((originalValue, element) => {
      if (element instanceof HTMLElement) {
        if (originalValue === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', originalValue);
        }
      }
    });
    ariaHiddenElements.current.clear();

    // Skip if the tooltip isn't mounted yet
    if (!tooltipRef.current || !isDialogMounted) return;

    // Get all direct children of body
    const bodyChildren = Array.from(document.body.children);
    
    // Hide everything except the tour elements
    bodyChildren.forEach(child => {
      // Skip the tour elements
      if (
        child === tooltipRef.current ||
        child === backdropRef.current ||
        child === spotlightRef.current ||
        child === beaconRef.current ||
        child === announcer.current ||
        child.classList.contains(styles.srOnly) ||
        child.getAttribute('aria-hidden') === 'true'
      ) {
        return;
      }

      // Store original aria-hidden value
      const originalAriaHidden = child.getAttribute('aria-hidden');
      ariaHiddenElements.current.set(child, originalAriaHidden);
      
      // Set aria-hidden="true"
      child.setAttribute('aria-hidden', 'true');
    });
  }, [isDialogMounted]);

  // Function to restore all content for screen readers
  const restoreContentForScreenReaders = useCallback(() => {
    ariaHiddenElements.current.forEach((originalValue, element) => {
      if (element instanceof HTMLElement) {
        if (originalValue === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', originalValue);
        }
      }
    });
    ariaHiddenElements.current.clear();
  }, []);

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

  const announce = useCallback((message: string, priority: 'assertive' | 'polite' = 'assertive') => {
    if (announcer.current) {
      // Update aria-live attribute directly
      announcer.current.setAttribute('aria-live', priority);
      
      // Clear previous announcement and add the new one with a slight delay
      announcer.current.textContent = '';
      setTimeout(() => {
        if (announcer.current) {
          announcer.current.textContent = message;
        }
      }, 50);
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
    // Make beacon invisible to screen readers
    beacon.setAttribute('aria-hidden', 'true');
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
      // Make spotlight invisible to screen readers
      spotlight.setAttribute('aria-hidden', 'true');
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
    
    // Restore original aria-hidden values
    restoreContentForScreenReaders();
  }, [restoreContentForScreenReaders]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsDialogMounted(true);
      previousActiveElement.current = document.activeElement as HTMLElement;

      document.body.addEventListener('keydown', handleKeyDown);
      
      // Apply aria-hidden to everything else
      setTimeout(() => {
        hideContentFromScreenReaders();
      }, 50);
    } else {
      setIsVisible(false);
      cleanupHighlight();
      setCurrentStep(0);

      if (previousActiveElement.current && 'focus' in previousActiveElement.current) {
        previousActiveElement.current.focus();
      }

      document.body.removeEventListener('keydown', handleKeyDown);
      
      // Cleanup and restore aria-hidden attributes
      setTimeout(() => {
        setIsDialogMounted(false);
      }, 300);
    }

    return () => {
      document.body.removeEventListener('keydown', handleKeyDown);
      cleanupHighlight();
    };
  }, [isOpen, handleKeyDown, cleanupHighlight, hideContentFromScreenReaders]);

  // Handle step changes and announcements
  useEffect(() => {
    // Only announce when visible and not transitioning
    if (isVisible && !isTransitioning && currentStep < steps.length) {
      const step = steps[currentStep];
      
      // Only announce steps after dialog is ready
      if (tooltipRef.current) {
        // Delay announcement to ensure dialog is ready
        setTimeout(() => {
          announce(`Tour step ${currentStep + 1} of ${steps.length}: ${step.title}. ${step.content}`);
        }, 200);
      }
    }
  }, [currentStep, isVisible, isTransitioning, steps, announce]);

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
              
              // Hide everything else from screen readers when dialog is ready
              hideContentFromScreenReaders();
            }, 100);
          });
        }
      }
    }
  }, [currentStep, isVisible, steps, positionTooltip, setupFocusTrap, cleanupHighlight, highlightTarget, hideContentFromScreenReaders]);

  useEffect(() => {
    // Set up scroll and resize event listeners
    const handleResize = () => {
      if (isVisible) {
        debouncedUpdatePositions();
      }
    };

    // Create a scroll handler that constantly updates positions
    const handleScroll = () => {
      if (isVisible) {
        // Use requestAnimationFrame to update during scroll
        requestAnimationFrame(updatePositions);
      }
    };

    // Store the scroll handler reference so we can remove it later
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

      // Hide tooltip while transitioning
      if (tooltipRef.current) {
        tooltipRef.current.style.opacity = '0';
      }
      
      // Announce transition to prevent screen readers from reading background content
      announce("Moving to next step...", "assertive");
      
      // Make sure background content is hidden during transition
      hideContentFromScreenReaders();

      setTimeout(() => {
        setCurrentStep(nextStepRef.current);
        
        // Give time for DOM to update before showing tooltip again
        setTimeout(() => {
          if (tooltipRef.current) {
            tooltipRef.current.style.opacity = '1';
            
            // Focus on the title of the new step
            const title = tooltipRef.current.querySelector<HTMLElement>('#tour-title');
            if (title) {
              title.focus();
            }
          }
          
          setIsTransitioning(false);
        }, 100);
      }, 200);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setIsTransitioning(true);
      nextStepRef.current = currentStep - 1;

      // Hide tooltip while transitioning
      if (tooltipRef.current) {
        tooltipRef.current.style.opacity = '0';
      }
      
      // Announce transition to prevent screen readers from reading background content
      announce("Moving to previous step...", "assertive");
      
      // Make sure background content is hidden during transition
      hideContentFromScreenReaders();

      setTimeout(() => {
        setCurrentStep(nextStepRef.current);
        
        // Give time for DOM to update before showing tooltip again
        setTimeout(() => {
          if (tooltipRef.current) {
            tooltipRef.current.style.opacity = '1';
            
            // Focus on the title of the new step
            const title = tooltipRef.current.querySelector<HTMLElement>('#tour-title');
            if (title) {
              title.focus();
            }
          }
          
          setIsTransitioning(false);
        }, 100);
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
      {/* Better announcer with more control */}
      <div
        ref={announcer}
        aria-live="assertive"
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
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          ...(customStyles.tooltip || {})
        }}
      >
        {/* Tooltip arrow based on placement */}
        <div 
          className={`${styles.tooltipArrow} ${
            tooltipPlacement === 'top' ? styles.arrowTop : 
            tooltipPlacement === 'right' ? styles.arrowRight : 
            tooltipPlacement === 'bottom' ? styles.arrowBottom : 
            styles.arrowLeft
          }`}
          aria-hidden="true"
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
            <div className={styles.progressIndicator} aria-live="polite">
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