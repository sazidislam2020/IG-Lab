// Project templates for different tech stacks
// Each template defines the initial files and metadata

export const TEMPLATES = {
  html: {
    name: "HTML/CSS/JS",
    icon: "🌐",
    description: "Static website with HTML, CSS, and JavaScript",
    runLabel: "Preview in browser",
    files: [
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Project</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <h1>Hello, World! 🚀</h1>
    <p>Welcome to your first project.</p>
    <button id="btn">Click me</button>
    <div id="output"></div>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
      },
      {
        path: "styles.css",
        content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  background: #0A0E16;
  color: #EDEFF3;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.container {
  text-align: center;
  padding: 40px;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #FF5A1F, #FFB238);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

p {
  color: #8A93A6;
  font-size: 1.1rem;
  margin-bottom: 24px;
}

button {
  background: linear-gradient(135deg, #FF5A1F, #ef4444);
  color: white;
  border: none;
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

button:hover {
  transform: scale(1.05);
}

#output {
  margin-top: 20px;
  font-size: 1.2rem;
  color: #3ECF8E;
}`,
      },
      {
        path: "app.js",
        content: `// Your JavaScript code here
const btn = document.getElementById('btn');
const output = document.getElementById('output');
let count = 0;

btn.addEventListener('click', () => {
  count++;
  output.textContent = \`Clicked \${count} time\${count !== 1 ? 's' : ''}!\`;
  output.style.color = count % 2 === 0 ? '#3ECF8E' : '#FF5A1F';
});

console.log('App loaded!');`,
      },
    ],
  },

  react: {
    name: "React",
    icon: "⚛️",
    description: "React component-based application",
    runLabel: "View components",
    files: [
      {
        path: "package.json",
        content: `{
  "name": "my-react-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0"
  }
}`,
      },
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>`,
      },
      {
        path: "src/main.jsx",
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
      },
      {
        path: "src/App.jsx",
        content: `import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0A0E16',
      color: '#EDEFF3',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <h1 style={{
        fontSize: '2.5rem',
        marginBottom: 24,
        background: 'linear-gradient(135deg, #FF5A1F, #FFB238)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        React App 🚀
      </h1>
      <p style={{ color: '#8A93A6', marginBottom: 24 }}>
        You clicked {count} time{count !== 1 ? 's' : ''}
      </p>
      <button
        onClick={() => setCount(c => c + 1)}
        style={{
          background: 'linear-gradient(135deg, #FF5A1F, #ef4444)',
          color: 'white',
          border: 'none',
          padding: '12px 32px',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Click me
      </button>
    </div>
  );
}

export default App;`,
      },
      {
        path: "src/App.test.js",
        content: `// Simple test example
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders with initial count of 0', () => {
    render(<App />);
    expect(screen.getByText('You clicked 0 times')).toBeInTheDocument();
  });

  it('increments count on click', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Click me'));
    expect(screen.getByText('You clicked 1 time')).toBeInTheDocument();
  });
});`,
      },
    ],
  },

  python: {
    name: "Python",
    icon: "🐍",
    description: "Python script or application",
    runLabel: "Run script",
    files: [
      {
        path: "main.py",
        content: `#!/usr/bin/env python3
"""
My Python Project
"""

def greet(name):
    """Greet someone by name."""
    return f"Hello, {name}! Welcome to Ignite Lab."


def fibonacci(n):
    """Generate the first n Fibonacci numbers."""
    if n <= 0:
        return []
    elif n == 1:
        return [0]

    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[i-1] + fib[i-2])
    return fib


def main():
    print("=" * 40)
    print("  Python Project — Ignite Lab")
    print("=" * 40)
    print()

    # Greeting
    print(greet("World"))
    print()

    # Fibonacci
    n = 15
    print(f"First {n} Fibonacci numbers:")
    print(fibonacci(n))
    print()

    # List comprehension
    squares = [x**2 for x in range(1, 11)]
    print("Squares 1-10:", squares)
    print()

    # Dictionary
    student = {
        "name": "Alice",
        "age": 20,
        "courses": ["Python", "Data Science", "AI"],
    }
    print(f"Student: {student['name']}")
    print(f"Courses: {', '.join(student['courses'])}")
    print()
    print("Done! ✅")


if __name__ == "__main__":
    main()`,
      },
      {
        path: "utils.py",
        content: `"""Utility functions for the project."""


def factorial(n):
    """Calculate factorial of n."""
    if n <= 1:
        return 1
    return n * factorial(n - 1)


def is_palindrome(s):
    """Check if a string is a palindrome."""
    cleaned = s.lower().replace(" ", "")
    return cleaned == cleaned[::-1]


def flatten(lst):
    """Flatten a nested list."""
    result = []
    for item in lst:
        if isinstance(item, list):
            result.extend(flatten(item))
        else:
            result.append(item)
    return result


# Tests
if __name__ == "__main__":
    assert factorial(5) == 120
    assert is_palindrome("racecar") == True
    assert flatten([1, [2, 3], [4, [5, 6]]]) == [1, 2, 3, 4, 5, 6]
    print("All tests passed! ✅")`,
      },
      {
        path: "README.md",
        content: `# My Python Project

## Description
A Python project created on Ignite Lab.

## Files
- \`main.py\` — Main entry point
- \`utils.py\` — Utility functions

## How to Run
\`\`\`bash
python main.py
\`\`\`

## How to Test
\`\`\`bash
python utils.py
\`\`\``,
      },
    ],
  },

  node: {
    name: "Node.js",
    icon: "🟢",
    description: "Node.js server or CLI application",
    runLabel: "Run server",
    files: [
      {
        path: "package.json",
        content: `{
  "name": "my-node-app",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  }
}`,
      },
      {
        path: "server.js",
        content: `// Simple Node.js HTTP Server
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

const server = http.createServer((req, res) => {
  console.log(\`\${req.method} \${req.url}\`);

  // API routes
  if (req.url === '/api/hello') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Hello from Node.js! 🚀' }));
    return;
  }

  if (req.url === '/api/time') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ time: new Date().toISOString() }));
    return;
  }

  // Serve static files
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, 'public', filePath);

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(\`Server running at http://localhost:\${PORT}\`);
  console.log('Press Ctrl+C to stop');
});`,
      },
      {
        path: "public/index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Node.js Server</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: #0A0E16;
      color: #EDEFF3;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .card {
      text-align: center;
      padding: 40px;
      background: #131926;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.09);
    }
    h1 { color: #3ECF8E; }
    button {
      background: #3ECF8E;
      color: #000;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 16px;
    }
    #result {
      margin-top: 16px;
      color: #FFB238;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>🟢 Node.js Server</h1>
    <p>Your server is running!</p>
    <button onclick="fetchData()">Fetch API Data</button>
    <div id="result"></div>
  </div>
  <script>
    async function fetchData() {
      const res = await fetch('/api/hello');
      const data = await res.json();
      document.getElementById('result').textContent = JSON.stringify(data, null, 2);
    }
  </script>
</body>
</html>`,
      },
    ],
  },

  java: {
    name: "Java",
    icon: "☕",
    description: "Java application",
    runLabel: "Run Java",
    files: [
      {
        path: "Main.java",
        content: `public class Main {
    public static void main(String[] args) {
        System.out.println("========================");
        System.out.println("  Java Project — Ignite Lab");
        System.out.println("========================");
        System.out.println();

        // Greeting
        System.out.println(greet("World"));
        System.out.println();

        // Fibonacci
        int n = 15;
        System.out.println("First " + n + " Fibonacci numbers:");
        int[] fib = fibonacci(n);
        for (int num : fib) {
            System.out.print(num + " ");
        }
        System.out.println();
        System.out.println();

        // Array operations
        int[] numbers = {5, 2, 8, 1, 9, 3, 7, 4, 6};
        System.out.println("Unsorted: " + java.util.Arrays.toString(numbers));
        java.util.Arrays.sort(numbers);
        System.out.println("Sorted:   " + java.util.Arrays.toString(numbers));
        System.out.println();

        // Class usage
        Student student = new Student("Alice", 20);
        student.addCourse("Java");
        student.addCourse("Data Structures");
        student.addCourse("Algorithms");
        System.out.println(student);
        System.out.println();
        System.out.println("Done! ✅");
    }

    static String greet(String name) {
        return "Hello, " + name + "! Welcome to Ignite Lab.";
    }

    static int[] fibonacci(int n) {
        if (n <= 0) return new int[0];
        if (n == 1) return new int[]{0};
        int[] fib = new int[n];
        fib[0] = 0;
        fib[1] = 1;
        for (int i = 2; i < n; i++) {
            fib[i] = fib[i-1] + fib[i-2];
        }
        return fib;
    }
}`,
      },
      {
        path: "Student.java",
        content: `import java.util.ArrayList;
import java.util.List;

public class Student {
    private String name;
    private int age;
    private List<String> courses;

    public Student(String name, int age) {
        this.name = name;
        this.age = age;
        this.courses = new ArrayList<>();
    }

    public void addCourse(String course) {
        courses.add(course);
    }

    public String getName() { return name; }
    public int getAge() { return age; }
    public List<String> getCourses() { return courses; }

    @Override
    public String toString() {
        return "Student{name='" + name + "', age=" + age +
               ", courses=" + courses + "}";
    }
}`,
      },
    ],
  },

  cpp: {
    name: "C/C++",
    icon: "⚙️",
    description: "C or C++ application",
    runLabel: "Compile & Run",
    files: [
      {
        path: "main.cpp",
        content: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <numeric>

using namespace std;

// Fibonacci generator
vector<int> fibonacci(int n) {
    if (n <= 0) return {};
    if (n == 1) return {0};
    vector<int> fib = {0, 1};
    for (int i = 2; i < n; i++) {
        fib.push_back(fib[i-1] + fib[i-2]);
    }
    return fib;
}

// Student class
class Student {
private:
    string name;
    int age;
    vector<string> courses;

public:
    Student(string n, int a) : name(n), age(a) {}

    void addCourse(const string& course) {
        courses.push_back(course);
    }

    void display() const {
        cout << "Student{name='" << name << "', age=" << age << ", courses=[";
        for (size_t i = 0; i < courses.size(); i++) {
            cout << courses[i];
            if (i < courses.size() - 1) cout << ", ";
        }
        cout << "]}" << endl;
    }
};

int main() {
    cout << "========================" << endl;
    cout << "  C++ Project — Ignite Lab" << endl;
    cout << "========================" << endl << endl;

    // Greeting
    cout << "Hello, World! Welcome to Ignite Lab." << endl << endl;

    // Fibonacci
    int n = 15;
    cout << "First " << n << " Fibonacci numbers:" << endl;
    auto fib = fibonacci(n);
    for (int num : fib) {
        cout << num << " ";
    }
    cout << endl << endl;

    // Vector operations
    vector<int> numbers = {5, 2, 8, 1, 9, 3, 7, 4, 6};
    cout << "Unsorted: ";
    for (int n : numbers) cout << n << " ";
    cout << endl;

    sort(numbers.begin(), numbers.end());
    cout << "Sorted:   ";
    for (int n : numbers) cout << n << " ";
    cout << endl << endl;

    // Student
    Student student("Alice", 20);
    student.addCourse("C++");
    student.addCourse("Data Structures");
    student.addCourse("Algorithms");
    student.display();
    cout << endl;

    cout << "Done! ✅" << endl;
    return 0;
}`,
      },
      {
        path: "Makefile",
        content: `# Simple Makefile
CC = g++
CFLAGS = -std=c++17 -Wall -Wextra
TARGET = main

all: $(TARGET)

$(TARGET): main.cpp
	$(CC) $(CFLAGS) -o $(TARGET) main.cpp

clean:
	rm -f $(TARGET)

run: $(TARGET)
	./$(TARGET)`,
      },
    ],
  },
};

export const LANG_MONACO_MAP = {
  html: "html",
  css: "css",
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  java: "java",
  cpp: "cpp",
  c: "c",
  h: "c",
  hpp: "cpp",
  json: "json",
  md: "markdown",
  xml: "html",
  yml: "yaml",
  yaml: "yaml",
  toml: "ini",
  sql: "sql",
  sh: "shell",
  bash: "shell",
  txt: "plaintext",
};

export function getMonacoLang(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();
  return LANG_MONACO_MAP[ext] || "plaintext";
}

export function buildFileTree(files) {
  const tree = {};
  for (const f of files) {
    const parts = f.path.split("/");
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = { _file: true, id: f.id, path: f.path, content: f.content };
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    }
  }
  return tree;
}
