import { useState, useCallback, useRef } from 'react';
import debounce from 'lodash/debounce';
import axios from 'axios';

export const useSpamLogic = (context: string) => {
  const [suggestion, setSuggestion] = useState('');
  const [isSafe, setIsSafe] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [score, setScore] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const checkSpam = useCallback(
    debounce(async (text: string) => {
      if (!text || text.trim().length < 3) {
        setIsSafe(true);
        setScore(0);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsVerifying(true);

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
             if (abortControllerRef.current === controller) {
                setIsVerifying(false);
             }
          }, 3000);
        } else {
          setIsVerifying(false);
        }
      } catch (e) {
        if (axios.isCancel(e)) {
          console.log("Request cancelled: a newer one is flying.");
        } else {
          console.error("Spam check failed", e);
          setIsVerifying(false);
        }
      }
    }, 500),
    [context]
  );

  return { suggestion, isSafe, isVerifying, checkSpam, score };
};