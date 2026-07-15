function toggleWeight() {
  const selected = document.querySelector('input[name="useWeight"]:checked');
  if (!selected) return;
  const enabled = selected.value === "true";

  // 重み入力欄の表示・非表示
  document.querySelectorAll(".weight-section").forEach(section => {
    section.classList.toggle("hidden", !enabled);
  });

  // 入力可否
  document.querySelectorAll(".weight-input").forEach(input => {
    input.disabled = !enabled;
  });
}

// 現在日時を設定（追加画面のみ）
function setCurrentDateTime() {
  const paidAt = document.getElementById("paidAt");

  // 編集画面では値が入っているので何もしない
  if (!paidAt || paidAt.value) return;

  const now = new Date();

  // datetime-local用にタイムゾーン補正
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

  paidAt.value = now.toISOString().slice(0, 16);
}

// 初期化
window.addEventListener("DOMContentLoaded", () => {
  toggleWeight();
  setCurrentDateTime();
});