import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Button, ButtonText } from '@/components/ui';
import { toDomainError } from '@/lib/domainError';

interface Props { children: ReactNode; name?: string; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const domainError = toDomainError(error);
    if (__DEV__) console.error('[Jeevya][boundary]', this.props.name ?? 'route', domainError.code, domainError.message, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text className="text-xl font-bold text-foreground">This section needs a refresh</Text>
        <Text className="text-center text-muted-foreground">
          {this.state.error.message || 'An unexpected error occurred. Your saved data was not changed.'}
        </Text>
        <Button onPress={this.reset} accessibilityLabel="Try this section again"><ButtonText>Try again</ButtonText></Button>
      </View>
    );
  }
}
