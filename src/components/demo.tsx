import { STEP_TYPES } from "../constants/tour-steps";
import { useTour } from "../hooks/use-tour";
import styles from "./demo.module.scss";
const TourDemoContent = () => {
    const { startTour } = useTour();
    
    const startDemoTour = () => {
      const steps = [
        {
          targetId: 'welcome-header',
          title: 'Welcome to the Tour',
          content: 'This is a guided tour to help you understand how to use our application.',
          type: STEP_TYPES.TOOLTIP,
          position: 'bottom',
        },
        {
          title: 'Important Information',
          content: 'This is a modal step that doesn\'t target any specific element.',
          type: STEP_TYPES.MODAL,
        },
        {
          targetId: 'dashboard-button',
          title: 'Dashboard',
          content: 'Click here to access your dashboard with all your important information.',
          type: STEP_TYPES.HIGHLIGHT,
          position: 'right',
          highlightColor: '#10b981',
        },
        {
          targetId: 'settings-button',
          title: 'Settings',
          content: 'Access your account settings and preferences here.',
          type: STEP_TYPES.TOOLTIP,
          position: 'left',
        },
        {
          targetId: 'help-button',
          title: 'Need Help?',
          content: 'If you need assistance, click here to access our help center.',
          type: STEP_TYPES.HIGHLIGHT,
          position: 'top',
        },
      ];
      
      startTour(steps, {
        onComplete: () => console.log('Tour completed!'),
        onCancel: () => console.log('Tour cancelled!'),
      });
    };
    
    return (
      <div className={styles.demoContainer}>
        <h1 id="welcome-header" className={styles.demoHeader}>React Tour Component Demo</h1>
        
        <p className={styles.demoText}>This is a demonstration of a React tour component with features similar to ShepherdJS.</p>
        
        <button 
          onClick={startDemoTour}
          className={styles.primaryButton}
        >
          Start Tour
        </button>
        
        <div className={styles.demoButtonGroup}>
          <button 
            id="dashboard-button"
            className={`${styles.demoButton} ${styles.dashboardButton}`}
          >
            Dashboard
          </button>
          
          <button 
            id="settings-button"
            className={`${styles.demoButton} ${styles.settingsButton}`}
          >
            Settings
          </button>
          
          <button 
            id="help-button"
            className={`${styles.demoButton} ${styles.helpButton}`}
          >
            Help Center
          </button>
        </div>
        
        <div className={styles.usageBox}>
          <h2 className={styles.usageTitle}>How to Use This Component</h2>
          <ol className={styles.usageList}>
            <li>Wrap your app with <code className={styles.inlineCode}>TourProvider</code></li>
            <li>Use <code className={styles.inlineCode}>useTour()</code> hook to access tour functions</li>
            <li>Optionally wrap elements with <code className={styles.inlineCode}>TourTarget</code> for better targeting</li>
            <li>Call <code className={styles.inlineCode}>startTour(steps, options)</code> to begin</li>
          </ol>
        </div>
      </div>
    );
  };

  export default TourDemoContent;