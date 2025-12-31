const field = document.getElementById("field");
const square = document.getElementById("square");
const playButton = document.getElementById("play");
const sequenceButtons = document.getElementById("sequence-buttons");

const MAX_SEQUENCE = 10;
const sequence = {};
let currentPosition = { x: 0, y: 0 };

// Create sequence buttons (1–10)
for (let i = 1; i <= MAX_SEQUENCE; i++) {
  const btn = document.createElement("button");
  btn.textContent = i;
  btn.onclick = () => saveSequence(i);
  sequenceButtons.appendChild(btn);
}

// Move square when clicking field
field.addEventListener("click", (e) => {
  const rect = field.getBoundingClientRect();
  const x = e.clientX - rect.left - square.offsetWidth / 2;
  const y = e.clientY - rect.top - square.offsetHeight / 2;

  moveSquare(x, y);
});

// Save current position to sequence slot
function saveSequence(index) {
  sequence[index] = { ...currentPosition };
  console.log(`Saved sequence ${index}`, sequence[index]);
}

// Move square visually
function moveSquare(x, y) {
  currentPosition = { x, y };
  square.style.transform = `translate(${x}px, ${y}px)`;
}

// Play saved sequence in order
async function playSequence() {
  for (let i = 1; i <= MAX_SEQUENCE; i++) {
    if (sequence[i]) {
      moveSquare(sequence[i].x, sequence[i].y);
      await delay(300);
    }
  }
}

playButton.onclick = playSequence;

// Utility delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
