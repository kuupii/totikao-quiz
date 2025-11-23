let questions = [];
let wrongList = JSON.parse(localStorage.getItem("wrongList") || "[]");
let usedQuestions = [];
let currentQuestion = null;
let cycleCount = parseInt(localStorage.getItem("cycleCount") || "1");
let lastCopiedWrong = JSON.parse(localStorage.getItem("lastCopiedWrong") || "[]");

// ▼ タイムアタック用変数
let isTimeAttack = false;
let timeLeft = 300; // 5分 = 300秒
let timerInterval = null;
let taCorrectCount = 0;
let taWrongCount = 0;
let taSessionWrongList = []; // 今回のTAで間違えたリスト

// JSON読み込み
fetch("questions.json")
  .then(res => res.json())
  .then(data => {
    questions = data;
    
    // モード判定
    const mode = localStorage.getItem("quizMode");
    if (mode === "timeattack") {
      initTimeAttack();
    } else {
      isTimeAttack = false;
      newQuestion(); // 通常モード
    }
  });

// ---- タイムアタック初期化 ----
function initTimeAttack() {
  isTimeAttack = true;
  timeLeft = 300;
  taCorrectCount = 0;
  taWrongCount = 0;
  taSessionWrongList = [];

  // UI切り替え
  document.getElementById("timer-bar").classList.remove("hidden");
  document.getElementById("unknown-btn").classList.add("hidden"); // ？なし
  document.getElementById("controls").classList.add("hidden"); // 通常ボタンなし
  document.getElementById("progress-info").classList.add("hidden"); // 進捗なし
  
  updateTimerDisplay();
  
  // タイマースタート
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      finishTimeAttack();
    }
  }, 1000);

  newQuestion();
}

function updateTimerDisplay() {
  if (timeLeft < 0) timeLeft = 0;
  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');
  document.getElementById("timer-display").textContent = `${m}:${s}`;
}

// ---- 問題出題（共通） ----
function newQuestion() {
  const available = questions.filter(q => !usedQuestions.includes(q.id));

  // 全問終了時
  if (available.length === 0) {
    if (isTimeAttack) {
      // TAなら使い切ったらリセットして継続
      usedQuestions = [];
      newQuestion();
      return;
    } else {
      alert("全問終了！第" + cycleCount + "周を完了しました。");
      cycleCount++;
      localStorage.setItem("cycleCount", cycleCount);
      usedQuestions = [];
      wrongList = [];
      localStorage.setItem("wrongList", "[]");
      newQuestion();
      return;
    }
  }

  currentQuestion = available[Math.floor(Math.random() * available.length)];
  usedQuestions.push(currentQuestion.id);

  document.getElementById("question-number").textContent = "【" + currentQuestion.label + "】";
  document.getElementById("question-text").textContent = currentQuestion.text;
  
  // UIリセット
  document.getElementById("result").textContent = "";
  if (!isTimeAttack) {
    document.getElementById("next-btn").classList.add("hidden");
    document.getElementById("choices").classList.remove("hidden");
  }
}

// ---- 回答ボタン ----
document.querySelectorAll(".choice").forEach(btn => {
  btn.addEventListener("click", () => handleAnswer(btn.dataset.choice));
});

document.getElementById("unknown-btn").addEventListener("click", () => {
  handleAnswer("？");
});

function handleAnswer(userChoice) {
  const correct = currentQuestion.answer;

  if (isTimeAttack) {
    // ==== タイムアタックモード ====
    if (userChoice === correct) {
      taCorrectCount++;
    } else {
      taWrongCount++;
      taSessionWrongList.push(currentQuestion.id);
      
      // ペナルティ -20秒
      timeLeft -= 20;
      updateTimerDisplay();
      
      // 画面を赤く光らせる演出
      const timerBar = document.getElementById("timer-bar");
      timerBar.classList.add("penalty-flash");
      setTimeout(() => timerBar.classList.remove("penalty-flash"), 300);

      if (timeLeft <= 0) {
        finishTimeAttack();
        return;
      }
    }
    // 答えを表示せず即次の問題へ
    newQuestion();

  } else {
    // ==== 通常モード ====
    if (userChoice === correct) {
      document.getElementById("result").textContent = "✅ 正解！";
      wrongList = wrongList.filter(id => id !== currentQuestion.id);
    } else {
      document.getElementById("result").textContent = "❌ 不正解";
      if (!wrongList.includes(currentQuestion.id)) wrongList.push(currentQuestion.id);
    }
    localStorage.setItem("wrongList", JSON.stringify(wrongList));
    document.getElementById("next-btn").classList.remove("hidden");
    updateProgress();
  }
}

// ---- タイムアタック終了処理 ----
function finishTimeAttack() {
  clearInterval(timerInterval);
  timeLeft = 0;
  updateTimerDisplay();

  // クイズ画面を隠してリザルトを表示
  document.getElementById("quiz-container").classList.add("hidden");
  document.getElementById("timer-bar").classList.add("hidden");
  
  const resultArea = document.getElementById("final-result-area");
  resultArea.classList.remove("hidden");

  document.getElementById("score-correct").textContent = taCorrectCount;
  document.getElementById("score-wrong").textContent = taWrongCount;
}

// ---- ボタンイベント（通常モード） ----
document.getElementById("next-btn").addEventListener("click", newQuestion);

document.getElementById("copy-btn").addEventListener("click", () => {
  const newWrong = wrongList.filter(id => !lastCopiedWrong.includes(id));
  if (newWrong.length === 0) {
    alert("前回以降に新しく間違えた問題はありません。");
    return;
  }
  const copyText = newWrong.map(id => questions.find(q => q.id === id)?.label).join("\n");
  navigator.clipboard.writeText(copyText).then(() => {
    alert(`${newWrong.length}件の問題をコピーしました。`);
    lastCopiedWrong = [...new Set([...lastCopiedWrong, ...newWrong])];
    localStorage.setItem("lastCopiedWrong", JSON.stringify(lastCopiedWrong));
  });
});

document.getElementById("home-btn").addEventListener("click", () => {
  window.location.href = "index.html";
});

// ---- ボタンイベント（タイムアタック用） ----
document.getElementById("ta-home-btn").addEventListener("click", () => {
  window.location.href = "index.html";
});

document.getElementById("copy-ta-wrong-btn").addEventListener("click", () => {
  if (taSessionWrongList.length === 0) {
    alert("間違えた問題はありません。優秀です！");
    return;
  }
  const copyText = taSessionWrongList.map(id => questions.find(q => q.id === id)?.label).join("\n");
  navigator.clipboard.writeText(copyText).then(() => {
    alert("今回の誤答リストをコピーしました。");
  });
});

document.getElementById("share-x-btn").addEventListener("click", () => {
  const text = `土地家屋調査士クイズ【タイムアタック結果】\n正解：${taCorrectCount}問\n誤答：${taWrongCount}問\n#調査士クイズ\n`;
  navigator.clipboard.writeText(text).then(() => {
    alert("結果をコピーしました！Xを開いて貼り付けてください。");
    window.open("https://twitter.com/intent/tweet", "_blank");
  });
});

// 進捗表示（通常モード用）
function updateProgress() {
  const total = questions.length;
  const correctCount = usedQuestions.filter(id => !wrongList.includes(id)).length;
  document.getElementById("progress-info").textContent =
    "第" + cycleCount + "周　" + correctCount + " / " + total + "問";
}