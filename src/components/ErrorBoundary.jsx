import { Component } from 'react';

// Catches rendering errors so a bug shows a recoverable message
// instead of leaving the whole app as a blank white screen.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info.componentStack);
  }

  restart = () => {
    window.location.replace('/');
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="boot-screen">
        <h2>Something went wrong</h2>
        <p>Your data is safe. Restart the app to continue.</p>
        <pre className="error-detail">{String(this.state.error?.message ?? this.state.error)}</pre>
        <button type="button" className="restart-btn" onClick={this.restart}>Restart app</button>
      </div>
    );
  }
}
