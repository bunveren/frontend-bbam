import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const defaultQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
});

const customRender = (ui, options) => {
  const client = options?.queryClient || defaultQueryClient;
  
  const AllTheProviders = ({ children }) => {
    return (
      <QueryClientProvider client={client}>
        {children}
      </QueryClientProvider>
    );
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
}; 

export { customRender as render, defaultQueryClient };