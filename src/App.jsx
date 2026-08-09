import { useState } from "react";

const mathSnippets = [
  "sin(x)",
  "cos(x)",
  "tan(x)",
  "ln(x)",
  "log(x)",
  "exp(x)",
  "sqrt(x)",
  "abs(x)",
  "pi",
  "e",
];

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "-";
  }

  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return numericValue.toFixed(4);
}

export default function App() {
  const [equation, setEquation] = useState("");
  const [xl, setXl] = useState("");
  const [xu, setXu] = useState("");
  const [tol, setTol] = useState("0.01");
  const [useDegrees, setUseDegrees] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleClear = () => {
    setEquation("");
    setXl("");
    setXu("");
    setTol("");
    setUseDegrees(false);
    setError("");
    setResult(null);

    const equationInput = document.getElementById("equation");

    if (equationInput) {
      equationInput.focus();
    }
  };

  const insertSnippet = (snippet) => {
    setEquation((current) => {
      if (!current.trim()) {
        return snippet;
      }

      return `${current} ${snippet}`;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setResult(null);

    if (!equation.trim()) {
      setError("Please enter an equation.");
      return;
    }

    if (!xl.trim() || !xu.trim() || !tol.trim()) {
      setError("Please fill in the lower limit, upper limit, and tolerance.");
      return;
    }

    const parsedXl = Number(xl.trim());
    const parsedXu = Number(xu.trim());
    const parsedTol = Number(tol.trim());

    if (!Number.isFinite(parsedXl) || !Number.isFinite(parsedXu)) {
      setError("Lower limit and upper limit must be valid numbers.");
      return;
    }

    if (!Number.isFinite(parsedTol) || parsedTol <= 0) {
      setError("Tolerance must be a positive number.");
      return;
    }

    if (parsedXl >= parsedXu) {
      setError("Lower limit must be smaller than upper limit.");
      return;
    }

    const payload = {
      equation: equation.trim(),
      xl: parsedXl,
      xu: parsedXu,
      tol: parsedTol,
      useDegrees,
    };

    setLoading(true);

    try {
      const response = await fetch("/api/bisection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!data) {
        throw new Error("Invalid response from server.");
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Calculation failed.");
      }

      setResult(data);
    } catch (fetchError) {
      setError(fetchError.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="shell">
        <main className="card">
          <header className="card-header">
            <div className="header-copy">
              <span className="eyebrow">Numerical Method</span>
              <h1>Bisection Method Calculator</h1>
              <p className="subtitle">
                Kindly enter the equation in terms of x. Also, input the lower and upper limit, and the tolerance. 
                Click the Calculate button once done.
              </p>
            </div>

            <button
              type="button"
              className="clear-button"
              onClick={handleClear}
              title="Clear all inputs"
            >
              Clear
            </button>
          </header>

          <form className="form" onSubmit={handleSubmit}>
            <section className="field">
              <label htmlFor="equation">Equation</label>
              <input
                id="equation"
                type="text"
                value={equation}
                onChange={(event) => setEquation(event.target.value)}
                placeholder="Example: 3*x^3-15*x^2-20*x+50"
              />
            </section>

            <section className="snippet-section">
              <p className="snippet-label">Insert Function</p>

              <div className="snippet-buttons">
                {mathSnippets.map((snippet) => (
                  <button
                    key={snippet}
                    type="button"
                    className="chip"
                    onClick={() => insertSnippet(snippet)}
                  >
                    {snippet}
                  </button>
                ))}
              </div>
            </section>

            <section className="grid">
              <div className="field">
                <label htmlFor="xl">Lower Limit (xl)</label>
                <input
                  id="xl"
                  type="number"
                  step="any"
                  value={xl}
                  onChange={(event) => setXl(event.target.value)}
                  placeholder="Example: 0"
                />
              </div>

              <div className="field">
                <label htmlFor="xu">Upper Limit (xu)</label>
                <input
                  id="xu"
                  type="number"
                  step="any"
                  value={xu}
                  onChange={(event) => setXu(event.target.value)}
                  placeholder="Example: 3"
                />
              </div>

              <div className="field">
                <label htmlFor="tol">Tolerance Percent (%)</label>
                <input
                  id="tol"
                  type="number"
                  step="any"
                  value={tol}
                  onChange={(event) => setTol(event.target.value)}
                  placeholder="Example: 0.01"
                />
              </div>
            </section>

            <section className="options-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useDegrees}
                  onChange={(event) => setUseDegrees(event.target.checked)}
                />
                Use degrees for trigonometric functions
              </label>

              <button type="submit" className="calculate" disabled={loading}>
                {loading ? "Calculating..." : "Calculate"}
              </button>
            </section>
          </form>

          {error && <div className="error">{error}</div>}

          {result && (
            <section className="results">
              <h2>Results</h2>

              <div className="summary">
                <div className="summary-box">
                  <span className="summary-label">Final Root</span>
                  <div className="summary-value">
                    x = {formatNumber(result.root)}
                  </div>
                </div>

                <div className="summary-box">
                  <span className="summary-label">Relative Error</span>
                  <div className="summary-value">
                    {result.finalError === null || result.finalError === undefined
                      ? "-"
                      : `${formatNumber(result.finalError)}%`}
                  </div>
                </div>

                <div className="summary-box">
                  <span className="summary-label">Iterations</span>
                  <div className="summary-value">
                    {result.iterations?.length ?? 0}
                  </div>
                </div>
              </div>

              {result.iterations && result.iterations.length > 0 ? (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Itr</th>
                        <th>Xl</th>
                        <th>Xu</th>
                        <th>Xr</th>
                        <th>f(Xl)</th>
                        <th>f(Xr)</th>
                        <th>f(Xu)</th>
                        <th>Ea (%)</th>
                      </tr>
                    </thead>

                    <tbody>
                      {result.iterations.map((row, index) => {
                        const [
                          iteration,
                          lower,
                          upper,
                          root,
                          fxl,
                          fxr,
                          fxu,
                          relativeError,
                        ] = row;

                        return (
                          <tr key={index}>
                            <td>{iteration}</td>
                            <td>{formatNumber(lower)}</td>
                            <td>{formatNumber(upper)}</td>
                            <td>{formatNumber(root)}</td>
                            <td>{formatNumber(fxl)}</td>
                            <td>{formatNumber(fxr)}</td>
                            <td>{formatNumber(fxu)}</td>
                            <td>{formatNumber(relativeError)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">No iteration data returned.</div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}