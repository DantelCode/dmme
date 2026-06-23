let index = 0;

function go(i) {
  index = i;
  const slides = document.getElementById("slides");
  if (slides) {
    slides.classList.remove('pos-0','pos-1','pos-2');
    slides.classList.add(`pos-${i}`);
  }

  document.querySelectorAll(".dots span")
    .forEach((d, idx) => {
      d.classList.toggle("active", idx === i);
    });
}

/* SIDEBAR */
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("active");
}

/* INBOX */
function toggleInbox() {
  document.getElementById("inbox").classList.toggle("active");
  const unread = document.getElementById("unread");
  if (unread) unread.classList.add('hidden');
}

/* THEME */
function toggleTheme() {
  document.body.classList.toggle("light");
}

/* COPY */
function copyLink() {
  navigator.clipboard.writeText(
    document.getElementById("link").innerText
  );
  alert("Copied!");
}

/* MODAL */
function openModal() {
  document.getElementById("modal").classList.add("active");
}

function closeModal() {
  document.getElementById("modal").classList.remove("active");
}

/* CUSTOM INPUT */
function clearInput() {
  document.getElementById("customInput").value = "";
}

function randomMsg() {
  const msgs = [
    "You are amazing",
    "Keep going 🔥",
    "People admire you",
    "You're underrated"
  ];
  document.getElementById("customInput").value =
    msgs[Math.floor(Math.random() * msgs.length)];
}