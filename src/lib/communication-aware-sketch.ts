export function buildCommunicationAwareSketch(baseSketch: string, communicationState: {
  hasInterventions: boolean;
  interventionCount: number;
  lastInterventionType: string | null;
  userUnderstandingLevel: number; // 1-5 scale
}): string {
  // Parse the base sketch to extract setup and draw functions
  const setupMatch = baseSketch.match(/function\s+setup\s*\([^)]*\)\s*\{([\s\S]*?)\}/);
  const drawMatch = baseSketch.match(/function\s+draw\s*\([^)]*\)\s*\{([\s\S]*?)\}/);

  if (!setupMatch || !drawMatch) {
    return baseSketch; // Return original if parsing fails
  }

  const setupContent = setupMatch[1];
  const drawContent = drawMatch[1];

  // Add communication state variables
  const communicationVars = `
  // Communication state visualization
  let communicationState = {
    hasInterventions: ${communicationState.hasInterventions},
    interventionCount: ${communicationState.interventionCount},
    lastInterventionType: "${communicationState.lastInterventionType || ''}",
    userUnderstandingLevel: ${communicationState.userUnderstandingLevel}
  };
  
  let communicationVisuals = {
    clarityIndicator: 0,
    interventionMarkers: [],
    understandingPulse: 0
  };
`;

  // Enhanced setup function
  const enhancedSetup = `
function setup() {
  ${setupContent}
  
  // Initialize communication visuals
  communicationVisuals.clarityIndicator = communicationState.userUnderstandingLevel * 50;
  communicationVisuals.understandingPulse = 0;
  
  // Add communication state text overlay
  createP("Communication State: Active").style("position", "absolute").style("top", "10px").style("left", "10px").style("color", "#666").style("font-family", "monospace").style("font-size", "12px");
  createP("Interventions: " + communicationState.interventionCount).style("position", "absolute").style("top", "30px").style("left", "10px").style("color", "#666").style("font-family", "monospace").style("font-size", "12px");
  createP("Understanding: " + communicationState.userUnderstandingLevel + "/5").style("position", "absolute").style("top", "50px").style("left", "10px").style("color", "#666").style("font-family", "monospace").style("font-size", "12px");
}`;

  // Enhanced draw function with communication visualization
  const enhancedDraw = `
function draw() {
  // Original draw content with communication overlays
  ${drawContent}
  
  // Communication state visualization
  communicationVisuals.understandingPulse += 0.05;
  
  // Draw clarity indicator (radial lines that become more organized with higher understanding)
  push();
  translate(width / 2, height / 2);
  
  // Understanding level visualization
  let clarity = map(communicationState.userUnderstandingLevel, 1, 5, 0.1, 1.0);
  let baseColor = color(200, 100, 100);
  let accentColor = color(40, 100, 100);
  
  // Draw communication clarity rings
  for (let i = 0; i < 5; i++) {
    let radius = 20 + i * 20;
    let alpha = map(i, 0, 4, 20, 100) * clarity;
    stroke(40, 100, 100, alpha);
    strokeWeight(2);
    
    // More organized circles with higher understanding
    let noiseOffset = map(communicationState.userUnderstandingLevel, 1, 5, 10, 1);
    let x = cos(frameCount * 0.01 + i) * radius + noise(i * noiseOffset, frameCount * 0.01) * 20;
    let y = sin(frameCount * 0.01 + i) * radius + noise(i * noiseOffset + 10, frameCount * 0.01) * 20;
    
    if (i < communicationState.userUnderstandingLevel) {
      // Clear communication - smooth circles
      noFill();
      ellipse(x, y, 10, 10);
    } else {
      // Unclear communication - jittery particles
      fill(40, 100, 100, 50);
      noStroke();
      ellipse(x + random(-5, 5), y + random(-5, 5), 3, 3);
    }
  }
  
  // Intervention markers
  if (communicationState.hasInterventions) {
    stroke(255, 50, 50);
    strokeWeight(3);
    noFill();
    ellipse(0, 0, 200, 200);
    
    // Pulsing indicator for recent interventions
    let pulse = sin(communicationVisuals.understandingPulse) * 10;
    stroke(255, 100, 100, 100);
    ellipse(0, 0, 220 + pulse, 220 + pulse);
  }
  
  pop();
  
  // Draw intervention count as floating numbers
  if (communicationState.interventionCount > 0) {
    fill(255, 100, 100);
    textSize(24);
    textAlign(CENTER, CENTER);
    text("Interventions: " + communicationState.interventionCount, width - 100, 50);
  }
}`;

  // Combine everything
  return communicationVars + "\n" + enhancedSetup + "\n" + enhancedDraw;
}

export function createCommunicationOverlaySketch(baseSketch: string, state: {
  hasInterventions: boolean;
  interventionCount: number;
  lastInterventionType: string | null;
  userUnderstandingLevel: number;
}): string {
  // If no interventions and high understanding, return original sketch
  if (!state.hasInterventions && state.userUnderstandingLevel >= 4) {
    return baseSketch;
  }

  // Create a communication-aware version
  return buildCommunicationAwareSketch(baseSketch, state);
}