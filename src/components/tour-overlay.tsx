import { STEP_TYPES } from "../constants/tour-steps";
import { useTour } from "../hooks/use-tour";
import styles from "./tour-overlay.module.scss";
import TourModal from "./tour-modal";
import TourTooltip from "./tour-tooltip";
import { useEffect, useState } from "react";

const TourOverlay = () => {
    const { 
      isActive, 
      currentStep, 
      tourSteps, 
      options,
      endTour,
      nextStep,
      prevStep,
      targetRefs,
    } = useTour();
    
    const [highlightStyles, setHighlightStyles] = useState(null);
  
    if (!isActive || !tourSteps[currentStep]) return null;
    
    const currentTourStep = tourSteps[currentStep];
    const { 
      targetId, 
      content, 
      title,
      type = options.defaultStepOptions?.type || STEP_TYPES.TOOLTIP,
      position = options.defaultStepOptions?.position || 'bottom',
      highlightColor = '#3b82f6',
      highlightPadding = 8,
    } = currentTourStep;
    
    // Calculate highlight position and dimensions when the targetId changes
    useEffect(() => {
      if (targetId && type === STEP_TYPES.HIGHLIGHT) {
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          const rect = targetElement.getBoundingClientRect();
          setHighlightStyles({
            top: rect.top - highlightPadding,
            left: rect.left - highlightPadding,
            width: rect.width + (highlightPadding * 2),
            height: rect.height + (highlightPadding * 2),
          });
        }
      } else {
        setHighlightStyles(null);
      }
    }, [targetId, type, highlightPadding]);
  
    return (
      <div className={styles.tourOverlay}>
        {/* Backdrop with cutout for highlighted element */}
        {type === STEP_TYPES.HIGHLIGHT && highlightStyles ? (
          <div className={styles.backdropWithHole}>
            {/* Top mask */}
            <div 
              className={styles.backdropPart}
              style={{ 
                top: 0,
                left: 0, 
                right: 0,
                height: highlightStyles.top,
                opacity: options.backdropOpacity || 0.5
              }}
              onClick={() => options.allowClose && endTour()}
            />
            {/* Left mask */}
            <div 
              className={styles.backdropPart}
              style={{ 
                top: highlightStyles.top,
                left: 0,
                width: highlightStyles.left,
                height: highlightStyles.height,
                opacity: options.backdropOpacity || 0.5
              }}
              onClick={() => options.allowClose && endTour()}
            />
            {/* Right mask */}
            <div 
              className={styles.backdropPart}
              style={{ 
                top: highlightStyles.top,
                left: highlightStyles.left + highlightStyles.width,
                right: 0,
                height: highlightStyles.height,
                opacity: options.backdropOpacity || 0.5
              }}
              onClick={() => options.allowClose && endTour()}
            />
            {/* Bottom mask */}
            <div 
              className={styles.backdropPart}
              style={{ 
                top: highlightStyles.top + highlightStyles.height,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: options.backdropOpacity || 0.5
              }}
              onClick={() => options.allowClose && endTour()}
            />
            {/* Highlight border */}
            <div 
              className={styles.highlightBorder}
              style={{
                ...highlightStyles,
                border: `2px solid ${highlightColor}`,
              }}
            />
          </div>
        ) : (
          <div 
            className={styles.backdrop}
            style={{ opacity: options.backdropOpacity || 0.5 }}
            onClick={() => options.allowClose && endTour()}
          />
        )}
        
        {/* Render the appropriate step type */}
        {type === STEP_TYPES.MODAL ? (
          <TourModal
            title={title}
            content={content}
            stepIndex={currentStep}
            stepsTotal={tourSteps.length}
            onNext={nextStep}
            onPrev={prevStep}
            onClose={() => endTour()}
          />
        ) : (
          <TourTooltip
            targetId={targetId}
            title={title}
            content={content}
            position={position}
            stepIndex={currentStep}
            stepsTotal={tourSteps.length}
            type={type}
            highlightColor={highlightColor}
            highlightPadding={highlightPadding}
            onNext={nextStep}
            onPrev={prevStep}
            onClose={() => endTour()}
          />
        )}
      </div>
    );
  };

  export default TourOverlay;