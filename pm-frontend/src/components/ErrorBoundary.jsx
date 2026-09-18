import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
    window.location.assign("/");
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-ink text-paper flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <p className="font-display text-3xl mb-3">Something went wrong</p>
          <p className="text-paper-dim text-sm mb-6">
            The app hit an unexpected error. You can try going back to the dashboard — if this
            keeps happening, let us know what you were doing when it broke.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="green-button font-medium rounded-lg px-5 py-2.5 transition-all"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }
}
