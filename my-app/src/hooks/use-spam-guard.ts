import { useState, useCallback, useRef } from 'react';
import debounce from 'lodash/debounce';
import axios from 'axios';

export const useSpamLogic = (context: string) => {
  const [suggestion, setSuggestion] = useState('');
  const [isSafe, setIsSafe] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [score, setScore] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const debouncedCheck = useCallback(
    debounce(async (text: string, controller: AbortController) => {
      try {
        const { data } = await axios.post(
          '/api/spam/check', 
          { text, context },
          { signal: controller.signal }
        );
        
        setSuggestion(data.suggestion || '');
        setIsSafe(data.valid);
        setScore(data.score);

        if (data.score > 0.6) {
          setTimeout(() => {
             if (!controller.signal.aborted) setIsVerifying(false);
          }, 1500);
        } else {
          setIsVerifying(false);
        }
      } catch (e) {
        if (axios.isCancel(e)) {
        } else {
          console.error("Spam check failed", e);
          setIsVerifying(false);
        }
      }
    }, 500),
    [context]
  );

  const checkSpam = useCallback((text: string) => {
    if (!text || text.trim().length < 3) {
      debouncedCheck.cancel(); 
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setIsVerifying(false);
      setIsSafe(true);
      setSuggestion('');
      setScore(0);
      return;
    }

    setIsVerifying(true);
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    debouncedCheck(text, controller);
  }, [debouncedCheck]);

  return { suggestion, isSafe, isVerifying, checkSpam, score };
};