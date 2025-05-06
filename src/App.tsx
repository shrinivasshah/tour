import { useState } from 'react';
import AccessibleTour from './accessible-tour';
import './App.css';

function App() {
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Define tour steps
  const tourSteps = [
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
    },
    {
      title: "Features Section",
      content: "Explore our comprehensive feature set below.",
      targetSelector: "#features-section",
      position: "top" as const
    },
    {
      title: "Pricing Information",
      content: "Review our competitive pricing options.",
      targetSelector: "#pricing-info",
      position: "left" as const
    },
    {
      title: "User Testimonials",
      content: "See what our users are saying about our product.",
      targetSelector: ".testimonial-card:first-child",
      position: "right" as const
    },
    {
      title: "Contact Form",
      content: "Reach out to us using this form if you have any questions.",
      targetSelector: "#contact-section",
      position: "top" as const
    }
  ];

  const handleTourComplete = () => {
    console.log("Tour completed!");
  };

  return (
    <div className="app-container">
      <header>
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
      </header>

      <div className="content-wrapper">
        <section id="features-section" className="section">
          <h2>Feature Highlights</h2>
          <div className="feature-cards">
            {[1, 2, 3].map((item) => (
              <div key={item} className="card">
                <h3>Feature {item}</h3>
                <p>This is an important feature that makes our application stand out from the competition.</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing-info" className="section">
          <h2>Pricing Plans</h2>
          <div className="pricing-cards">
            {['Basic', 'Pro', 'Enterprise'].map((plan) => (
              <div key={plan} className="card">
                <h3>{plan} Plan</h3>
                <p className="price">${plan === 'Basic' ? '9.99' : plan === 'Pro' ? '19.99' : '49.99'}/month</p>
                <ul>
                  <li>Feature 1</li>
                  <li>Feature 2</li>
                  <li>{plan !== 'Basic' && 'Advanced '} Feature 3</li>
                  {plan === 'Enterprise' && <li>Priority Support</li>}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <h2>User Testimonials</h2>
          <div className="testimonial-wrapper">
            {[
              { name: 'John Doe', role: 'Product Manager', comment: 'This tool has transformed our workflow!' },
              { name: 'Jane Smith', role: 'UX Designer', comment: 'The accessibility features are outstanding.' },
              { name: 'Alex Johnson', role: 'Developer', comment: 'Easy to integrate and customize to our needs.' }
            ].map((testimonial, index) => (
              <div key={index} className="testimonial-card">
                <p>"{testimonial.comment}"</p>
                <p className="author">- {testimonial.name}, {testimonial.role}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="contact-section" className="section">
          <h2>Contact Us</h2>
          <form className="contact-form">
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input type="text" id="name" name="name" />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" />
            </div>
            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea id="message" name="message" rows={4}></textarea>
            </div>
            <button type="submit">Submit</button>
          </form>
        </section>
      </div>

      <footer>
        <p>&copy; {new Date().getFullYear()} Tour Example. All rights reserved.</p>
      </footer>

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