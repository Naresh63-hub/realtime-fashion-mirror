import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

interface AnnouncerContextValue {
  announce: (message: string) => void;
}

const AnnouncerContext = createContext<AnnouncerContextValue>({
  announce: () => {},
});

export function useAnnounce(): AnnouncerContextValue {
  return useContext(AnnouncerContext);
}

export { AnnouncerContext };

export function AnnouncerProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef<number | null>(null);

  const announce = useCallback((msg: string) => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    setMessage('');
    timeoutRef.current = window.setTimeout(() => {
      setMessage(msg);
    }, 50);
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {message}
      </div>
    </AnnouncerContext.Provider>
  );
}
