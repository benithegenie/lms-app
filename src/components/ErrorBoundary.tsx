import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-8 max-w-xl mx-auto mt-16 border border-destructive rounded-lg bg-destructive/5">
          <h2 className="text-lg font-semibold text-destructive mb-2">Something went wrong</h2>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all bg-muted p-4 rounded">
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            className="mt-4 text-sm text-primary underline"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
