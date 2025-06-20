/**
 * Simple test activities
 */

export async function sayHello(name: string): Promise<string> {
  console.log(`Activity: Saying hello to ${name}`);
  return `Hello, ${name}!`;
} 