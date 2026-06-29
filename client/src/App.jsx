import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import ChatWidget from './components/chatbot/ChatWidget';
import FloatingButton from './components/chatbot/FloatingButton';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import Home from './pages/Home/Home';
import Contact from './pages/contact/contact';
import Calculator from './pages/calculator/calculator';
import About from './pages/About/About';
import Services from './pages/Services/Services';
import Products from './pages/Products/Products';
import { ROUTES } from './constants/routes';

// Scroll to top on route change helper
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Simple Placeholder page for other routes
function PlaceholderPage({ title }) {
  return (
    <div className="min-h-screen bg-green-100 flex flex-col items-center justify-center section-pad text-center pt-24">
      <div className="bg-white p-8 md:p-12 rounded-card shadow-card max-w-lg border border-green-700/10">
        <h1 className="text-h2 text-green-950 font-bold mb-4">{title}</h1>
        <p className="text-ink-muted text-body-lg mb-8">
          This page is currently under development as part of the prototype. Only the Home page is fully interactive at this stage.
        </p>
        <a href={ROUTES.HOME} className="btn-primary inline-block">
          Go Back Home
        </a>
      </div>
    </div>
  );
}

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Show tooltip after 3 seconds on page load
    const timer = setTimeout(() => {
      setShowTooltip(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const toggleChat = () => {
    setIsChatOpen(prev => {
      const next = !prev;
      if (next) setShowTooltip(false);
      return next;
    });
  };

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen bg-white text-ink-dark">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path={ROUTES.HOME} element={<Home />} />
            
            {/* Main Pages */}
            <Route path={ROUTES.ABOUT} element={<About />} />
            <Route path={ROUTES.SERVICES} element={<Services />} />
            <Route path={ROUTES.PRODUCTS} element={<Products />} />
            <Route path={ROUTES.CALCULATORS} element={<Calculator />} />
            <Route path={ROUTES.CONTACT} element={<Contact />} />

            {/* Service Sub-pages */}
            <Route path={ROUTES.SERVICE_FINANCIAL} element={<PlaceholderPage title="Financial Planning" />} />
            <Route path={ROUTES.SERVICE_RETIREMENT} element={<PlaceholderPage title="Retirement Planning" />} />
            <Route path={ROUTES.SERVICE_INVESTMENT} element={<PlaceholderPage title="Investment Management" />} />
            <Route path={ROUTES.SERVICE_MUTUAL} element={<PlaceholderPage title="Mutual Fund & SIP Advisory" />} />
            <Route path={ROUTES.SERVICE_TAX} element={<PlaceholderPage title="Tax Planning" />} />
            <Route path={ROUTES.SERVICE_LOANS} element={<PlaceholderPage title="Corporate & Retail Loans" />} />
            <Route path={ROUTES.SERVICE_INSURANCE} element={<PlaceholderPage title="Insurance Solutions" />} />
            <Route path={ROUTES.SERVICE_NRI} element={<PlaceholderPage title="NRI Investment Services" />} />
            <Route path={ROUTES.SERVICE_PORTFOLIO} element={<PlaceholderPage title="Portfolio Review & Rebalancing" />} />
            <Route path={ROUTES.SERVICE_ESTATE} element={<PlaceholderPage title="Estate Planning" />} />

            {/* Calculator Sub-pages */}
            <Route path={ROUTES.CALC_INVESTMENT} element={<PlaceholderPage title="Investment Calculator" />} />
            <Route path={ROUTES.CALC_MUTUAL} element={<PlaceholderPage title="Mutual Fund Calculator" />} />
          </Routes>
        </main>
        <Footer />
        <Toaster position="top-right" />
        
        {/* Chatbot UI */}
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end pointer-events-none">
          <div className="pointer-events-auto relative">
            <AnimatePresence>
              {isChatOpen && <ChatWidget onClose={() => setIsChatOpen(false)} />}
            </AnimatePresence>

            {/* Welcome Tooltip bubble */}
            <AnimatePresence>
              {!isChatOpen && showTooltip && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    y: [0, -4, 0] 
                  }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  transition={{
                    y: {
                      repeat: Infinity,
                      duration: 2.5,
                      ease: "easeInOut"
                    },
                    default: { duration: 0.3 }
                  }}
                  className="absolute bottom-[48px] right-0 bg-[#0f172a] text-white p-4 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.2)] border border-slate-700 w-64 flex flex-col items-start gap-1 text-sm font-sans"
                  style={{ transformOrigin: "bottom right" }}
                >
                  {/* Close button */}
                  <button 
                    onClick={() => setShowTooltip(false)}
                    className="absolute top-2.5 right-2.5 text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>

                  <div className="font-semibold text-gold-400 flex items-center gap-1.5">
                    <span>Ask FinAI ✨</span>
                  </div>
                  <p className="text-slate-200 text-xs pr-2 leading-normal">
                    Need financial advice? Ask me about SIP, Mutual Funds, or Loans! 📈
                  </p>
                  
                  {/* Tooltip Arrow pointing down */}
                  <div className="absolute right-6 -bottom-1.5 w-3 h-3 bg-[#0f172a] border-r border-b border-slate-700 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="mt-4 pointer-events-auto">
            <FloatingButton isOpen={isChatOpen} toggle={toggleChat} />
          </div>
        </div>

      </div>
    </BrowserRouter>
  );
}

export default App;
