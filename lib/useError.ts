// lib/useError.ts
import { useContext } from 'react';
import { ErrorContext } from './ErrorContext';

export function useError() {
  const { setError } = useContext(ErrorContext);
  return setError;
}