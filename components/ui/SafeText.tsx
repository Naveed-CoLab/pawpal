import React from 'react';
import { Text, TextProps } from 'react-native';

interface SafeTextProps extends TextProps {
  children?: React.ReactNode;
  fallback?: string;
}

/**
 * SafeText component that ensures text is always properly wrapped
 * and handles edge cases where content might be undefined/null
 */
export function SafeText({ children, fallback = '', ...props }: SafeTextProps) {
  // Convert children to string safely
  const safeText = React.useMemo(() => {
    if (children === null || children === undefined) {
      return fallback;
    }
    
    if (typeof children === 'string' || typeof children === 'number') {
      return String(children);
    }
    
    // If it's a React element, return it as is
    if (React.isValidElement(children)) {
      return children;
    }
    
    // For any other type, convert to string
    return String(children);
  }, [children, fallback]);

  return <Text {...props}>{safeText}</Text>;
}

// Export a helper function to wrap any potential string content safely
export const safeRender = (content: any, fallback: string = '') => {
  if (content === null || content === undefined) {
    return fallback;
  }
  
  if (typeof content === 'string' || typeof content === 'number') {
    return String(content);
  }
  
  return content;
}; 