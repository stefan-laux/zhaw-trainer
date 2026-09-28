import confetti from "canvas-confetti";

export function celebrate() {
  const end = Date.now() + 900;
  const colors = ["#1E3A5F", "#C6A15B", "#DCC089", "#EDE4D3"];
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors });
}

export function burst() {
  confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 }, colors: ["#1E3A5F", "#C6A15B", "#EDE4D3"] });
}
