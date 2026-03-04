import type { ChatResponse } from "./types";

export type TestFixtureSuccess = {
  id: string;
  label: string;
  description: string;
  type: "success";
  response: ChatResponse;
};

export type TestFixtureError = {
  id: string;
  label: string;
  description: string;
  type: "error";
  message: string;
};

export type TestFixture = TestFixtureSuccess | TestFixtureError;

export const TEST_FIXTURES: TestFixture[] = [
  {
    id: "happy-sketch",
    label: "Happy — colorful orbiting sketch",
    description: "A working sketch with bright colors and smooth animation",
    type: "success",
    response: {
      explanation:
        "Bright circles orbit the center, leaving colorful trails that fade over time. Each loop represents energy and joy radiating outward.",
      visualMetaphors: ["orbiting light", "fading trails", "radiating warmth"],
      emotionTags: ["happy", "elation", "hopeful"],
      colorPalette: [
        { emotion: "happy", hex: "#FFD166" },
        { emotion: "elation", hex: "#FDB813" },
        { emotion: "hopeful", hex: "#90BE6D" },
      ],
      p5Code: `function setup() {
  createCanvas(400, 400);
  colorMode(HSB, 360, 100, 100, 100);
  background(55, 80, 95);
}
function draw() {
  fill(55, 80, 95, 8);
  noStroke();
  rect(0, 0, width, height);
  var t = frameCount * 0.025;
  for (var i = 0; i < 5; i++) {
    var angle = t + (TWO_PI / 5) * i;
    var r = 100 + sin(t * 0.7 + i) * 30;
    var x = width / 2 + cos(angle) * r;
    var y = height / 2 + sin(angle) * r;
    var hue = (frameCount * 1.5 + i * 72) % 360;
    fill(hue, 75, 100, 85);
    ellipse(x, y, 22, 22);
  }
}`,
      repairApplied: false,
    },
  },
  {
    id: "wrong-answer",
    label: "Wrong answer — off-topic response",
    description:
      "AI gives a technically working sketch but with an explanation that clearly misses the point",
    type: "success",
    response: {
      explanation:
        "Here is a sketch of bouncing geometric shapes because math is beautiful and triangles represent stability. The red squares symbolize passion for algebra.",
      visualMetaphors: ["bouncing squares", "rigid geometry", "algebraic passion"],
      emotionTags: ["anger", "anxious"],
      colorPalette: [
        { emotion: "anger", hex: "#D62828" },
        { emotion: "anxious", hex: "#8D99AE" },
      ],
      p5Code: `var x, y, vx, vy;
function setup() {
  createCanvas(400, 400);
  x = width / 2;
  y = height / 2;
  vx = 3;
  vy = 2.5;
}
function draw() {
  background(30);
  x += vx;
  y += vy;
  if (x < 20 || x > width - 20) vx *= -1;
  if (y < 20 || y > height - 20) vy *= -1;
  fill(210, 40, 40);
  noStroke();
  rectMode(CENTER);
  rect(x, y, 40, 40);
  fill(80, 100, 170);
  rect(width - x, height - y, 28, 28);
}`,
      repairApplied: false,
    },
  },
  {
    id: "broken-sketch",
    label: "Broken sketch — runtime error in canvas",
    description:
      "Valid JSON and passes code validation, but the sketch crashes at runtime in the iframe",
    type: "success",
    response: {
      explanation:
        "This sketch should draw soft ripples across the canvas to convey a sense of calm spreading outward. Unfortunately the sketch has an issue.",
      visualMetaphors: ["spreading ripples", "still water", "gentle calm"],
      emotionTags: ["calm", "hopeful"],
      colorPalette: [
        { emotion: "calm", hex: "#7BDFF2" },
        { emotion: "hopeful", hex: "#90BE6D" },
      ],
      p5Code: `function setup() {
  createCanvas(400, 400);
  background(200, 230, 240);
}
function draw() {
  var radius = computeRippleRadius(frameCount);
  noFill();
  stroke(100, 180, 200);
  ellipse(width / 2, height / 2, radius, radius);
}`,
      repairApplied: false,
    },
  },
  {
    id: "rate-limit",
    label: "Rate limit error (429)",
    description: "Simulates Gemini API quota exceeded",
    type: "error",
    message:
      "You've hit the Gemini API rate limit. Wait a moment and try again, or switch to a different model in your .env.local.",
  },
  {
    id: "server-error",
    label: "Server error (500)",
    description: "Simulates a server-side generation failure",
    type: "error",
    message:
      "I couldn't turn that description into a working sketch just now. Please try again.",
  },
];
