import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "../assets/icons";
import { useTour } from "../hooks/use-tour";
import styles from "./tour-modal.module.scss";
const TourModal = ({ 
    title, 
    content, 
    stepIndex, 
    stepsTotal, 
    onNext, 
    onPrev, 
    onClose 
  }) => {
    const { options } = useTour();
    
    return (
      <div className={styles.tourModal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          {options.allowClose && (
            <button 
              onClick={onClose}
              className={styles.closeButton}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          )}
        </div>
        
        <div className={styles.modalContent}>
          <div className={styles.modalText}>
            {typeof content === 'function' ? content() : content}
          </div>
          
          <div className={styles.modalFooter}>
            {options.showProgress && (
              <div className={styles.progressText}>
                Step {stepIndex + 1} of {stepsTotal}
              </div>
            )}
            
            {options.showButtons && (
              <div className={styles.buttonGroup}>
                {stepIndex > 0 && (
                  <button 
                    onClick={onPrev}
                    className={styles.backButton}
                  >
                    <ChevronLeftIcon /> Back
                  </button>
                )}
                
                <button 
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
    );
  };

  export default TourModal;