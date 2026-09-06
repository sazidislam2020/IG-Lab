-- Sample courses, levels, and tasks for Ignite Lab
-- Run this in Supabase SQL Editor

-- Course 1: Python Fundamentals
INSERT INTO courses (id, title, description) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Python Fundamentals', 'Learn Python from scratch — variables, loops, functions, and more.');

-- Level 1: Hello World
INSERT INTO levels (id, course_id, level_number, title, points_value) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 1, 'Hello World', 100);

-- Level 2: Variables & Types
INSERT INTO levels (id, course_id, level_number, title, unlock_after_level_id, points_value) VALUES
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 2, 'Variables & Types', 'b1000000-0000-0000-0000-000000000001', 100);

-- Level 3: Loops
INSERT INTO levels (id, course_id, level_number, title, unlock_after_level_id, points_value) VALUES
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 3, 'Loops', 'b1000000-0000-0000-0000-000000000002', 100);

-- Level 4: Boss Exam
INSERT INTO levels (id, course_id, level_number, title, unlock_after_level_id, is_boss, points_value) VALUES
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 4, 'Boss Exam: Python Basics', 'b1000000-0000-0000-0000-000000000003', true, 300);

-- Tasks for Level 1
INSERT INTO tasks (id, level_id, title, prompt, language, starter_code, expected_output, points_value) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Print Hello World', 'Write a Python program that prints "Hello, World!" to the console.', 'python', 'print("Hello, World!")', 'Hello, World!', 10),
  ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'Print Your Name', 'Write a Python program that prints "My name is [your name]". Replace [your name] with your actual name.', 'python', 'print("My name is ____")', 'My name is', 10);

-- Tasks for Level 2
INSERT INTO tasks (id, level_id, title, prompt, language, starter_code, expected_output, points_value) VALUES
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'Create Variables', 'Create three variables: name (string), age (integer), and height (float). Print each one.', 'python', 'name = ""\nage = 0\nheight = 0.0\n\n# Print your variables\nprint(name)\nprint(age)\nprint(height)', NULL, 15),
  ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'String Concatenation', 'Create two variables: first_name and last_name. Print them combined with a space in between.', 'python', 'first_name = "John"\nlast_name = "Doe"\n\n# Combine and print\nfull_name = ""\nprint(full_name)', NULL, 15);

-- Tasks for Level 3
INSERT INTO tasks (id, level_id, title, prompt, language, starter_code, expected_output, points_value) VALUES
  ('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003', 'For Loop 1-10', 'Write a for loop that prints numbers 1 through 10, each on a new line.', 'python', '# Write your for loop here\npass', NULL, 20),
  ('c1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000003', 'Sum of Numbers', 'Write a program that calculates the sum of numbers from 1 to 100 and prints the result.', 'python', '# Calculate sum from 1 to 100\nresult = 0\n\nprint(result)', '5050', 25);

-- Tasks for Level 4 (Boss Exam)
INSERT INTO tasks (id, level_id, title, prompt, language, starter_code, expected_output, points_value) VALUES
  ('c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000004', 'Boss: Calculator', 'Write a function called calculate(a, b, operation) that takes two numbers and an operation string ("add", "subtract", "multiply", "divide"). Return the result. Handle division by zero by returning "Error".', 'python', 'def calculate(a, b, operation):\n    # Your code here\n    pass\n\n# Test cases\nprint(calculate(10, 5, "add"))       # Should print 15\nprint(calculate(10, 5, "subtract"))  # Should print 5\nprint(calculate(10, 5, "multiply"))  # Should print 50\nprint(calculate(10, 0, "divide"))    # Should print Error', '15\n5\n50\nError', 50);

-- Course 2: Web Development Basics
INSERT INTO courses (id, title, description) VALUES
  ('a1000000-0000-0000-0000-000000000002', 'Web Development Basics', 'Build your first websites with HTML, CSS, and JavaScript.');

-- Levels for Web Dev
INSERT INTO levels (id, course_id, level_number, title, points_value) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 1, 'Your First HTML Page', 100),
  ('b2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 2, 'JavaScript Basics', 100);

-- Tasks for Web Dev Level 1
INSERT INTO tasks (id, level_id, title, prompt, language, starter_code, expected_output, points_value) VALUES
  ('c2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'Create a Heading', 'Write HTML that creates a page with an <h1> tag containing "Welcome to Ignite Lab!".', 'html', '<!DOCTYPE html>\n<html>\n<body>\n  <!-- Add your h1 tag here -->\n</body>\n</html>', NULL, 10);

-- Tasks for Web Dev Level 2
INSERT INTO tasks (id, level_id, title, prompt, language, starter_code, expected_output, points_value) VALUES
  ('c2000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', 'Alert Message', 'Write JavaScript that shows an alert saying "Hello from Ignite Lab!" when the page loads.', 'javascript', '// Write your JavaScript here\n', NULL, 10);
