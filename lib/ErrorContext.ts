// lib/ErrorContext.ts
import { createContext } from 'react';

interface ErrorContextType {
  setError: (error: string | null) => void;
}

export const ErrorContext = createContext<ErrorContextType>({
  setError: () => {},
});