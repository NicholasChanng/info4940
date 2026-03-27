"use client";

import { useEffect, useRef } from "react";

import { buildPreviewHtml } from "@/lib/build-preview-html";

const GALLERY_EXAMPLE = {
  prompt:
    "I was sitting alone at lunch when a classmate I barely knew came over and asked if they could join me. We ended up talking for an hour. I hadn't realized how much I needed that — it was a quiet kind of relief, like a door I didn't know was closed had just opened.",
  code: `let userX, userY;
let userSize = 80;
let classmateSize = 70;
let otherPersonBaseSize;

let userInitialColor;
let userConnectedColor;
let classmateInitialColor;
let classmateConnectedColor;
let paleBlueBgColor;
let tableColor;

let otherPeopleData = [];

let animationState = 0;
let stateTimer = 0;

const INITIAL_DELAY_DURATION = 60;
const APPROACH_DURATION = 240;
const CHILL_DURATION = 360;
const HAPPY_TOGETHER_DURATION = 600;

let classmateCurrentX, classmateCurrentY;
let classmateStartX, classmateStartY;
let classmateTargetX, classmateTargetY;

let tableBaseWidth;
let tableBaseHeight;
let mainTableCenterX, mainTableCenterY;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();

  userInitialColor = color(100);
  userConnectedColor = color(255, 180, 100);
  classmateInitialColor = color(150, 200, 255);
  classmateConnectedColor = color(255, 180, 100);
  paleBlueBgColor = color(200, 220, 240);
  tableColor = color(160, 180, 200, 150);

  tableBaseWidth = width * 0.2;
  tableBaseHeight = height * 0.15;
  otherPersonBaseSize = userSize * 0.5;

  resetAnimation();
  initializeOtherPeopleData();
}

function initializeOtherPeopleData() {
  otherPeopleData = [];
  let tableMarginX = width * 0.15;
  let tableMarginY = height * 0.15;
  let pSize = otherPersonBaseSize;

  const addPeopleAtTable = (tableCenterX, tableCenterY, tableW, tableH, numPeople) => {
    for (let i = 0; i < numPeople; i++) {
      let angle = map(i, 0, numPeople, 0, TWO_PI);
      let xOffset = cos(angle) * (tableW / 2 + pSize / 2 + 5);
      let yOffset = sin(angle) * (tableH / 2 + pSize / 2 + 5);
      let randomPersonColor = color(random(100, 200), random(100, 200), random(100, 200), 180);
      otherPeopleData.push({ x: tableCenterX + xOffset, y: tableCenterY + yOffset, size: pSize, color: randomPersonColor });
    }
  };

  addPeopleAtTable(tableMarginX, tableMarginY, tableBaseWidth, tableBaseHeight, 3);
  addPeopleAtTable(width - tableMarginX, tableMarginY, tableBaseWidth, tableBaseHeight, 4);
  addPeopleAtTable(tableMarginX, height - tableMarginY, tableBaseWidth, tableBaseHeight, 3);
  addPeopleAtTable(width - tableMarginX, height - tableMarginY, tableBaseWidth, tableBaseHeight, 4);
}

function resetAnimation() {
  animationState = 0;
  stateTimer = 0;
  classmateCurrentX = -classmateSize;
  classmateCurrentY = height / 2;
  mainTableCenterX = width / 2;
  mainTableCenterY = height / 2;
  userX = mainTableCenterX - tableBaseWidth * 0.3;
  userY = mainTableCenterY;
  classmateTargetX = mainTableCenterX + tableBaseWidth * 0.3;
  classmateTargetY = mainTableCenterY;
}

function draw() {
  background(paleBlueBgColor);
  drawTables();

  for (let i = 0; i < otherPeopleData.length; i++) {
    let person = otherPeopleData[i];
    fill(person.color);
    ellipse(person.x, person.y, person.size, person.size);
  }

  let pulsation = sin(frameCount * 0.05) * (userSize * 0.08);
  let brightnessPulse = map(sin(frameCount * 0.05), -1, 1, 0, 40);

  if (animationState === 0) {
    fill(userInitialColor);
    ellipse(userX, userY, userSize, userSize);
    fill(classmateInitialColor);
    ellipse(classmateCurrentX, classmateCurrentY, classmateSize, classmateSize);
    stateTimer++;
    if (stateTimer > INITIAL_DELAY_DURATION) { animationState = 1; stateTimer = 0; classmateStartX = -classmateSize; classmateStartY = height / 2; }
  } else if (animationState === 1) {
    let progress = easeInOutQuad(stateTimer / APPROACH_DURATION);
    classmateCurrentX = lerp(classmateStartX, classmateTargetX, progress);
    classmateCurrentY = lerp(classmateStartY, classmateTargetY, progress);
    fill(userInitialColor);
    ellipse(userX, userY, userSize, userSize);
    fill(classmateInitialColor);
    ellipse(classmateCurrentX, classmateCurrentY, classmateSize, classmateSize);
    stateTimer++;
    if (stateTimer > APPROACH_DURATION) { animationState = 2; stateTimer = 0; }
  } else if (animationState === 2) {
    let progress = easeInOutQuad(stateTimer / CHILL_DURATION);
    fill(lerpColor(userInitialColor, userConnectedColor, progress));
    ellipse(userX, userY, userSize, userSize);
    fill(lerpColor(classmateInitialColor, classmateConnectedColor, progress));
    ellipse(classmateTargetX, classmateTargetY, classmateSize, classmateSize);
    let glowAlpha = map(progress, 0, 1, 0, 40);
    for (let i = 0; i < 3; i++) {
      fill(255, 255, 200, map(i, 0, 2, glowAlpha, 0));
      ellipse(userX, userY, userSize + i * 12, userSize + i * 12);
      ellipse(classmateTargetX, classmateTargetY, classmateSize + i * 12, classmateSize + i * 12);
    }
    stateTimer++;
    if (stateTimer > CHILL_DURATION) { animationState = 3; stateTimer = 0; }
  } else if (animationState === 3) {
    let pu = userSize + pulsation;
    let pc = classmateSize + pulsation;
    fill(color(red(userConnectedColor) + brightnessPulse, green(userConnectedColor) + brightnessPulse, blue(userConnectedColor) + brightnessPulse));
    ellipse(userX, userY, pu, pu);
    fill(color(red(classmateConnectedColor) + brightnessPulse, green(classmateConnectedColor) + brightnessPulse, blue(classmateConnectedColor) + brightnessPulse));
    ellipse(classmateTargetX, classmateTargetY, pc, pc);
    for (let i = 0; i < 3; i++) {
      fill(255, 255, 200, map(i, 0, 2, 60, 0));
      ellipse(userX, userY, pu + i * 12, pu + i * 12);
      ellipse(classmateTargetX, classmateTargetY, pc + i * 12, pc + i * 12);
    }
    stateTimer++;
    if (stateTimer > HAPPY_TOGETHER_DURATION) { resetAnimation(); }
  }
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function drawTables() {
  rectMode(CENTER);
  fill(tableColor);
  rect(mainTableCenterX, mainTableCenterY, tableBaseWidth, tableBaseHeight, 10);
  let tableMarginX = width * 0.15;
  let tableMarginY = height * 0.15;
  rect(tableMarginX, tableMarginY, tableBaseWidth, tableBaseHeight, 10);
  rect(width - tableMarginX, tableMarginY, tableBaseWidth, tableBaseHeight, 10);
  rect(tableMarginX, height - tableMarginY, tableBaseWidth, tableBaseHeight, 10);
  rect(width - tableMarginX, height - tableMarginY, tableBaseWidth, tableBaseHeight, 10);
  rectMode(CORNER);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  tableBaseWidth = windowWidth * 0.2;
  tableBaseHeight = windowHeight * 0.15;
  otherPersonBaseSize = userSize * 0.5;
  resetAnimation();
  initializeOtherPeopleData();
}`,
};

