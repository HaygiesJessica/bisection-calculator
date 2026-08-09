import json
import sys
import math
from http.server import BaseHTTPRequestHandler, HTTPServer

import sympy as sp

def round_4(value):
    return int(value * 10000 + (0.5 if value > 0 else -0.5)) / 10000

def safe_exp(term):
    MAX_EXP = 1000
    MIN_EXP = -1000
    return math.exp(max(min(term, MAX_EXP), MIN_EXP))

epsilon = 1e-10 
def safe_f(f, x_val):
    try:
        return f(x_val)
    except ZeroDivisionError:
        return f(x_val + epsilon)

def bisection_method(f, xl, xu, tol):
    xr_old = None
    iterations = []
    iteration = 1
    final_error = None
    while True:
        xr = round_4((xl + xu) / 2)  
        f_xl = round_4(safe_f(f, xl))
        f_xr = round_4(safe_f(f, xr))
        f_xu = round_4(safe_f(f, xu))
        
        if xr_old is not None:
            relative_error = round_4(abs((xr - xr_old) / xr) * 100)
        else:
            relative_error = None 
        
        iterations.append([iteration, xl, xu, xr, f_xl, f_xr, f_xu, relative_error])
        
        if relative_error is not None and relative_error < tol:
            final_error = relative_error
            break
        
        if f_xl * f_xr < 0:
            xu = xr
        elif f_xr * f_xu < 0:
            xl = xr
        else:
            break  
        
        xr_old = xr  
        iteration += 1
    
    return iterations, xr, final_error

def parse_equation(equation_str, use_degrees=None):
    x = sp.symbols('x')

    equation_str = equation_str.replace("^", "**")
    
    equation_str = equation_str.replace("e^", "exp")
    
    equation_str = equation_str.replace(")(", ")*(")
    equation_str = equation_str.replace("x(", "x*(")
    equation_str = equation_str.replace(")x", ")*x")
    
    trig_functions = ['sin', 'cos', 'tan']

    if use_degrees is None:
        if any(fn in equation_str for fn in trig_functions):
            choice = input("Do you want to use degrees instead of radians? (yes/no): ").strip().lower()
            use_degrees = choice in ["yes", "y"]
        else:
            use_degrees = False

    try:
        equation = sp.sympify(equation_str, locals={'e': sp.exp(1)})
        
        if use_degrees:
            f = sp.lambdify(x, equation, {'sin': lambda x: math.sin(math.radians(x)),
                                          'cos': lambda x: math.cos(math.radians(x)),
                                          'tan': lambda x: math.tan(math.radians(x)),
                                          'exp': safe_exp, 'log': math.log, 'pi': math.pi})
        else:
            f = sp.lambdify(x, equation, {'sin': math.sin, 'cos': math.cos, 'tan': math.tan,
                                          'exp': safe_exp, 'log': math.log, 'pi': math.pi})
        return f
    
    except Exception as e:
        print(f"❌ Invalid equation. Please check your input. Error: {e}")
        exit()

def main():
    print("\n Bisection Method Calculator")
    print("Enter the equation in terms of x (e.g., 3*x**3 - 15*x**2 - 20*x + 50)")
    equation_str = input("Equation: ")
    f = parse_equation(equation_str)
    
    while True:
        try:
            xl = float(input("Enter the lower limit (xl): "))
            xu = float(input("Enter the upper limit (xu): "))
            if xl >= xu:
                raise ValueError("Lower limit must be smaller than upper limit.")
            break
        except ValueError as e:
            print(f"Invalid input: {e}. Please try again.")
    
    while True:
        try:
            tol = round_4(float(input("Less than what percent? ")))
            if tol <= 0:
                raise ValueError("Tolerance must be greater than zero.")
            break
        except ValueError as e:
            print(f"Invalid input: {e}. Please try again.")
    
    iterations, root, final_error = bisection_method(f, xl, xu, tol)
    
    print("\n💡 Bisection Method Iterations")
    print(f"{'Itr':<6}{'xl':<10}{'xu':<10}{'xr':<10}{'f(xl)':<10}{'f(xr)':<10}{'f(xu)':<10}{'Ea (%)':<10}")
    print("-" * 80)
    for row in iterations:
        print(f"{row[0]:<6}{row[1]:<10.4f}{row[2]:<10.4f}{row[3]:<10.4f}{row[4]:<10.4f}{row[5]:<10.4f}{row[6]:<10.4f}{row[7] if row[7] is not None else '-':<10}")
    
    print(f"\nFinal Answer: x = {root:.4f}")
    if final_error is not None:
        print(f"Approximate Relative Error: {final_error:.4f}%")

class handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send_json(self, status_code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        self._send_json(
            200,
            {"success": True, "message": "Bisection Method API is running. Send POST JSON to this endpoint."},
        )

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_length) if content_length else b"{}"
            data = json.loads(raw_body.decode("utf-8"))
        except Exception:
            self._send_json(400, {"success": False, "error": "Invalid JSON body."})
            return

        try:
            equation = str(data.get("equation", "")).strip()

            try:
                xl = float(data.get("xl"))
                xu = float(data.get("xu"))
                tol = round_4(float(data.get("tol", 0.01)))
            except (TypeError, ValueError):
                raise ValueError("Invalid input: xl, xu, and tol must be valid numbers.")

            if not equation:
                raise ValueError("Equation is required.")

            if xl >= xu:
                raise ValueError("Lower limit must be smaller than upper limit.")

            if tol <= 0:
                raise ValueError("Tolerance must be greater than zero.")

            use_degrees_raw = data.get("useDegrees", False)
            if isinstance(use_degrees_raw, str):
                use_degrees = use_degrees_raw.strip().lower() in ("true", "1", "yes", "y")
            else:
                use_degrees = bool(use_degrees_raw)

            f = parse_equation(equation, use_degrees)
            iterations, root, final_error = bisection_method(f, xl, xu, tol)

            self._send_json(
                200,
                {
                    "success": True,
                    "root": root,
                    "finalError": final_error,
                    "iterations": iterations,
                },
            )

        except SystemExit:
            self._send_json(
                400,
                {"success": False, "error": "Invalid equation. Please check your input."},
            )

        except ValueError as e:
            self._send_json(400, {"success": False, "error": str(e)})

        except Exception as e:
            self._send_json(500, {"success": False, "error": f"Server error: {e}"})

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    if "--console" in sys.argv:
        main()
    else:
        httpd = HTTPServer(("127.0.0.1", 8000), handler)
        print("Python Bisection API running at http://127.0.0.1:8000")
        httpd.serve_forever()