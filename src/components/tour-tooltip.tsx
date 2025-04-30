import React, { useEffect, useRef, useState } from "react";
import { useTour } from "../hooks/use-tour";
import { STEP_TYPES } from "../constants/tour-steps";
import styles from "./tour-tooltip.module.scss";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "../assets/icons";

const TourTooltip = ({ 
    targetId, 
    title, 
    content, 
    position, 
    stepIndex, 
    stepsTotal, 
    type,
    highlightColor,
    highlightPadding,
    onNext, 
    onPrev, 
    onClose 
  }) => {
    const { options, registerTarget } = useTour();
    const [tooltipStyle, setTooltipStyle] = useState({});
    const [highlightStyle, setHighlightStyle] = useState({});
    const tooltipRef = useRef(null);
    const closeButtonRef = useRef(null);
    const backButtonRef = useRef(null);
    const nextButtonRef = useRef(null);
    
    // Calculate tooltip position
    useEffect(() => {
      const calculatePosition = () => {
        if (!targetId || !tooltipRef.current) return;
        
        const targetElement = document.getElementById(targetId);
        if (!targetElement) return;
        
        registerTarget(targetId, targetElement);
        
        const targetRect = targetElement.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        
        // Calculate highlight outline position
        if (type === STEP_TYPES.HIGHLIGHT) {
          setHighlightStyle({
            top: targetRect.top - highlightPadding,
            left: targetRect.left - highlightPadding,
            width: targetRect.width + (highlightPadding * 2),
            height: targetRect.height + (highlightPadding * 2),
            border: `2px solid ${highlightColor}`,
            boxShadow: `0 0 0 9999px rgba(0, 0, 0, ${options.backdropOpacity || 0.5})`,
          });
        }
        
        // Calculate tooltip position
        let top, left;
        let positionClass = styles[`tooltip-${position}`];
        
        switch (position) {
          case 'top':
            top = targetRect.top - tooltipRect.height - 10;
            left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
            break;
          case 'bottom':
            top = targetRect.bottom + 10;
            left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
            break;
          case 'left':
            top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
            left = targetRect.left - tooltipRect.width - 10;
            break;
          case 'right':
            top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
            left = targetRect.right + 10;
            break;
          default:
            top = targetRect.bottom + 10;
            left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
            positionClass = styles['tooltip-bottom'];
        }
        
        // Ensure tooltip is within viewport
        if (left < 10) left = 10;
        if (top < 10) top = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
          left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top + tooltipRect.height > window.innerHeight - 10) {
          top = window.innerHeight - tooltipRect.height - 10;
        }
        
        setTooltipStyle({ top, left });
      };
      
      calculatePosition();
      
      // Recalculate on window resize
      window.addEventListener('resize', calculatePosition);
      return () => window.removeEventListener('resize', calculatePosition);
    }, [targetId, position, type, highlightColor, highlightPadding, options.backdropOpacity, registerTarget]);
    
    // Focus trap logic
    useEffect(() => {
      if (!tooltipRef.current) return;
      
      // Set initial focus to the tooltip
      tooltipRef.current.focus();
      
      // Handle tab key to create a focus trap
      const handleTabKey = (e) => {
        if (!tooltipRef.current) return;
        
        // Get all focusable elements in the tooltip
        const focusableElements = tooltipRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // Handle tab and shift+tab to cycle through focusable elements
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            // If shift+tab and focus is on first element, move to last element
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            // If tab and focus is on last element, move to first element
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
        
        // Handle escape key to close the tooltip if allowed
        if (e.key === 'Escape' && options.allowClose) {
          e.preventDefault();
          onClose();
        }
      };
      
      // Add event listener for keydown
      document.addEventListener('keydown', handleTabKey);
      
      // Store previous active element to restore focus later
      const previousActiveElement = document.activeElement;
      
      return () => {
        document.removeEventListener('keydown', handleTabKey);
        // Restore focus when tooltip is closed
        if (previousActiveElement) {
          previousActiveElement.focus();
        }
      };
    }, [onClose, options.allowClose]);
    
    if (!targetId) return null;
    
    return (
      <>
        {/* Highlight outline for the target element */}
        
        {/* Tooltip */}
        <div
          ref={tooltipRef}
          className={`${styles.tooltip} ${styles[`tooltip-${position}`]}`}
          style={tooltipStyle}
          tabIndex={-1} // Make the tooltip container focusable
          role="dialog"
          aria-labelledby="tooltip-title"
          aria-describedby="tooltip-content"
          aria-modal="true"
        >
          <div className={styles.tooltipHeader}>
            <h3 id="tooltip-title" className={styles.tooltipTitle}>{title}</h3>
            {options.allowClose && (
              <button 
                ref={closeButtonRef}
                onClick={onClose}
                className={styles.closeButton}
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            )}
          </div>
          
          <div className={styles.tooltipContent}>
            <div id="tooltip-content" className={styles.tooltipText}>
              {typeof content === 'function' ? content() : content}
            </div>
            
            <div className={styles.tooltipFooter}>
              {options.showProgress && (
                <div className={styles.progressText}>
                  {stepIndex + 1} / {stepsTotal}
                </div>
              )}
              
              {options.showButtons && (
                <div className={styles.buttonGroup}>
                  {stepIndex > 0 && (
                    <button 
                      ref={backButtonRef}
                      onClick={onPrev}
                      className={styles.backButton}
                    >
                      <ChevronLeftIcon /> Back
                    </button>
                  )}
                  
                  <button 
                    ref={nextButtonRef}
                    onClick={onNext}
                    className={styles.nextButton}
                  >
                    {stepIndex < stepsTotal - 1 ? (
                      <>Next <ChevronRightIcon /></>
                    ) : 'Finish'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };
  
  // Target component to mark elements for the tour
  export const TourTarget = ({ id, children }) => {
    const { registerTarget } = useTour();
    const targetRef = useRef(null);
    
    useEffect(() => {
      if (targetRef.current) {
        registerTarget(id, targetRef.current);
      }
    }, [id, registerTarget]);
    
    return React.cloneElement(React.Children.only(children), {
      id,
      ref: targetRef,
    });
  };

  export default TourTooltip;