interface GalleryModalProps {
  onClose: () => void;
}

export function GalleryModal({ onClose }: GalleryModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === backdropRef.current) onClose();
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-[32px] border border-white/55 bg-white/90 shadow-[0_24px_96px_rgba(18,34,41,0.18)] backdrop-blur overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-8 pt-7 pb-5 shrink-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--muted)]">
              Gallery
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[color:var(--ink)]">
              Feelings in Motion
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close gallery"
            className="mt-1 rounded-full p-2 text-[color:var(--muted)] transition hover:bg-black/8 hover:text-[color:var(--ink)]"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Sketch iframe */}
        <div className="mx-8 shrink-0 overflow-hidden rounded-[20px] border border-[color:var(--line)] bg-[#f7f3eb]" style={{ height: "360px" }}>
          <iframe
            title="Gallery sketch"
            sandbox="allow-scripts"
            srcDoc={buildPreviewHtml(GALLERY_EXAMPLE.code)}
            className="h-full w-full border-0"
          />
        </div>

        {/* Prompt + disclaimer */}
        <div className="px-8 pt-5 pb-6 space-y-3 shrink-0">
          <p className="text-sm leading-6 text-[color:var(--ink)]">
            &ldquo;{GALLERY_EXAMPLE.prompt}&rdquo;
          </p>
          <p className="text-xs leading-5 text-[color:var(--muted)]">
            This is the <span className="font-medium text-[color:var(--ink)]">initial prompt</span>. The sketch above is the result after{" "}
            <span className="font-medium text-[color:var(--ink)]">7+ rounds of iteration</span> — the user added more detail and context with each message, gradually shaping the sketch into something more descriptive.
          </p>
        </div>

        {/* Call to action */}
        <div className="border-t border-[color:var(--line)] px-8 py-5 flex items-center justify-between gap-4 shrink-0">
          <p className="text-sm text-[color:var(--muted)]">
            Feeling inspired?{" "}
            <span className="font-medium text-[color:var(--ink)]">Make your own p5.js sketch</span>{" "}
            by describing a moment that stayed with you.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full bg-[color:var(--ink)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-black"
          >
            Start creating
          </button>
        </div>
      </div>
    </div>
  );
}
