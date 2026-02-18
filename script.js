let display = document.getElementById('display');
let currentExpression = '';
let radMode = false; // false for degrees, true for radians
let isRoundingEnabled = true; // New global variable for rounding mode
let memory = []; // Calculator memory, an array to store multiple results

// Helper function to check if a character is part of a number or a constant
const isNumberChar = (char) => !isNaN(parseFloat(char)) || char === '.' || char === 'π' || char === 'e';


function appendToDisplay(value) {
    if (value === 'Math.PI') value = 'π'; // Display special characters
    if (value === 'Math.E') value = 'e';
    if (value === 'x') value = '*'; // show x insted of * 

    const lastChar = currentExpression.slice(-1);
    const isOperator = (char) => ['+', '-', '*', '/', '^'].includes(char);
    const isFunctionStart = (val) => ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'square', 'cube', 'cbrt', 'inverse', 'factorial', 'abs', 'yroot', 'exp'].some(f => val.startsWith(f));

    // cant right x % ) / ^ unless some number is before them
    if (currentExpression === '' && (value === ')' || value === '%' || ['*', '/', '^'].includes(value))) {
        return;
    }
    
    // Logic for parentheses
    if (value === '(' && (isNumberChar(lastChar) || lastChar === ')' || lastChar === 'e' || lastChar === 'π')) {
        currentExpression += '*'; // Auto-insert multiplication
    }
    // Auto-insert multiplication for number/constant after closing parenthesis
    if (isNumberChar(value) && lastChar === ')') {
        currentExpression += '*';
    }


    if (isOperator(lastChar) && isOperator(value) && value !== '~') { // '~' is unary minus
        currentExpression = currentExpression.slice(0, -1) + value; // Replace last operator
    } else if (value === '.' && currentExpression.split(/[\+\-\*\/%^~]/).pop().includes('.')) {
        // can't put more than one . in a number
        return;
    }
    else {
        currentExpression += value;
    }
    
    // Perform visual replacements for display.value
    let visualExpression = currentExpression;
    visualExpression = visualExpression.replace(/Math\.sqrt\(/g, '√('); // For consistency if sqrt( was typed
    visualExpression = visualExpression.replace(/_LN_\(/g, 'ln('); // ln visual
    visualExpression = visualExpression.replace(/_LOG10_\(/g, 'log('); // log visual
    visualExpression = visualExpression.replace(/Math\.E/g, 'e'); //   e
    visualExpression = visualExpression.replace(/cbrt\(/g, '³√('); //  ³√
    visualExpression = visualExpression.replace(/yrootFunc\((\d+\.?\d*),/g, '$1√('); // New visual for yrootx
    visualExpression = visualExpression.replace(/\*/g, 'x'); // Display '*' as 'x'

    display.value = visualExpression;
}

function backspace() {
    if (currentExpression.length === 0) {
        display.value = '';
        return;
    }

    // Define internal tokens that should be deleted as a unit, ordered longest to shortest
    const internalTokens = [
        'Math.sqrt(', '_LN_(', '_LOG10_(', 'cbrt(', 'yrootFunc(', // function calls with (
        'sin(', 'cos(', 'tan(', // basic trig functions with (
        'powFunc(', // power function (internal)
        'inverseFunc(', 'factorialFunc(', 'squareFunc(', 'cubeFunc(', 'Math.abs(', 'Math.exp(', // direct apply functions
        'Math.PI', 'Math.E', // constants
        'Math.sqrt', '_LN_', '_LOG10_', 'cbrt', // bare function names (after '(' is deleted)
    ];

    // Sort by length, longest first, to ensure that if e.g. '_LN_(' is present, it's matched before '_LN_'
    internalTokens.sort((a, b) => b.length - a.length);

    // Sort by length, longest first, to ensure that if e.g. '_LN_(' is present, it's matched before '_LN_'
    internalTokens.sort((a, b) => b.length - a.length);

    let atomicalyDeleted = false;
    for (const token of internalTokens) {
        if (currentExpression.endsWith(token)) {
            currentExpression = currentExpression.slice(0, -token.length);
            atomicalyDeleted = true;
            break; // Delete the longest matching internal token
        }
    }

    // If no specific token was matched (e.g., a number or operator), perform simple character deletion
    if (!atomicalyDeleted) {
        currentExpression = currentExpression.slice(0, -1);
    }
    
    // Re-render display.value with visual replacements (same as before)
    let visualExpression = currentExpression;
    visualExpression = visualExpression.replace(/Math\.PI/g, 'π');
    visualExpression = visualExpression.replace(/Math\.E/g, 'e');
    visualExpression = visualExpression.replace(/Math\.sqrt\(/g, '√(');
    visualExpression = visualExpression.replace(/_LN_\(/g, 'ln(');
    visualExpression = visualExpression.replace(/_LOG10_\(/g, 'log(');
    visualExpression = visualExpression.replace(/cbrt\(/g, '³√(');
    visualExpression = visualExpression.replace(/yrootFunc\((\d+\.?\d*),/g, '$1√(');

    visualExpression = visualExpression.replace(/_LN_/g, 'ln');
    visualExpression = visualExpression.replace(/_LOG10_/g, 'log');
    visualExpression = visualExpression.replace(/Math\.sqrt/g, '√');
    visualExpression = visualExpression.replace(/cbrt/g, '³√');
    visualExpression = visualExpression.replace(/\*/g, 'x'); // Display '*' as 'x'

    display.value = visualExpression;
}

function clearDisplay() {
    currentExpression = '';
    display.value = '';
}

let factorialCache = {};
function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) throw new Error("Factorial of non-negative integer only");
    if (n === 0 || n === 1) return 1;
    if (factorialCache[n]) return factorialCache[n];
    
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    factorialCache[n] = result;
    return result;
}

// Memory functions
function ms() { // Memory Store (prepend to list)
    try {
        const result = parseFloat(display.value);
        if (!isNaN(result)) {
            memory.unshift(result); // Add to the beginning of the array
            showMemoryList(); // Update the memory list display
            currentExpression = result.toString(); // Keep the result on display
        }
    } catch (e) {
        display.value = 'Error';
    }
}

function mc() { // Memory Clear
    memory = [];
    showMemoryList(); // Clear the memory list display
}

function showMemoryList() {
    const memoryListDisplay = document.getElementById('memoryList');
    const calculatorElement = document.querySelector('.calculator'); // Get the calculator element

    if (memoryListDisplay && calculatorElement) {
        if (memory.length === 0) {
            memoryListDisplay.innerHTML = '<h3>Memory:</h3><p>No stored memory.</p>';
        } else {
            memoryListDisplay.innerHTML = '<h3>Memory:</h3>' + memory.map((item, index) => `<p>${index + 1}. ${item}</p>`).join('');
        }

        // Toggle the 'active' class on the memory list for its slide effect
        memoryListDisplay.classList.toggle('active');

        // Toggle the 'active-memory-list' class on the calculator for its margin shift
        calculatorElement.classList.toggle('active-memory-list');
    }
}


// Custom functions for the parser
function squareFunc(x) { return x * x; }
function cubeFunc(x) { return x * x * x; }
function inverseFunc(x) { return 1 / x; }
function factorialFunc(x) { return factorial(x); }
function powFunc(x, y) { return Math.pow(x, y); } // xʸ -> powFunc(x,y)
function yrootFunc(y, x) { return Math.pow(x, 1/y); } // y√x -> yrootFunc(y,x)
function cbrtFunc(x) { return Math.cbrt(x); } // New function for cbrt

// Custom parser to handle operator precedence and functions (Shunting-yard algorithm)
function evaluateExpression(expression) {
    // Stage 1: Replace user-facing symbols/functions with internal evaluable forms
    expression = expression.replace(/π/g, 'Math.PI');
    expression = expression.replace(/e(?!xp)/g, 'Math.E'); // Prevent replacing 'e' in 'exp'
    
    // For visual representations from direct apply functions
    expression = expression.replace(/1\/\((.+?)\)/g, 'inverseFunc($1)'); // 1/(X)
    expression = expression.replace(/\((.+?)\)²/g, 'squareFunc($1)');     // (X)²
    expression = expression.replace(/\((.+?)\)³/g, 'cubeFunc($1)');       // (X)³
    expression = expression.replace(/\((.+?)\)!/g, 'factorialFunc($1)');   // (X)!
    expression = expression.replace(/(\d+)!/g, 'factorialFunc($1)');      // X! (if no parens)
    expression = expression.replace(/\|(.+?)\|/g, 'Math.abs($1)');        // |X|
    expression = expression.replace(/e\^(.+?)/g, 'Math.exp($1)');         // e^(X)

    // For functions that are appended as func(
    // REMOVED: expression = expression.replace(/_LN_\(/g, 'Math.log('); // Use unambiguous internal names
    // REMOVED: expression = expression.replace(/_LOG10_\(/g, 'Math.log10('); // Use unambiguous internal names
    expression = expression.replace(/√\(/g, 'Math.sqrt('); // New line for √
    expression = expression.replace(/cbrt\(/g, 'cbrtFunc('); // New line for cbrt
    expression = expression.replace(/yroot\(/g, 'yrootFunc(');
    expression = expression.replace(/pow\(/g, 'powFunc(');

    // Ensure multiplication is explicit for function calls and parentheses
    expression = expression.replace(/(\d+\.?\d*|\)|\.E|\.PI|[πe])(sin|cos|tan|Math\.log|Math\.log10|Math\.sqrt|squareFunc|cubeFunc|cbrtFunc|inverseFunc|factorialFunc|Math\.abs|yrootFunc|powFunc|Math\.exp)/g, '$1*$2');
    expression = expression.replace(/(\d+\.?\d*|\)|\.E|\.PI|[πe])(\()/g, '$1*$2');
    expression = expression.replace(/(\))((\d+\.?\d*|Math\.PI|Math\.E|[πe]))/g, '$1*$2');

    // Unary minus handling: Replace leading '-' or '-' after an operator/paren with a placeholder '~'
    expression = expression.replace(/(^|[^0-9\.)])-/g, '$1~');

    const operators = {
        '+': { precedence: 1, associativity: 'left', type: 'binary' },
        '-': { precedence: 1, associativity: 'left', type: 'binary' },
        '*': { precedence: 2, associativity: 'left', type: 'binary' },
        '/': { precedence: 2, associativity: 'left', type: 'binary' },
        '^': { precedence: 3, associativity: 'right', type: 'binary' },
        '~': { precedence: 4, associativity: 'right', type: 'unary' }, // Unary minus
        // Unary postfix operators (factorial) usually highest precedence, left associative
        'factorialFunc': { precedence: 5, associativity: 'left', type: 'unary' },
        '%': { precedence: 5, associativity: 'left', type: 'unary_postfix' } // Percentage as postfix operator
    };

    // Functions that take one argument
    const functions = ['sin', 'cos', 'tan', '_LOG10_', '_LN_', 'Math.sqrt', 'squareFunc', 'cubeFunc', 'cbrtFunc', 'inverseFunc', 'factorialFunc', 'Math.abs', 'Math.exp'];
    // Functions that take two arguments (like pow(x,y) and yroot(y,x))
    const binaryFunctions = ['powFunc', 'yrootFunc'];
    
    const outputQueue = [];
    const operatorStack = [];
    
    // Regular expression to match numbers (including floats and scientific notation), operators, functions, parentheses, and constants
    // Ensure Math.log10 is before Math.log to avoid partial matches
    const tokenRegex = /(\d+\.?\d*(?:E[+\-]?\d+)?)|(Math\.PI|Math\.E)|([+\-*\/%^])|(sin|cos|tan|_LOG10_|_LN_|Math\.sqrt|squareFunc|cubeFunc|cbrtFunc|inverseFunc|factorialFunc|Math\.abs|yrootFunc|powFunc|Math\.exp)|(\(|\)|~|,)/g; // Use unambiguous internal names
    
    // Tokenize the expression
    const tokenize = (expr) => {
        const tokens = [];
        let match;
        tokenRegex.lastIndex = 0; 
        while ((match = tokenRegex.exec(expr)) !== null) {
            tokens.push(match[0]);
        }
        return tokens;
    };

    const tokens = tokenize(expression);
    
    const peekStack = (stack) => stack[stack.length - 1];

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (!isNaN(parseFloat(token)) || token === 'Math.PI' || token === 'Math.E') { // Numbers and constants
            outputQueue.push(token);
        } else if (functions.includes(token) || binaryFunctions.includes(token)) { // Functions
            operatorStack.push(token);
        } else if (token === '(') {
            operatorStack.push(token);
        } else if (token === ')') {
            while (operatorStack.length > 0 && peekStack(operatorStack) !== '(') {
                outputQueue.push(operatorStack.pop());
            }
            if (operatorStack.length === 0 || peekStack(operatorStack) !== '(') {
                throw new Error("Mismatched parentheses");
            }
            operatorStack.pop(); // Pop '('
            if (functions.includes(peekStack(operatorStack)) || binaryFunctions.includes(peekStack(operatorStack))) { // If there's a function before '(', pop it
                outputQueue.push(operatorStack.pop());
            }
        } else if (token === ',') { // Handle comma for multi-argument functions
            while (operatorStack.length > 0 && peekStack(operatorStack) !== '(') {
                outputQueue.push(operatorStack.pop());
            }
            if (operatorStack.length === 0) {
                throw new Error("Syntax Error: Comma outside function arguments or mismatched parentheses.");
            }
        } else if (operators.hasOwnProperty(token)) { // Operators
            const op1 = operators[token];
            let op2Token = peekStack(operatorStack);
            let op2 = operators[op2Token];

            if (op1.type === 'unary_postfix') { // For postfix operators like %
                outputQueue.push(token); // Push directly to output queue
            } else { // Standard infix/prefix operator handling
                while (
                    op2Token &&
                    op2Token !== '(' &&
                    (op2 && ((op1.associativity === 'left' && op1.precedence <= op2.precedence) ||
                            (op1.associativity === 'right' && op1.precedence < op2.precedence)))
                ) {
                    outputQueue.push(operatorStack.pop());
                    op2Token = peekStack(operatorStack);
                    op2 = operators[op2Token];
                }
                operatorStack.push(token);
            }
        } else {
            throw new Error(`Unknown token: ${token}`);
        }
    }

    while (operatorStack.length > 0) {
        const op = operatorStack.pop();
        if (op === '(' || op === ')') {
            throw new Error("Mismatched parentheses");
        }
        outputQueue.push(op);
    }
    return evaluateRPN(outputQueue);
}

function evaluateRPN(rpnQueue) {
    const stack = [];
    for (const token of rpnQueue) {
        if (!isNaN(parseFloat(token))) { // Numbers
            stack.push(parseFloat(token));
        } else if (token === 'Math.PI') { // Math.PI constant
            stack.push(Math.PI);
        } else if (token === 'Math.E') { // Math.E constant
            stack.push(Math.E);
        } else if (token === '+') {
            if (stack.length < 2) throw new Error("Invalid RPN expression: not enough operands for +");
            const op2 = stack.pop(); const op1 = stack.pop();
            stack.push(op1 + op2);
        } else if (token === '-') {
            if (stack.length < 2) throw new Error("Invalid RPN expression: not enough operands for -");
            const op2 = stack.pop(); const op1 = stack.pop();
            stack.push(op1 - op2);
        } else if (token === '*') {
            if (stack.length < 2) throw new Error("Invalid RPN expression: not enough operands for *");
            const op2 = stack.pop(); const op1 = stack.pop();
            stack.push(op1 * op2);
        } else if (token === '/') {
            if (stack.length < 2) throw new Error("Invalid RPN expression: not enough operands for /");
            const op2 = stack.pop(); const op1 = stack.pop();
            stack.push(op1 / op2);
        } else if (token === '^') {
            if (stack.length < 2) throw new Error("Invalid RPN expression: not enough operands for ^");
            const op2 = stack.pop(); const op1 = stack.pop();
            stack.push(Math.pow(op1, op2));
        } else if (token === '~') { // Unary minus evaluation
            if (stack.length < 1) throw new Error("Invalid RPN expression: not enough operands for unary minus");
            const op = stack.pop();
            stack.push(-op);
        } else if (token === 'factorialFunc') {
            if (stack.length < 1) throw new Error("Invalid RPN expression: not enough operands for factorial");
            const operand = stack.pop();
            stack.push(factorial(operand));
        } else if (token === 'sin') {
            if (stack.length < 1) throw new Error("Invalid RPN expression: not enough operands for sin");
            let operand = stack.pop();
            if (!radMode) operand = operand * (Math.PI / 180);
            stack.push(Math.sin(operand));
        } else if (token === 'cos') {
            if (stack.length < 1) throw new Error("Invalid RPN expression: not enough operands for cos");
            let operand = stack.pop();
            if (!radMode) operand = operand * (Math.PI / 180);
            stack.push(Math.cos(operand));
        } else if (token === 'tan') {
            if (stack.length < 1) throw new Error("Invalid RPN expression: not enough operands for tan");
            let operand = stack.pop();
            if (!radMode) operand = operand * (Math.PI / 180);
            stack.push(Math.tan(operand));
        } else if (token === '_LOG10_') { // log base 10 (unambiguous)
            if (stack.length < 1) throw new Error("Invalid RPN expression: not enough operands for _LOG10_");
            const operand = stack.pop();
            stack.push(Math.log10(operand));
        } else if (token === '_LN_') {   // natural log (unambiguous)
            if (stack.length < 1) throw new Error("Invalid RPN expression: not enough operands for _LN_");
            const operand = stack.pop();
            stack.push(Math.log(operand));
        } else if (token === 'Math.sqrt') {
            if (stack.length < 1) throw new Error("Invalid RPN expression: not enough operands for sqrt");
            const operand = stack.pop();
            stack.push(Math.sqrt(operand));
        } else if (token === 'squareFunc') {
            if (stack.length < 1) throw new Error("Invalid RPN expression: not enough operands for squareFunc");
            const operand = stack.pop();
            stack.push(squareFunc(operand));
        } else if (token === 'cubeFunc') {
            if (stack.length < 1) throw new Error("Invalid RPN expression: not enough operands for cubeFunc");
            const operand = stack.pop();
            stack.push(cubeFunc(operand));
        } else if (token === 'cbrtFunc') {
            if (stack.length < 1) throw new Error("Invalid RPN expression: not enough operands for cbrtFunc");
            const operand = stack.pop();
            stack.push(cbrtFunc(operand));
        } else if (token === 'inverseFunc') {
            if (stack.length < 1) throw new Error("Invalid RPN expression: not enough operands for inverseFunc");
            const operand = stack.pop();
            stack.push(inverseFunc(operand));
        } else if (token === 'Math.abs') {
            if (stack.length < 1) throw new Error("Invalid RPN expression: not enough operands for abs");
            const operand = stack.pop();
            stack.push(Math.abs(operand));
        } else if (token === 'Math.exp') {
            if (stack.length < 1) throw new Error("Invalid RPN expression: not enough operands for exp");
            const operand = stack.pop();
            stack.push(Math.exp(operand));
        } else if (token === '%') {
            if (stack.length < 1) throw new Error("Invalid RPN expression: not enough operands for %");
            const operand = stack.pop();
            stack.push(operand / 100);
        } else if (token === 'powFunc') { // xʸ (binary function in our context)
            if (stack.length < 2) throw new Error("Invalid RPN expression: not enough operands for " + token);
            const op2 = stack.pop(); // Power (y)
            const op1 = stack.pop(); // Base (x)
            stack.push(powFunc(op1, op2));
        } else if (token === 'yrootFunc') { // y√x (binary function)
            if (stack.length < 2) throw new Error("Invalid RPN expression: not enough operands for " + token);
            const op2 = stack.pop(); // x
            const op1 = stack.pop(); // y
            stack.push(yrootFunc(op1, op2));
        }
        else {
            throw new Error("Unknown operator/function in RPN: " + token);
        }
    }
    if (stack.length !== 1) throw new Error("Invalid RPN expression: too many operands");
    return stack.pop();
}

function calculate() {
    try {
        let result = evaluateExpression(currentExpression);
        
        // Add rounding for floating-point precision issues
        const epsilon = 1e-12; // Define a small number
        if (Math.abs(result) < epsilon) {
            result = 0;
        } else if (isRoundingEnabled) {
            result = parseFloat(result.toFixed(10)); // Apply general rounding if enabled
        }

        currentExpression = result.toString();
        display.value = result;
    } catch (error) {
        display.value = 'Error';
        currentExpression = ''; // Reset expression on error
        console.error("Calculation Error:", error);
    }
}

// Scientific button handlers
function scientificFunc(func) {
    const prefixFunctions = ['sin', 'cos', 'tan']; // Trig functions
    const logFunctions = ['ln', 'log']; // Logarithms
    const rootFunctions = ['sqrt', 'cbrt', 'yroot']; // Roots
    const powerFunctions = ['pow']; // x^y

    // Direct apply functions: evaluate current expression, apply function, update display
    const directApplyFunctions = {
        'square': { internal: 'squareFunc', visual: (val) => `(${val})²` },
        'cube': { internal: 'cubeFunc', visual: (val) => `(${val})³` },
        'inverse': { internal: 'inverseFunc', visual: (val) => `1/(${val})` },
        'abs': { internal: 'Math.abs', visual: (val) => `|${val}|` },
        'factorial': { internal: 'factorialFunc', visual: (val) => {
            // More precise visual for factorial if currentExpression is just a number
            return currentExpression.match(/^\d+$/) ? `${val}!` : `(${val})!`;
        } },
        'exp': { internal: 'Math.exp', visual: (val) => `e^(${val})` }
    };

    if (prefixFunctions.includes(func)) {
        appendToDisplay(func + '(');
    } else if (logFunctions.includes(func)) {
        const internalFunc = (func === 'ln' ? '_LN_' : '_LOG10_'); // Use unambiguous internal names
        appendToDisplay(internalFunc + '(');
    } else if (rootFunctions.includes(func)) {
        // yroot is handled as infix #ROOT#. Only sqrt and cbrt are prefix roots here.
        if (func === 'sqrt') { // Display '√(' for sqrt
            appendToDisplay('√(');
        } else if (func === 'cbrt') { // cbrt now displays cbrt( internally
            appendToDisplay('cbrt(');
        } else { // yroot: captures 'y' and sets up yrootFunc(y,
            try {
                const yValue = evaluateExpression(currentExpression); // Get value for 'y'
                if (isNaN(yValue)) {
                    display.value = 'Error: Enter Y value first';
                    currentExpression = '';
                    return;
                }
                currentExpression = `yrootFunc(${yValue},`; // Set internal expression
                display.value = `${yValue}√(`; // Set visual display
            } catch (error) {
                display.value = 'Error';
                currentExpression = '';
                console.error("Y-root function error:", error);
            }
        }
    } else if (powerFunctions.includes(func)) {
        appendToDisplay('^'); // Append '^' for infix power operation
    } else if (directApplyFunctions.hasOwnProperty(func)) {
        try {
            let valueToOperate;
            if (func === 'exp' && currentExpression === '') {
                valueToOperate = 1; // Default to exp(1) if display is empty
            } else {
                valueToOperate = evaluateExpression(currentExpression);
            }
            
            if (isNaN(valueToOperate)) {
                display.value = 'Error';
                currentExpression = '';
                return;
            }
            
            let result;
            let visualDisplay = '';
            
            switch (func) {
                case 'inverse':
                    if (valueToOperate === 0) throw new Error("Division by zero");
                    result = 1 / valueToOperate;
                    visualDisplay = directApplyFunctions.inverse.visual(currentExpression);
                    break;
                case 'square':
                    result = valueToOperate * valueToOperate;
                    visualDisplay = directApplyFunctions.square.visual(currentExpression);
                    break;
                case 'cube':
                    result = valueToOperate * valueToOperate * valueToOperate;
                    visualDisplay = directApplyFunctions.cube.visual(currentExpression);
                    break;
                case 'factorial':
                    result = factorial(valueToOperate); // Use direct factorial function
                    visualDisplay = directApplyFunctions.factorial.visual(currentExpression);
                    break;
                case 'abs':
                    result = Math.abs(valueToOperate);
                    visualDisplay = directApplyFunctions.abs.visual(currentExpression);
                    break;
                case 'exp': // e^x
                    result = Math.exp(valueToOperate);
                    visualDisplay = directApplyFunctions.exp.visual(currentExpression);
                    break;
                default:
                    throw new Error("Unknown direct apply function");
            }

            currentExpression = result.toString();
            display.value = visualDisplay;

        } catch (error) {
            display.value = 'Error';
            currentExpression = '';
            console.error("Scientific Function Error:", error);
        }
    }
}

// For +/- button (sign change)
function toggleSign() {
    try {
        let valueToNegate = evaluateExpression(currentExpression); // Evaluate current expression
        if (isNaN(valueToNegate)) {
            display.value = 'Error';
            currentExpression = '';
            return;
        }
        let result = -valueToNegate;
        currentExpression = result.toString(); // Update internal expression with numerical result
        display.value = currentExpression; // Update display with numerical result (now negative)
    } catch (error) {
        display.value = 'Error';
        currentExpression = '';
        console.error("Toggle Sign Error:", error);
    }
}

function toggleRadDeg() {
    radMode = !radMode;
    const radDegModeIndicator = document.getElementById('radDegMode');
    if (radDegModeIndicator) {
        radDegModeIndicator.textContent = radMode ? 'RAD' : 'DEG';
    }
}

// New function to toggle rounding mode
function toggleRounding() {
    isRoundingEnabled = !isRoundingEnabled;
    const roundingModeIndicator = document.getElementById('roundingMode');
    if (roundingModeIndicator) {
        roundingModeIndicator.textContent = isRoundingEnabled ? 'ROUND' : 'PREC';
    }
}


// Global flag to prevent infinite loops in bidirectional conversions
let isUpdating = false;

// Unit Converter Logic
function updateLengthFields(eventTarget) {
    if (isUpdating) return;
    isUpdating = true;

    const fromAmountInput = document.getElementById('fromLengthAmount');
    const toAmountInput = document.getElementById('toLengthAmount');
    const fromUnitSelect = document.getElementById('lengthUnit1');
    const toUnitSelect = document.getElementById('lengthUnit2');
    const errorDisplay = document.getElementById('lengthError');
    errorDisplay.textContent = '';

    let fromValue = parseFloat(fromAmountInput.value);
    let toValue = parseFloat(toAmountInput.value);
    const fromUnit = fromUnitSelect.value;
    const toUnit = toUnitSelect.value;

    let amountToConvert;
    let sourceUnit;
    let targetInput;
    let targetUnit;

    const conversions = {
        'nm': 1e-9,  // Nanometer
        'um': 1e-6,  // Micrometer
        'mm': 0.001, // Millimeter
        'cm': 0.01,  // Centimeter
        'm': 1,      // Meter
        'km': 1000,  // Kilometer
        'in': 0.0254, // Inch
        'ft': 0.3048, // Foot
        'yd': 0.9144, // Yard
        'mi': 1609.34 // Mile
    };

    try {
        if (eventTarget === fromAmountInput || eventTarget === fromUnitSelect || eventTarget === null || eventTarget === toUnitSelect) {
            // User typed in 'from' amount, or changed 'from' unit, or 'to' unit, or initial load
            amountToConvert = fromValue;
            sourceUnit = fromUnit;
            targetInput = toAmountInput;
            targetUnit = toUnit;
        } else if (eventTarget === toAmountInput) {
            // User typed in 'to' amount (this means we convert back to 'fromAmountInput')
            amountToConvert = toValue;
            sourceUnit = toUnit;
            targetInput = fromAmountInput;
            targetUnit = fromUnit;
        }

        if (isNaN(amountToConvert)) {
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        if (sourceUnit === targetUnit) {
            if (targetInput) targetInput.value = amountToConvert;
            isUpdating = false;
            return;
        }
        
        // Handle cases where the unit might not be in the conversions map
        if (!conversions.hasOwnProperty(sourceUnit) || !conversions.hasOwnProperty(targetUnit)) {
            errorDisplay.textContent = 'Invalid unit selected.';
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        let result = amountToConvert * (conversions[sourceUnit] / conversions[targetUnit]);
        if (targetInput) targetInput.value = parseFloat(result.toPrecision(15));

    } catch (error) {
        errorDisplay.textContent = 'An error occurred during conversion.';
        console.error('Length conversion error:', error);
        if (targetInput) targetInput.value = ''; // Clear output on error
    } finally {
        isUpdating = false;
    }
}

function updateMassFields(eventTarget) {
    if (isUpdating) return;
    isUpdating = true;

    const fromAmountInput = document.getElementById('fromMassAmount');
    const toAmountInput = document.getElementById('toMassAmount');
    const fromUnitSelect = document.getElementById('massUnit1');
    const toUnitSelect = document.getElementById('massUnit2');
    const errorDisplay = document.getElementById('massError');
    errorDisplay.textContent = '';

    let fromValue = parseFloat(fromAmountInput.value);
    let toValue = parseFloat(toAmountInput.value);
    const fromUnit = fromUnitSelect.value;
    const toUnit = toUnitSelect.value;

    let amountToConvert;
    let sourceUnit;
    let targetInput;
    let targetUnit;

    const conversions = {
        'pg': 1e-12, // Picogram
        'ng': 1e-9,  // Nanogram
        'ug': 1e-6,  // Microgram
        'mg': 0.001, // Milligram
        'cg': 0.01,  // Centigram
        'dg': 0.1,   // Decigram
        'g': 1,      // Gram (base unit)
        'dag': 10,   // Decagram
        'hg': 100,   // Hectogram
        'kg': 1000,  // Kilogram
        'q': 1e5,    // Quintal (Metric)
        't': 1e6,    // Metric Ton (Tonne)
        'oz': 28.3495, // Ounce (1 oz = 28.3495 g)
        'lb': 453.592, // Pound (1 lb = 453.592 g)
        'st': 6350.29, // Stone (1 st = 6350.29 g)
        'short_ton': 907185, // US Short Ton (1 short ton = 907185 g)
    };

    try {
        if (eventTarget === fromAmountInput || eventTarget === fromUnitSelect || eventTarget === null || eventTarget === toUnitSelect) {
            // User typed in 'from' amount, or changed 'from' unit, or 'to' unit, or initial load
            amountToConvert = fromValue;
            sourceUnit = fromUnit;
            targetInput = toAmountInput;
            targetUnit = toUnit;
        } else if (eventTarget === toAmountInput) {
            // User typed in 'to' amount (this means we convert back to 'fromAmountInput')
            amountToConvert = toValue;
            sourceUnit = toUnit;
            targetInput = fromAmountInput;
            targetUnit = fromUnit;
        }

        if (isNaN(amountToConvert)) {
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        if (sourceUnit === targetUnit) {
            if (targetInput) targetInput.value = amountToConvert;
            isUpdating = false;
            return;
        }

        // Handle cases where the unit might not be in the conversions map
        if (!conversions.hasOwnProperty(sourceUnit) || !conversions.hasOwnProperty(targetUnit)) {
            errorDisplay.textContent = 'Invalid unit selected.';
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        let result = amountToConvert * (conversions[sourceUnit] / conversions[targetUnit]);
        if (targetInput) targetInput.value = parseFloat(result.toPrecision(15));

    } catch (error) {
        errorDisplay.textContent = 'An error occurred during conversion.';
        console.error('Mass conversion error:', error);
        if (targetInput) targetInput.value = ''; // Clear output on error
    } finally {
        isUpdating = false;
    }
}

function updateLiquidVolumeFields(eventTarget) {
    if (isUpdating) return;
    isUpdating = true;

    const fromAmountInput = document.getElementById('fromLiquidVolumeAmount');
    const toAmountInput = document.getElementById('toLiquidVolumeAmount');
    const fromUnitSelect = document.getElementById('liquidVolumeUnit1');
    const toUnitSelect = document.getElementById('liquidVolumeUnit2');
    const errorDisplay = document.getElementById('liquidVolumeError');
    errorDisplay.textContent = '';

    let fromValue = parseFloat(fromAmountInput.value);
    let toValue = parseFloat(toAmountInput.value);
    const fromUnit = fromUnitSelect.value;
    const toUnit = toUnitSelect.value;

    let amountToConvert;
    let sourceUnit;
    let targetInput;
    let targetUnit;

    const conversions = {
        'milliliter': 0.001,       // Milliliters (1 L = 1000 ml)
        'cubic_centimeter': 0.001, // Cubic Centimeters (1 cm³ = 1 ml = 0.001 L)
        'centiliter': 0.01,        // Centiliters (1 L = 100 cl)
        'deciliter': 0.1,          // Deciliters (1 L = 10 dl)
        'liter': 1,                // Liters (base unit)
        'gallon': 3.78541,         // US Liquid Gallons
        'cubic_meter': 1000,       // Cubic Meters (will be in general volume also)
        'kiloliter': 1000,         // Kiloliters (1 kl = 1000 L)
    };

    try {
        if (eventTarget === fromAmountInput || eventTarget === fromUnitSelect || eventTarget === null || eventTarget === toUnitSelect) {
            amountToConvert = fromValue;
            sourceUnit = fromUnit;
            targetInput = toAmountInput;
            targetUnit = toUnit;
        } else if (eventTarget === toAmountInput) {
            // User typed in 'to' amount (this means we convert back to 'fromAmountInput')
            amountToConvert = toValue;
            sourceUnit = toUnit;
            targetInput = fromAmountInput;
            targetUnit = fromUnit;
        }

        if (isNaN(amountToConvert)) {
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        if (sourceUnit === targetUnit) {
            if (targetInput) targetInput.value = amountToConvert;
            isUpdating = false;
            return;
        }

        if (!conversions.hasOwnProperty(sourceUnit) || !conversions.hasOwnProperty(targetUnit)) {
            errorDisplay.textContent = 'Invalid unit selected.';
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        let result = amountToConvert * (conversions[sourceUnit] / conversions[targetUnit]);
        if (targetInput) targetInput.value = parseFloat(result.toPrecision(15)); // Use 15 significant figures

    } catch (error) {
        errorDisplay.textContent = 'An error occurred during conversion.';
        console.error('Liquid volume conversion error:', error);
        if (targetInput) targetInput.value = ''; // Clear output on error
    } finally {
        isUpdating = false;
    }
}

function updateGeneralVolumeFields(eventTarget) {
    if (isUpdating) return;
    isUpdating = true;

    const fromAmountInput = document.getElementById('fromGeneralVolumeAmount');
    const toAmountInput = document.getElementById('toGeneralVolumeAmount');
    const fromUnitSelect = document.getElementById('generalVolumeUnit1');
    const toUnitSelect = document.getElementById('generalVolumeUnit2');
    const errorDisplay = document.getElementById('generalVolumeError');
    errorDisplay.textContent = '';

    let fromValue = parseFloat(fromAmountInput.value);
    let toValue = parseFloat(toAmountInput.value);
    const fromUnit = fromUnitSelect.value;
    const toUnit = toUnitSelect.value;

    let amountToConvert;
    let sourceUnit;
    let targetInput;
    let targetUnit;

    // Base unit: Cubic Meter (m³)
    const conversions = {
        'cubic_millimeter': 1e-9,  // 1 mm³ = 1e-9 m³
        'cubic_centimeter': 1e-6,  // 1 cm³ = 1e-6 m³
        'cubic_meter': 1,          // Base unit
        'cubic_kilometer': 1e9,    // 1 km³ = 1e9 m³
        'cubic_inch': 0.0000163871, // 1 in³ = 0.0000163871 m³
        'cubic_foot': 0.0283168,   // 1 ft³ = 0.0283168 m³
        'cubic_yard': 0.764555,    // 1 yd³ = 0.764555 m³
        'liter': 0.001             // 1 L = 0.001 m³
    };

    try {
        if (eventTarget === fromAmountInput || eventTarget === fromUnitSelect || eventTarget === null || eventTarget === toUnitSelect) {
            amountToConvert = fromValue;
            sourceUnit = fromUnit;
            targetInput = toAmountInput;
            targetUnit = toUnit;
        } else if (eventTarget === toAmountInput) {
            amountToConvert = toValue;
            sourceUnit = toUnit;
            targetInput = fromAmountInput;
            targetUnit = fromUnit;
        }

        if (isNaN(amountToConvert)) {
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        if (sourceUnit === targetUnit) {
            if (targetInput) targetInput.value = amountToConvert;
            isUpdating = false;
            return;
        }

        if (!conversions.hasOwnProperty(sourceUnit) || !conversions.hasOwnProperty(targetUnit)) {
            errorDisplay.textContent = 'Invalid unit selected.';
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        let result = amountToConvert * (conversions[sourceUnit] / conversions[targetUnit]);
        if (targetInput) targetInput.value = parseFloat(result.toPrecision(15));

    } catch (error) {
        errorDisplay.textContent = 'An error occurred during conversion.';
        console.error('General volume conversion error:', error);
        if (targetInput) targetInput.value = '';
    } finally {
        isUpdating = false;
    }
}

function updateAreaFields(eventTarget) {
    if (isUpdating) return;
    isUpdating = true;

    const fromAmountInput = document.getElementById('fromAreaAmount');
    const toAmountInput = document.getElementById('toAreaAmount');
    const fromUnitSelect = document.getElementById('areaUnit1');
    const toUnitSelect = document.getElementById('areaUnit2');
    const errorDisplay = document.getElementById('areaError');
    errorDisplay.textContent = '';

    let fromValue = parseFloat(fromAmountInput.value);
    let toValue = parseFloat(toAmountInput.value);
    const fromUnit = fromUnitSelect.value;
    const toUnit = toUnitSelect.value;

    let amountToConvert;
    let sourceUnit;
    let targetInput;
    let targetUnit;

    // Base unit: Square Meter (m²)
    const conversions = {
        'sq_mm': 1e-6,    // 1 mm² = 1e-6 m²
        'sq_cm': 0.0001,  // 1 cm² = 0.0001 m²
        'sq_m': 1,        // Base unit
        'sq_km': 1e6,     // 1 km² = 1e6 m²
        'sq_in': 0.00064516, // 1 in² = 0.00064516 m²
        'sq_ft': 0.092903,  // 1 ft² = 0.092903 m²
        'sq_yd': 0.836127,  // 1 yd² = 0.836127 m²
        'acre': 4046.86,   // 1 acre = 4046.86 m²
        'hectare': 10000,  // 1 hectare = 10000 m²
        'sq_mi': 2589988   // 1 mi² = 2.589988e6 m²
    };

    try {
        if (eventTarget === fromAmountInput || eventTarget === fromUnitSelect || eventTarget === null || eventTarget === toUnitSelect) {
            amountToConvert = fromValue;
            sourceUnit = fromUnit;
            targetInput = toAmountInput;
            targetUnit = toUnit;
        } else if (eventTarget === toAmountInput) {
            amountToConvert = toValue;
            sourceUnit = toUnit;
            targetInput = fromAmountInput;
            targetUnit = fromUnit;
        }

        if (isNaN(amountToConvert)) {
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        if (sourceUnit === targetUnit) {
            if (targetInput) targetInput.value = amountToConvert;
            isUpdating = false;
            return;
        }

        if (!conversions.hasOwnProperty(sourceUnit) || !conversions.hasOwnProperty(targetUnit)) {
            errorDisplay.textContent = 'Invalid unit selected.';
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        let result = amountToConvert * (conversions[sourceUnit] / conversions[targetUnit]);
        if (targetInput) targetInput.value = parseFloat(result.toPrecision(15));

    } catch (error) {
        errorDisplay.textContent = 'An error occurred during conversion.';
        console.error('Area conversion error:', error);
        if (targetInput) targetInput.value = ''; // Clear output on error
    } finally {
        isUpdating = false;
    }
}

function updateTimeFields(eventTarget) {
    if (isUpdating) return;
    isUpdating = true;

    const fromAmountInput = document.getElementById('fromTimeAmount');
    const toAmountInput = document.getElementById('toTimeAmount');
    const fromUnitSelect = document.getElementById('timeUnit1');
    const toUnitSelect = document.getElementById('timeUnit2');
    const errorDisplay = document.getElementById('timeError');
    errorDisplay.textContent = '';

    let fromValue = parseFloat(fromAmountInput.value);
    let toValue = parseFloat(toAmountInput.value);
    const fromUnit = fromUnitSelect.value;
    const toUnit = toUnitSelect.value;

    let amountToConvert;
    let sourceUnit;
    let targetInput;
    let targetUnit;

    // Base unit: Second (s)
    const conversions = {
        'nanosecond': 1e-9,  // 1 ns = 1e-9 s
        'microsecond': 1e-6, // 1 µs = 1e-6 s
        'millisecond': 0.001, // 1 ms = 0.001 s
        'second': 1,         // Base unit
        'minute': 60,        // 1 min = 60 s
        'hour': 3600,        // 1 hr = 3600 s
        'day': 86400,        // 1 day = 86400 s
        'week': 604800,      // 1 week = 604800 s
        'month': 2629800,    // 1 month ≈ 30.4375 days = 2629800 s (average Gregorian month)
        'year': 31557600,    // 1 year ≈ 365.25 days = 31557600 s (average Gregorian year)
        'decade': 315576000, // 1 decade = 10 years
        'century': 3155760000 // 1 century = 100 years
    };

    try {
        if (eventTarget === fromAmountInput || eventTarget === fromUnitSelect || eventTarget === null || eventTarget === toUnitSelect) {
            amountToConvert = fromValue;
            sourceUnit = fromUnit;
            targetInput = toAmountInput;
            targetUnit = toUnit;
        } else if (eventTarget === toAmountInput) {
            amountToConvert = toValue;
            sourceUnit = toUnit;
            targetInput = fromAmountInput;
            targetUnit = fromUnit;
        }

        if (isNaN(amountToConvert)) {
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        if (sourceUnit === targetUnit) {
            if (targetInput) targetInput.value = amountToConvert;
            isUpdating = false;
            return;
        }

        if (!conversions.hasOwnProperty(sourceUnit) || !conversions.hasOwnProperty(targetUnit)) {
            errorDisplay.textContent = 'Invalid unit selected.';
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        let result = amountToConvert * (conversions[sourceUnit] / conversions[targetUnit]);
        if (targetInput) targetInput.value = parseFloat(result.toPrecision(15));

    } catch (error) {
        errorDisplay.textContent = 'An error occurred during conversion.';
        console.error('Time conversion error:', error);
        if (targetInput) targetInput.value = '';
    } finally {
        isUpdating = false;
    }
}

function updateSpeedFields(eventTarget) {
    if (isUpdating) return;
    isUpdating = true;

    const fromAmountInput = document.getElementById('fromSpeedAmount');
    const toAmountInput = document.getElementById('toSpeedAmount');
    const fromUnitSelect = document.getElementById('speedUnit1');
    const toUnitSelect = document.getElementById('speedUnit2');
    const errorDisplay = document.getElementById('speedError');
    errorDisplay.textContent = '';

    let fromValue = parseFloat(fromAmountInput.value);
    let toValue = parseFloat(toAmountInput.value);
    const fromUnit = fromUnitSelect.value;
    const toUnit = toUnitSelect.value;

    let amountToConvert;
    let sourceUnit;
    let targetInput;
    let targetUnit;

    // Base unit: Meters per Second (m/s)
    const conversions = {
        'mps': 1,           // Meters/second (base unit)
        'kmph': 1000 / 3600, // 1 km/h = 1000m / 3600s = 0.277778 m/s
        'mph': 1609.34 / 3600, // 1 mph = 1609.34m / 3600s = 0.44704 m/s
        'knot': 0.514444,    // 1 knot = 0.514444 m/s (nautical mile per hour)
        'mach': 343           // Mach 1 ≈ 343 m/s (at standard conditions)
    };

    try {
        if (eventTarget === fromAmountInput || eventTarget === fromUnitSelect || eventTarget === null || eventTarget === toUnitSelect) {
            amountToConvert = fromValue;
            sourceUnit = fromUnit;
            targetInput = toAmountInput;
            targetUnit = toUnit;
        } else if (eventTarget === toAmountInput) {
            amountToConvert = toValue;
            sourceUnit = toUnit;
            targetInput = fromAmountInput;
            targetUnit = fromUnit;
        }

        if (isNaN(amountToConvert)) {
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        if (sourceUnit === targetUnit) {
            if (targetInput) targetInput.value = amountToConvert;
            isUpdating = false;
            return;
        }

        if (!conversions.hasOwnProperty(sourceUnit) || !conversions.hasOwnProperty(targetUnit)) {
            errorDisplay.textContent = 'Invalid unit selected.';
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        let result = amountToConvert * (conversions[sourceUnit] / conversions[targetUnit]);
        if (targetInput) targetInput.value = parseFloat(result.toPrecision(15));

    } catch (error) {
        errorDisplay.textContent = 'An error occurred during conversion.';
        console.error('Speed conversion error:', error);
        if (targetInput) targetInput.value = ''; // Clear output on error
    } finally {
        isUpdating = false;
    }
}

function updateDigitalStorageFields(eventTarget) {
    if (isUpdating) return;
    isUpdating = true;

    const fromAmountInput = document.getElementById('fromDigitalStorageAmount');
    const toAmountInput = document.getElementById('toDigitalStorageAmount');
    const fromUnitSelect = document.getElementById('digitalStorageUnit1');
    const toUnitSelect = document.getElementById('digitalStorageUnit2');
    const errorDisplay = document.getElementById('digitalStorageError');
    errorDisplay.textContent = '';

    let fromValue = parseFloat(fromAmountInput.value);
    let toValue = parseFloat(toAmountInput.value);
    const fromUnit = fromUnitSelect.value;
    const toUnit = toUnitSelect.value;

    let amountToConvert;
    let sourceUnit;
    let targetInput;
    let targetUnit;

    // Base unit: Bit (b)
    const conversions = {
        'bit': 1,           // Base unit
        'byte': 8,          // 1 Byte = 8 bits
        'kilobit': 1000,    // 1 kilobit = 1000 bits
        'kilobyte': 8 * 1000, // 1 kilobyte = 8000 bits
        'megabit': 1000 * 1000, // 1 Megabit = 1e6 bits
        'megabyte': 8 * 1000 * 1000, // 1 Megabyte = 8e6 bits
        'gigabit': 1000 * 1000 * 1000, // 1 Gigabit = 1e9 bits
        'gigabyte': 8 * 1000 * 1000 * 1000, // 1 Gigabyte = 8e9 bits
        'terabit': 1000 * 1000 * 1000 * 1000, // 1 Terabit = 1e12 bits
        'terabyte': 8 * 1000 * 1000 * 1000 * 1000 // 1 Terabyte = 8e12 bits
    };

    try {
        if (eventTarget === fromAmountInput || eventTarget === fromUnitSelect || eventTarget === null || eventTarget === toUnitSelect) {
            amountToConvert = fromValue;
            sourceUnit = fromUnit;
            targetInput = toAmountInput;
            targetUnit = toUnit;
        } else if (eventTarget === toAmountInput) {
            amountToConvert = toValue;
            sourceUnit = toUnit;
            targetInput = fromAmountInput;
            targetUnit = fromUnit;
        }

        if (isNaN(amountToConvert)) {
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        if (sourceUnit === targetUnit) {
            if (targetInput) targetInput.value = amountToConvert;
            isUpdating = false;
            return;
        }

        if (!conversions.hasOwnProperty(sourceUnit) || !conversions.hasOwnProperty(targetUnit)) {
            errorDisplay.textContent = 'Invalid unit selected.';
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        let result = amountToConvert * (conversions[sourceUnit] / conversions[targetUnit]);
        if (targetInput) targetInput.value = parseFloat(result.toPrecision(15));

    } catch (error) {
        errorDisplay.textContent = 'An error occurred during conversion.';
        console.error('Digital storage conversion error:', error);
        if (targetInput) targetInput.value = '';
    } finally {
        isUpdating = false;
    }
}

function updateEnergyFields(eventTarget) {
    if (isUpdating) return;
    isUpdating = true;

    const fromAmountInput = document.getElementById('fromEnergyAmount');
    const toAmountInput = document.getElementById('toEnergyAmount');
    const energyUnit1Select = document.getElementById('energyUnit1');
    const energyUnit2Select = document.getElementById('energyUnit2');

    const errorDisplay = document.getElementById('energyError');
    errorDisplay.textContent = '';

    let fromValue = parseFloat(fromAmountInput.value);
    let toValue = parseFloat(toAmountInput.value);
    const fromUnit = energyUnit1Select.value;
    const toUnit = energyUnit2Select.value;

    let amountToConvert;
    let sourceUnit;
    let targetInput;
    let targetUnit;

    // Base unit: Joule (J)
    const conversions = {
        'joule': 1,               // Base unit
        'kilojoule': 1000,        // 1 kJ = 1000 J
        'calorie': 4.184,         // 1 cal = 4.184 J
        'kcal': 4184,             // 1 kcal = 4184 J (food calorie)
        'wh': 3600,               // 1 Wh = 3600 J
        'kwh': 3.6e6,             // 1 kWh = 3.6e6 J
        'electronvolt': 1.60218e-19, // 1 eV = 1.60218e-19 J
        'btu': 1055.06            // 1 BTU = 1055.06 J
    };

    try {
        if (eventTarget === fromAmountInput || eventTarget === energyUnit1Select || eventTarget === null || eventTarget === energyUnit2Select) {
            amountToConvert = fromValue;
            sourceUnit = fromUnit;
            targetInput = toAmountInput;
            targetUnit = toUnit;
        } else if (eventTarget === toAmountInput) {
            amountToConvert = toValue;
            sourceUnit = toUnit;
            targetInput = fromAmountInput;
            targetUnit = fromUnit;
        }

        if (isNaN(amountToConvert)) {
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        if (sourceUnit === targetUnit) {
            if (targetInput) targetInput.value = amountToConvert;
            isUpdating = false;
            return;
        }

        if (!conversions.hasOwnProperty(sourceUnit) || !conversions.hasOwnProperty(targetUnit)) {
            errorDisplay.textContent = 'Invalid unit selected.';
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        let result = amountToConvert * (conversions[sourceUnit] / conversions[targetUnit]);
        if (targetInput) targetInput.value = parseFloat(result.toPrecision(15));

    } catch (error) {
        errorDisplay.textContent = 'An error occurred during conversion.';
        console.error('Energy conversion error:', error);
        if (targetInput) targetInput.value = ''; // Clear output on error
    } finally {
        isUpdating = false;
    }
}

function updatePressureFields(eventTarget) {
    if (isUpdating) return;
    isUpdating = true;

    const fromAmountInput = document.getElementById('fromPressureAmount');
    const toAmountInput = document.getElementById('toPressureAmount');
    const fromUnitSelect = document.getElementById('pressureUnit1');
    const toUnitSelect = document.getElementById('pressureUnit2');
    const errorDisplay = document.getElementById('pressureError');
    errorDisplay.textContent = '';

    let fromValue = parseFloat(fromAmountInput.value);
    let toValue = parseFloat(toAmountInput.value);
    const fromUnit = fromUnitSelect.value;
    const toUnit = toUnitSelect.value;

    let amountToConvert;
    let sourceUnit;
    let targetInput;
    let targetUnit;

    // Base unit: Pascal (Pa)
    const conversions = {
        'pascal': 1,         // Base unit
        'kilopascal': 1000,  // 1 kPa = 1000 Pa
        'psi': 6894.76,      // 1 psi = 6894.76 Pa
        'bar': 100000,       // 1 bar = 100000 Pa
        'atm': 101325,       // 1 atm = 101325 Pa
        'torr': 133.322      // 1 Torr = 133.322 Pa
    };

    try {
        if (eventTarget === fromAmountInput || eventTarget === fromUnitSelect || eventTarget === null || eventTarget === toUnitSelect) {
            amountToConvert = fromValue;
            sourceUnit = fromUnit;
            targetInput = toAmountInput;
            targetUnit = toUnit;
        } else if (eventTarget === toAmountInput) {
            amountToConvert = toValue;
            sourceUnit = toUnit;
            targetInput = fromAmountInput;
            targetUnit = fromUnit;
        }

        if (isNaN(amountToConvert)) {
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        if (sourceUnit === targetUnit) {
            if (targetInput) targetInput.value = amountToConvert;
            isUpdating = false;
            return;
        }

        if (!conversions.hasOwnProperty(sourceUnit) || !conversions.hasOwnProperty(targetUnit)) {
            errorDisplay.textContent = 'Invalid unit selected.';
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        let result = amountToConvert * (conversions[sourceUnit] / conversions[targetUnit]);
        if (targetInput) targetInput.value = parseFloat(result.toPrecision(15));

    } catch (error) {
        errorDisplay.textContent = 'An error occurred during conversion.';
        console.error('Pressure conversion error:', error);
        if (targetInput) targetInput.value = ''; // Clear output on error
    } finally {
        isUpdating = false;
    }
}

function updateAngleFields(eventTarget) {
    if (isUpdating) return;
    isUpdating = true;

    const fromAmountInput = document.getElementById('fromAngleAmount');
    const toAmountInput = document.getElementById('toAngleAmount');
    const fromUnitSelect = document.getElementById('angleUnit1');
    const toUnitSelect = document.getElementById('angleUnit2');
    const errorDisplay = document.getElementById('angleError');
    errorDisplay.textContent = '';

    let fromValue = parseFloat(fromAmountInput.value);
    let toValue = parseFloat(toAmountInput.value);
    const fromUnit = fromUnitSelect.value;
    const toUnit = toUnitSelect.value;

    let amountToConvert;
    let sourceUnit;
    let targetInput;
    let targetUnit;

    // Base unit: Degree (°)
    const conversions = {
        'degree': 1,           // Base unit
        'radian': 180 / Math.PI, // 1 rad = 180/PI degrees
        'gradian': 0.9          // 1 grad = 0.9 degrees
    };

    try {
        if (eventTarget === fromAmountInput || eventTarget === fromUnitSelect || eventTarget === null || eventTarget === toUnitSelect) {
            amountToConvert = fromValue;
            sourceUnit = fromUnit;
            targetInput = toAmountInput;
            targetUnit = toUnit;
        } else if (eventTarget === toAmountInput) {
            amountToConvert = toValue;
            sourceUnit = toUnit;
            targetInput = fromAmountInput;
            targetUnit = fromUnit;
        }

        if (isNaN(amountToConvert)) {
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        if (sourceUnit === targetUnit) {
            if (targetInput) targetInput.value = amountToConvert;
            isUpdating = false;
            return;
        }

        if (!conversions.hasOwnProperty(sourceUnit) || !conversions.hasOwnProperty(targetUnit)) {
            errorDisplay.textContent = 'Invalid unit selected.';
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        let result = amountToConvert * (conversions[sourceUnit] / conversions[targetUnit]);
        if (targetInput) targetInput.value = parseFloat(result.toPrecision(15));

    } catch (error) {
        errorDisplay.textContent = 'An error occurred during conversion.';
        console.error('Angle conversion error:', error);
        if (targetInput) targetInput.value = ''; // Clear output on error
    } finally {
        isUpdating = false;
    }
}


// Comprehensive Currency to Country and Full Name Mapping
const currencyInfo = {
    'USD': { countryCode: 'US', fullName: 'US Dollar', countryName: 'United States' },
    'EUR': { countryCode: 'EU', fullName: 'Euro', countryName: 'Eurozone' },
    'GBP': { countryCode: 'GB', fullName: 'British Pound', countryName: 'United Kingdom' },
    'JPY': { countryCode: 'JP', fullName: 'Japanese Yen', countryName: 'Japan' },
    'CAD': { countryCode: 'CA', fullName: 'Canadian Dollar', countryName: 'Canada' },
    'AUD': { countryCode: 'AU', fullName: 'Australian Dollar', countryName: 'Australia' },
    'CHF': { countryCode: 'CH', fullName: 'Swiss Franc', countryName: 'Switzerland' },
    'CNY': { countryCode: 'CN', fullName: 'Chinese Yuan', countryName: 'China' },
    'SEK': { countryCode: 'SE', fullName: 'Swedish Krona', countryName: 'Sweden' },
    'NZD': { countryCode: 'NZ', fullName: 'New Zealand Dollar', countryName: 'New Zealand' },
    'MXN': { countryCode: 'MX', fullName: 'Mexican Peso', countryName: 'Mexico' },
    'SGD': { countryCode: 'SG', fullName: 'Singapore Dollar', countryName: 'Singapore' },
    'HKD': { countryCode: 'HK', fullName: 'Hong Kong Dollar', countryName: 'Hong Kong' },
    'NOK': { countryCode: 'NO', fullName: 'Norwegian Krone', countryName: 'Norway' },
    'KRW': { countryCode: 'KR', fullName: 'South Korean Won', countryName: 'South Korea' },
    'TRY': { countryCode: 'TR', fullName: 'Turkish Lira', countryName: 'Turkey' },
    'RUB': { countryCode: 'RU', fullName: 'Russian Ruble', countryName: 'Russia' },
    'INR': { countryCode: 'IN', fullName: 'Indian Rupee', countryName: 'India' },
    'BRL': { countryCode: 'BR', fullName: 'Brazilian Real', countryName: 'Brazil' },
    'ZAR': { countryCode: 'ZA', fullName: 'South African Rand', countryName: 'South Africa' },
    'PHP': { countryCode: 'PH', fullName: 'Philippine Peso', countryName: 'Philippines' },
    'PLN': { countryCode: 'PL', fullName: 'Polish Zloty', countryName: 'Poland' },
    'THB': { countryCode: 'TH', fullName: 'Thai Baht', countryName: 'Thailand' },
    'IDR': { countryCode: 'ID', fullName: 'Indonesian Rupiah', countryName: 'Indonesia' },
    'HUF': { countryCode: 'HU', fullName: 'Hungarian Forint', countryName: 'Hungary' },
    'CZK': { countryCode: 'CZ', fullName: 'Czech Koruna', countryName: 'Czech Republic' },
    'ILS': { countryCode: 'IL', fullName: 'Israeli New Shekel', countryName: 'Israel' },
    'CLP': { countryCode: 'CL', fullName: 'Chilean Peso', countryName: 'Chile' },
    'PKR': { countryCode: 'PK', fullName: 'Pakistani Rupee', countryName: 'Pakistan' },
    'AED': { countryCode: 'AE', fullName: 'UAE Dirham', countryName: 'United Arab Emirates' },
    'COP': { countryCode: 'CO', fullName: 'Colombian Peso', countryName: 'Colombia' },
    'SAR': { countryCode: 'SA', fullName: 'Saudi Riyal', countryName: 'Saudi Arabia' },
    'MYR': { countryCode: 'MY', fullName: 'Malaysian Ringgit', countryName: 'Malaysia' },
    'RON': { countryCode: 'RO', fullName: 'Romanian Leu', countryName: 'Romania' },
    'EGP': { countryCode: 'EG', fullName: 'Egyptian Pound', countryName: 'Egypt' },
    'NGN': { countryCode: 'NG', fullName: 'Nigerian Naira', countryName: 'Nigeria' },
    'VND': { countryCode: 'VN', fullName: 'Vietnamese Dong', countryName: 'Vietnam' },
    'BDT': { countryCode: 'BD', fullName: 'Bangladeshi Taka', countryName: 'Bangladesh' },
    'KZT': { countryCode: 'KZ', fullName: 'Kazakhstani Tenge', countryName: 'Kazakhstan' },
    'GHS': { countryCode: 'GH', fullName: 'Ghanaian Cedi', countryName: 'Ghana' },
    'XOF': { countryCode: 'BJ', fullName: 'West African CFA franc', countryName: 'Benin' },
    'XAF': { countryCode: 'CM', fullName: 'Central African CFA franc', countryName: 'Cameroon' },
    'XCD': { countryCode: 'AG', fullName: 'East Caribbean Dollar', countryName: 'Antigua and Barbuda' },
    'XAU': { countryCode: 'UN', fullName: 'Gold Ounce', countryName: 'Non-country Specific' },
    'XAG': { countryCode: 'UN', fullName: 'Silver Ounce', countryName: 'Non-country Specific' },
    'MAD': { countryCode: 'MA', fullName: 'Moroccan Dirham', countryName: 'Morocco' },
};

// Currency Converter Logic
let conversionRates = {}; // To store fetched conversion rates

async function getExchangeRate(from, to) {
    const currencyError = document.getElementById('currencyError');
    if (currencyError) currencyError.textContent = ''; // Clear previous errors

    if (from === to) {
        return 1;
    }

    // Check if we have the direct rate cached
    if (conversionRates[from] && conversionRates[from][to]) {
        return conversionRates[from][to];
    }

    // Try to fetch rates from the new API
    try {
        const response = await fetch(`https://open.er-api.com/v6/latest/${from}`);
        const data = await response.json();

        if (data.result === 'success') { // Open ER API uses 'result: success'
            conversionRates[from] = data.rates; // Rates are directly under 'rates' object
            if (conversionRates[from][to]) {
                return conversionRates[from][to];
            } else {
                if (currencyError) currencyError.textContent = `Error fetching currency list: ${data.error || 'Unknown error'}`; // Error structure might differ
                return null;
            }
        } else {
            if (currencyError) currencyError.textContent = `Error fetching exchange rates for ${from}: ${data.error || 'Unknown error'}`; // Error structure might differ
            console.error('Error fetching exchange rates:', data.error || 'Unknown error');
            return null;
        }
    } catch (error) {
        if (currencyError) currencyError.textContent = 'Failed to fetch exchange rates. Please check your internet connection.';
        console.error('Error fetching exchange rates:', error);
        return null;
    }
}

async function updateCurrencyFields(eventTarget) {
    if (isUpdating) return;
    isUpdating = true;

    const fromCurrencySelect = document.getElementById('fromCurrency');
    const toCurrencySelect = document.getElementById('toCurrency');
    const fromAmountInput = document.getElementById('fromCurrencyAmount');
    const toAmountInput = document.getElementById('toCurrencyAmount');
    const currencyError = document.getElementById('currencyError');
    if (currencyError) currencyError.textContent = ''; // Clear previous errors

    let fromAmount = parseFloat(fromAmountInput.value);
    let toAmount = parseFloat(toAmountInput.value);
    const fromCurrency = fromCurrencySelect.value;
    const toCurrency = toCurrencySelect.value;

    let amountToConvert;
    let sourceCurrency;
    let targetInput;
    let targetCurrency;

    try {
        if (eventTarget === fromAmountInput || eventTarget === fromCurrencySelect || eventTarget === null || eventTarget === toCurrencySelect) {
            amountToConvert = fromAmount;
            sourceCurrency = fromCurrency;
            targetInput = toAmountInput;
            targetCurrency = toCurrency;
        } else if (eventTarget === toAmountInput) {
            // User typed in 'to' amount (this means we convert back to 'fromAmountInput')
            amountToConvert = toValue;
            sourceCurrency = toCurrency;
            targetInput = fromAmountInput;
            targetCurrency = fromCurrency;
        }

        if (isNaN(amountToConvert)) {
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        if (sourceCurrency === targetCurrency) {
            if (targetInput) targetInput.value = amountToConvert.toFixed(4);
            isUpdating = false;
            return;
        }

        const rate = await getExchangeRate(sourceCurrency, targetCurrency);

        if (rate === null) {
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }
        
        let result = amountToConvert * rate;
        if (targetInput) targetInput.value = result.toFixed(4);

    } catch (error) {
        if (currencyError) currencyError.textContent = 'An error occurred during conversion.';
        console.error('Conversion error:', error);
        if (targetInput) targetInput.value = '';
    } finally {
        isUpdating = false;
    }
}

function updateTemperatureFields(eventTarget) {
    if (isUpdating) return;
    isUpdating = true;

    const fromAmountInput = document.getElementById('fromTempAmount');
    const toAmountInput = document = document.getElementById('toTempAmount');
    const fromUnitSelect = document.getElementById('tempUnit1');
    const toUnitSelect = document.getElementById('tempUnit2');
    const errorDisplay = document.getElementById('tempError');
    errorDisplay.textContent = '';

    let fromValue = parseFloat(fromAmountInput.value);
    let toValue = parseFloat(toAmountInput.value);
    const fromUnit = fromUnitSelect.value;
    const toUnit = toUnitSelect.value;

    let amountToConvert;
    let sourceUnit;
    let targetInput;
    let targetUnit;

    try {
        if (eventTarget === fromAmountInput || eventTarget === fromUnitSelect || eventTarget === null || eventTarget === toUnitSelect) {
            amountToConvert = fromValue;
            sourceUnit = fromUnit;
            targetInput = toAmountInput;
            targetUnit = toUnit;
        } else if (eventTarget === toAmountInput) {
            amountToConvert = toValue;
            sourceUnit = toUnit;
            targetInput = fromAmountInput;
            targetUnit = fromUnit;
        }

        if (isNaN(amountToConvert)) {
            if (targetInput) targetInput.value = '';
            isUpdating = false;
            return;
        }

        if (sourceUnit === targetUnit) {
            if (targetInput) targetInput.value = amountToConvert;
            isUpdating = false;
            return;
        }

        let kelvinValue;

        // Convert source to Kelvin
        switch (sourceUnit) {
            case 'celsius':
                kelvinValue = amountToConvert + 273.15;
                break;
            case 'fahrenheit':
                kelvinValue = (amountToConvert - 32) * 5/9 + 273.15;
                break;
            case 'kelvin':
                kelvinValue = amountToConvert;
                break;
            case 'rankine':
                kelvinValue = amountToConvert * 5/9;
                break;
            case 'reaumur':
                kelvinValue = amountToConvert * 5/4 + 273.15;
                break;
            default:
                errorDisplay.textContent = 'Invalid source unit.';
                if (targetInput) targetInput.value = '';
                isUpdating = false;
                return;
        }

        let result;
        // Convert Kelvin to target
        switch (targetUnit) {
            case 'celsius':
                result = kelvinValue - 273.15;
                break;
            case 'fahrenheit':
                result = (kelvinValue - 273.15) * 9/5 + 32;
                break;
            case 'kelvin':
                result = kelvinValue;
                break;
            case 'rankine':
                result = kelvinValue * 9/5;
                break;
            case 'reaumur':
                result = (kelvinValue - 273.15) * 4/5;
                break;
            default:
                errorDisplay.textContent = 'Invalid target unit.';
                if (targetInput) targetInput.value = '';
                isUpdating = false;
                return;
        }
        
        if (targetInput) targetInput.value = parseFloat(result.toPrecision(10)); // Use 10 significant figures for temperature

    } catch (error) {
        errorDisplay.textContent = 'An error occurred during conversion.';
        console.error('Temperature conversion error:', error);
        if (targetInput) targetInput.value = ''; // Clear output on error
    } finally {
        isUpdating = false;
    }
}

async function fetchCurrencies() {
    const fromCurrencySelect = document.getElementById('fromCurrency');
    const toCurrencySelect = document.getElementById('toCurrency');
    const currencyError = document.getElementById('currencyError');

    // Clear existing options
    fromCurrencySelect.innerHTML = '';
    toCurrencySelect.innerHTML = '';

    // Use a default base currency for fetching the list, e.g., USD
    const apiUrlForList = `https://open.er-api.com/v6/latest/USD`; //api for currencys 

    try {
        const response = await fetch(apiUrlForList);
        const data = await response.json();

        if (data.result === 'success') {
            const currencies = Object.keys(data.rates).sort(); // Open ER API uses 'rates' object
            currencies.forEach(currency => {
                const currencyData = currencyInfo[currency];
                const optionText = currencyData
                    ? `${currency} ${currencyData.fullName} (${currencyData.countryName})`
                    : currency; // Fallback if no info

                const option1 = document.createElement('option');
                option1.value = currency;
                option1.textContent = optionText;
                fromCurrencySelect.appendChild(option1);

                const option2 = document.createElement('option');
                option2.value = currency;
                option2.textContent = optionText;
                toCurrencySelect.appendChild(option2);
            });
            // Set default values
            fromCurrencySelect.value = 'USD';
            toCurrencySelect.value = 'EUR';

            // Initial conversion after currencies are loaded
            updateCurrencyFields(null); // Pass null as event target for initial load

        } else {
            if (currencyError) currencyError.textContent = `Error fetching currency list: ${data.error || 'Unknown error'}`;
            console.error('Error fetching currency list:', data.error || 'Unknown error');
        }
    } catch (error) {
        if (currencyError) currencyError.textContent = 'Failed to fetch currency list. Please check your internet connection.';
        console.error('Error fetching currency list:', error);
    }
}

// Function to show/hide sections
function showSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');

    const navButtons = document.querySelectorAll('.nav-button');
    navButtons.forEach(button => {
        button.classList.remove('active');
    });
    // Add active class to the clicked button
    const activeButton = document.querySelector(`.nav-button[onclick="showSection('${sectionId}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Initialize all features on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await fetchCurrencies(); // Also triggers initial currency conversion
        showSection('basic-calculator'); // Show the basic calculator section by default

        // Add event listener for direct input to the display
        const displayInput = document.getElementById('display');
        if (displayInput) {
            displayInput.addEventListener('input', (event) => {
                currentExpression = event.target.value;
            });
        }


        // Add event listeners for currency conversion
        const fromCurrencyAmountInput = document.getElementById('fromCurrencyAmount');
        const toCurrencyAmountInput = document.getElementById('toCurrencyAmount');
        const fromCurrencySelect = document.getElementById('fromCurrency');
        const toCurrencySelect = document.getElementById('toCurrency');

        if (fromCurrencyAmountInput) fromCurrencyAmountInput.addEventListener('input', (event) => updateCurrencyFields(event.target));
        if (toCurrencyAmountInput) toCurrencyAmountInput.addEventListener('input', (event) => updateCurrencyFields(event.target));
        if (fromCurrencySelect) fromCurrencySelect.addEventListener('change', (event) => {
            updateCurrencyFields(event.target);
        });
        if (toCurrencySelect) toCurrencySelect.addEventListener('change', (event) => {
            updateCurrencyFields(event.target);
        });

        // Add event listeners for length conversion
        const fromLengthAmountInput = document.getElementById('fromLengthAmount');
        const toLengthAmountInput = document.getElementById('toLengthAmount');
        const lengthUnit1Select = document.getElementById('lengthUnit1');
        const lengthUnit2Select = document.getElementById('lengthUnit2');

        if (fromLengthAmountInput) fromLengthAmountInput.addEventListener('input', (event) => updateLengthFields(event.target));
        if (toLengthAmountInput) toLengthAmountInput.addEventListener('input', (event) => updateLengthFields(event.target));
        if (lengthUnit1Select) lengthUnit1Select.addEventListener('change', (event) => updateLengthFields(event.target));
        if (lengthUnit2Select) lengthUnit2Select.addEventListener('change', (event) => updateLengthFields(event.target));
        if (fromLengthAmountInput && toLengthAmountInput && lengthUnit1Select && lengthUnit2Select) {
            updateLengthFields(null); // Initial conversion for length
        }


        // Add event listeners for mass conversion
        const fromMassAmountInput = document.getElementById('fromMassAmount');
        const toMassAmountInput = document.getElementById('toMassAmount');
        const massUnit1Select = document.getElementById('massUnit1');
        const massUnit2Select = document.getElementById('massUnit2');

        if (fromMassAmountInput) fromMassAmountInput.addEventListener('input', (event) => updateMassFields(event.target));
        if (toMassAmountInput) toMassAmountInput.addEventListener('input', (event) => updateMassFields(event.target));
        if (massUnit1Select) massUnit1Select.addEventListener('change', (event) => updateMassFields(event.target));
        if (massUnit2Select) massUnit2Select.addEventListener('change', (event) => updateMassFields(event.target));
        if (fromMassAmountInput && toMassAmountInput && massUnit1Select && massUnit2Select) {
            updateMassFields(null); // Initial conversion for mass
        }

        // Add event listeners for liquid volume conversion
        const fromLiquidVolumeAmountInput = document.getElementById('fromLiquidVolumeAmount');
        const toLiquidVolumeAmountInput = document = document.getElementById('toLiquidVolumeAmount');
        const liquidVolumeUnit1Select = document.getElementById('liquidVolumeUnit1');
        const liquidVolumeUnit2Select = document = document.getElementById('liquidVolumeUnit2');

        if (fromLiquidVolumeAmountInput) fromLiquidVolumeAmountInput.addEventListener('input', (event) => updateLiquidVolumeFields(event.target));
        if (toLiquidVolumeAmountInput) toLiquidVolumeAmountInput.addEventListener('input', (event) => updateLiquidVolumeFields(event.target));
        if (liquidVolumeUnit1Select) liquidVolumeUnit1Select.addEventListener('change', (event) => updateLiquidVolumeFields(event.target));
        if (liquidVolumeUnit2Select) liquidVolumeUnit2Select.addEventListener('change', (event) => updateLiquidVolumeFields(event.target));
        if (fromLiquidVolumeAmountInput && toLiquidVolumeAmountInput && liquidVolumeUnit1Select && liquidVolumeUnit2Select) {
            updateLiquidVolumeFields(null); // Initial conversion for liquid volume
        }

        // Add event listeners for general volume conversion
        const fromGeneralVolumeAmountInput = document.getElementById('fromGeneralVolumeAmount');
        const toGeneralVolumeAmountInput = document = document.getElementById('toGeneralVolumeAmount');
        const generalVolumeUnit1Select = document.getElementById('generalVolumeUnit1');
        const generalVolumeUnit2Select = document = document.getElementById('generalVolumeUnit2');

        if (fromGeneralVolumeAmountInput) fromGeneralVolumeAmountInput.addEventListener('input', (event) => updateGeneralVolumeFields(event.target));
        if (toGeneralVolumeAmountInput) toGeneralVolumeAmountInput.addEventListener('input', (event) => updateGeneralVolumeFields(event.target));
        if (generalVolumeUnit1Select) generalVolumeUnit1Select.addEventListener('change', (event) => updateGeneralVolumeFields(event.target));
        if (generalVolumeUnit2Select) generalVolumeUnit2Select.addEventListener('change', (event) => updateGeneralVolumeFields(event.target));
        if (fromGeneralVolumeAmountInput && toGeneralVolumeAmountInput && generalVolumeUnit1Select && generalVolumeUnit2Select) {
            updateGeneralVolumeFields(null); // Initial conversion for general volume
        }

        // Add event listeners for area conversion
        const fromAreaAmountInput = document.getElementById('fromAreaAmount');
        const toAreaAmountInput = document.getElementById('toAreaAmount');
        const areaUnit1Select = document.getElementById('areaUnit1');
        const areaUnit2Select = document.getElementById('areaUnit2');

        if (fromAreaAmountInput) fromAreaAmountInput.addEventListener('input', (event) => updateAreaFields(event.target));
        if (toAreaAmountInput) toAreaAmountInput.addEventListener('input', (event) => updateAreaFields(event.target));
        if (areaUnit1Select) areaUnit1Select.addEventListener('change', (event) => updateAreaFields(event.target));
        if (areaUnit2Select) areaUnit2Select.addEventListener('change', (event) => updateAreaFields(event.target));
        if (fromAreaAmountInput && toAreaAmountInput && areaUnit1Select && areaUnit2Select) {
            updateAreaFields(null); // Initial conversion for area
        }

        // Add event listeners for time conversion
        const fromTimeAmountInput = document.getElementById('fromTimeAmount');
        const toTimeAmountInput = document = document.getElementById('toTimeAmount');
        const timeUnit1Select = document.getElementById('timeUnit1');
        const timeUnit2Select = document = document.getElementById('timeUnit2');

        if (fromTimeAmountInput) fromTimeAmountInput.addEventListener('input', (event) => updateTimeFields(event.target));
        if (toTimeAmountInput) toTimeAmountInput.addEventListener('input', (event) => updateTimeFields(event.target));
        if (timeUnit1Select) timeUnit1Select.addEventListener('change', (event) => updateTimeFields(event.target));
        if (timeUnit2Select) timeUnit2Select.addEventListener('change', (event) => updateTimeFields(event.target));
        if (fromTimeAmountInput && toTimeAmountInput && timeUnit1Select && timeUnit2Select) {
            updateTimeFields(null); // Initial conversion for time
        }

        // Add event listeners for speed conversion
        const fromSpeedAmountInput = document.getElementById('fromSpeedAmount');
        const toSpeedAmountInput = document = document.getElementById('toSpeedAmount');
        const speedUnit1Select = document.getElementById('speedUnit1');
        const speedUnit2Select = document = document.getElementById('speedUnit2');

        if (fromSpeedAmountInput) fromSpeedAmountInput.addEventListener('input', (event) => updateSpeedFields(event.target));
        if (toSpeedAmountInput) toSpeedAmountInput.addEventListener('input', (event) => updateSpeedFields(event.target));
        if (speedUnit1Select) speedUnit1Select.addEventListener('change', (event) => updateSpeedFields(event.target));
        if (speedUnit2Select) speedUnit2Select.addEventListener('change', (event) => updateSpeedFields(event.target));
        if (fromSpeedAmountInput && toSpeedAmountInput && speedUnit1Select && speedUnit2Select) {
            updateSpeedFields(null); // Initial conversion for speed
        }

        // Add event listeners for digital storage conversion
        const fromDigitalStorageAmountInput = document.getElementById('fromDigitalStorageAmount');
        const toDigitalStorageAmountInput = document = document.getElementById('toDigitalStorageAmount');
        const digitalStorageUnit1Select = document.getElementById('digitalStorageUnit1');
        const digitalStorageUnit2Select = document = document.getElementById('digitalStorageUnit2');

        if (fromDigitalStorageAmountInput) fromDigitalStorageAmountInput.addEventListener('input', (event) => updateDigitalStorageFields(event.target));
        if (toDigitalStorageAmountInput) toDigitalStorageAmountInput.addEventListener('input', (event) => updateDigitalStorageFields(event.target));
        if (digitalStorageUnit1Select) digitalStorageUnit1Select.addEventListener('change', (event) => updateDigitalStorageFields(event.target));
        if (digitalStorageUnit2Select) digitalStorageUnit2Select.addEventListener('change', (event) => updateDigitalStorageFields(event.target));
        if (fromDigitalStorageAmountInput && toDigitalStorageAmountInput && digitalStorageUnit1Select && digitalStorageUnit2Select) {
            updateDigitalStorageFields(null); // Initial conversion for digital storage
        }

        // Add event listeners for energy conversion
        const fromEnergyAmountInput = document.getElementById('fromEnergyAmount');
        const toEnergyAmountInput = document.getElementById('toEnergyAmount');
        const energyUnit1Select = document.getElementById('energyUnit1');
        const energyUnit2Select = document.getElementById('energyUnit2');

        if (fromEnergyAmountInput) fromEnergyAmountInput.addEventListener('input', (event) => updateEnergyFields(event.target));
        if (toEnergyAmountInput) toEnergyAmountInput.addEventListener('input', (event) => updateEnergyFields(event.target));
        if (energyUnit1Select) energyUnit1Select.addEventListener('change', (event) => updateEnergyFields(event.target));
        if (energyUnit2Select) energyUnit2Select.addEventListener('change', (event) => updateEnergyFields(event.target));
        if (fromEnergyAmountInput && toEnergyAmountInput && energyUnit1Select && energyUnit2Select) {
            updateEnergyFields(null); // Initial conversion for energy
        }

        // Add event listeners for pressure conversion
        const fromPressureAmountInput = document.getElementById('fromPressureAmount');
        const toPressureAmountInput = document.getElementById('toPressureAmount');
        const pressureUnit1Select = document.getElementById('pressureUnit1');
        const pressureUnit2Select = document.getElementById('pressureUnit2');

        if (fromPressureAmountInput) fromPressureAmountInput.addEventListener('input', (event) => updatePressureFields(event.target));
        if (toPressureAmountInput) toPressureAmountInput.addEventListener('input', (event) => updatePressureFields(event.target));
        if (pressureUnit1Select) pressureUnit1Select.addEventListener('change', (event) => updatePressureFields(event.target));
        if (pressureUnit2Select) pressureUnit2Select.addEventListener('change', (event) => updatePressureFields(event.target));
        if (fromPressureAmountInput && toPressureAmountInput && pressureUnit1Select && pressureUnit2Select) {
            updatePressureFields(null); // Initial conversion for pressure
        }

        // Add event listeners for angle conversion
        const fromAngleAmountInput = document.getElementById('fromAngleAmount');
        const toAngleAmountInput = document = document.getElementById('toAngleAmount');
        const angleUnit1Select = document.getElementById('angleUnit1');
        const angleUnit2Select = document = document.getElementById('angleUnit2');

        if (fromAngleAmountInput) fromAngleAmountInput.addEventListener('input', (event) => updateAngleFields(event.target));
        if (toAngleAmountInput) toAngleAmountInput.addEventListener('input', (event) => updateAngleFields(event.target));
        if (angleUnit1Select) angleUnit1Select.addEventListener('change', (event) => updateAngleFields(event.target));
        if (angleUnit2Select) angleUnit2Select.addEventListener('change', (event) => updateAngleFields(event.target));
        if (fromAngleAmountInput && toAngleAmountInput && angleUnit1Select && angleUnit2Select) {
            updateAngleFields(null); // Initial conversion for angle
        }

        // Add event listeners for temperature conversion
        const fromTempAmountInput = document.getElementById('fromTempAmount');
        const toTempAmountInput = document = document.getElementById('toTempAmount');
        const tempUnit1Select = document.getElementById('tempUnit1');
        const tempUnit2Select = document = document.getElementById('tempUnit2');

        if (fromTempAmountInput) fromTempAmountInput.addEventListener('input', (event) => updateTemperatureFields(event.target));
        if (toTempAmountInput) toTempAmountInput.addEventListener('input', (event) => updateTemperatureFields(event.target));
        if (tempUnit1Select) tempUnit1Select.addEventListener('change', (event) => updateTemperatureFields(event.target));
        if (tempUnit2Select) tempUnit2Select.addEventListener('change', (event) => updateTemperatureFields(event.target));
        if (fromTempAmountInput && toTempAmountInput && tempUnit1Select && tempUnit2Select) {
            updateTemperatureFields(null); // Initial conversion for temperature
        }

    } catch (error) {
        console.error('Error during DOMContentLoaded initialization:', error);
        // Optionally, display an error message to the user on the page
        const currencyError = document.getElementById('currencyError');
        if (currencyError) currencyError.textContent = 'Failed to initialize converters. Please check console for details.';
        const lengthError = document.getElementById('lengthError');
        if (lengthError) lengthError.textContent = 'Failed to initialize converters. Please check console for details.';
        const massError = document.getElementById('massError');
        if (massError) massError.textContent = 'Failed to initialize converters. Please check console for details.';
        const liquidVolumeError = document.getElementById('liquidVolumeError');
        if (liquidVolumeError) liquidVolumeError.textContent = 'Failed to initialize converter. Please check console for details.';
        const generalVolumeError = document.getElementById('generalVolumeError');
        if (generalVolumeError) generalVolumeError.textContent = 'Failed to initialize converter. Please check console for details.';
        const areaError = document.getElementById('areaError');
        if (areaError) areaError.textContent = 'Failed to initialize converter. Please check console for details.';
        const timeError = document.getElementById('timeError');
        if (timeError) timeError.textContent = 'Failed to initialize converter. Please check console for details.';
        const speedError = document.getElementById('speedError');
        if (speedError) speedError.textContent = 'Failed to initialize converter. Please check console for details.';
        const digitalStorageError = document.getElementById('digitalStorageError');
        if (digitalStorageError) digitalStorageError.textContent = 'Failed to initialize converter. Please check console for details.';
        const energyError = document.getElementById('energyError');
        if (energyError) energyError.textContent = 'Failed to initialize converter. Please check console for details.';
        const pressureError = document.getElementById('pressureError');
        if (pressureError) pressureError.textContent = 'Failed to initialize converter. Please check console for details.';
        const angleError = document.getElementById('angleError');
        if (angleError) angleError.textContent = 'Failed to initialize converter. Please check console for details.';
        const tempError = document.getElementById('tempError'); // Add temp error display
        if (tempError) tempError.textContent = 'Failed to initialize converter. Please check console for details.';
    }
});