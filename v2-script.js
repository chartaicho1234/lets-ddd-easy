let player;
let targetTimings = [14.829, 15.211, 15.594, 15.976, 16.358, 20.944, 21.326, 21.708, 22.090, 22.473, 39.288, 39.670, 40.052, 40.434, 40.817, 59.925, 60.307, 62.600, 62.982, 63.364, 72.154, 72.536, 74.829, 75.211, 75.594, 83.619, 84.001, 84.383, 84.766, 85.148, 89.734, 90.116, 90.498, 90.880, 91.262, 122.600, 122.982, 125.275, 125.657, 126.039, 134.829, 135.211, 137.504, 137.887, 138.269, 186.804, 187.186, 189.479, 189.861, 190.243, 199.033, 199.415, 201.708, 202.090, 202.473, 210.498, 210.880, 211.262, 211.645, 212.027, 216.613, 216.995, 217.377, 217.759, 218.141]; // 判定したいタイミング（秒）
let score = 0;
let isPlaying = false;
let timingHistory = []; // 記録用の配列を追加
let previousTimingHistory = []; // 前回の記録を保存
let canvas;
let ctx;
let lastFrameTime = 0;
const NOTE_SPEED = 300; // ノーツの移動速度（ピクセル/秒）
const NOTE_WIDTH = 20;
const NOTE_HEIGHT = 20;
const JUDGE_LINE_X = 100; // 判定線のX座標
const BPM = 157;
const OFFSET = 2.6; // 最初の無音時間（秒）
const BEAT_INTERVAL = 60.0000 / BPM; // 小数点以下をより精密に  
let successfulHits = new Set(); // タップ成功したノーツを記録
let feedbackTimeout; // タイムアウトを保持する変数を追加
let judgedTimings = new Set(); // 判定済みのノーツを記録するSet
const FIRST_NOTE_TIME = Math.min(...targetTimings);

// 判定用の定数を元の値に戻す
const JUDGE_RANGES = {
    PERFECT: 0.05,  // ±50ms
    GREAT: 0.10,    // ±100ms
    GOOD: 0.20,     // ±200ms
    BAD: 0.30       // ±300ms
};

// 連続入力制御の調整（やや緩和）
const MIN_INPUT_INTERVAL = 0.05; // 50msに調整
let lastJudgeTime = 0;

// YouTube Player APIの準備
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    document.getElementById("start-button").disabled = false;
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        isPlaying = true;
        // 動画再生開始時にボタンのテキストを変更
        document.getElementById("start-button").textContent = "リズムに合わせてクリック！";
    } else if (event.data == YT.PlayerState.ENDED) {
        isPlaying = false;
        document.getElementById("start-button").textContent = "もう一度遊ぶ";
        // 現在の記録を保存
        previousTimingHistory = [...timingHistory];
    } else {
        isPlaying = false;
        // 動画停止時にボタンを元に戻す
        document.getElementById("start-button").textContent = "練習開始！";
    }
}

function resetGame() {
    // 動画を停止してから最初に戻す
    player.stopVideo();
    player.seekTo(0);
    
    // ゲーム状態をリセット
    isPlaying = false;
    score = 0;
    timingHistory = [];
    previousTimingHistory = [];
    successfulHits.clear();
    judgedTimings.clear();
    lastJudgeTime = 0;  // 最後の判定時間もリセット
    
    // 判定マネージャーをリセット
    noteJudgeManager.judges.forEach(judge => {
        judge.currentNoteIndex = null;
        judge.isJudging = false;
    });
    
    // UI表示をリセット
    document.getElementById("start-button").textContent = "練習開始！";
    document.getElementById("feedback").textContent = "";
    updateScore();
    updateTimingLog();

    // フィードバックのタイムアウトをクリア
    if (feedbackTimeout) {
        clearTimeout(feedbackTimeout);
        feedbackTimeout = null;
    }

    // 動画を未再生状態に戻す
    setTimeout(() => {
        player.cueVideoById('NX0GAXLvKFQ');
        document.getElementById("start-button").disabled = false;
    }, 100);
}

function restartGame() {
    score = 0;
    timingHistory = [];
    successfulHits.clear();
    judgedTimings.clear();
    lastJudgeTime = 0;
    
    // 判定マネージャーをリセット
    noteJudgeManager.judges.forEach(judge => {
        judge.currentNoteIndex = null;
        judge.isJudging = false;
    });
    
    // UI表示をリセット
    updateScore();
    updateTimingLog();
    
    // フィードバックのタイムアウトをクリア
    if (feedbackTimeout) {
        clearTimeout(feedbackTimeout);
        feedbackTimeout = null;
    }
    
    player.seekTo(0);
    player.playVideo();
}

document.getElementById("start-button").addEventListener("click", function() {
    if (!isPlaying) {
        if (player.getPlayerState() === YT.PlayerState.ENDED) {
            restartGame(); // 動画終了後の再開にはrestartGameを使用
        } else {
            player.playVideo();
            score = 0;
            timingHistory = [];
            updateScore();
            updateTimingLog();
        }
    } else {
        checkTiming();
    }
});

// タイミング判定用の関数
document.addEventListener('keydown', function(event) {
    if (event.code === 'Space' && isPlaying) {
        event.preventDefault(); // スペースキーのスクロールを防止
        checkTiming();
    }
});

// キーを離した時のイベントは完全に無視
document.addEventListener('keyup', function(event) {
    if (event.code === 'Space') {
        event.preventDefault(); // スペースキーのスクロールのみ防止
    }
});

// 8つの判定プログラムを管理するクラス
class NoteJudgeManager {
    constructor() {
        // 8つの判定プログラムを用意
        this.judges = Array.from({ length: 8 }, (_, index) => ({
            id: index,
            currentNoteIndex: null,  // 担当するノーツのインデックス
            isJudging: false        // 判定中かどうか
        }));
    }

    // ノーツに判定プログラムを割り当てる
    assignJudge(noteIndex) {
        const judgeId = noteIndex % 8;  // 8つの判定プログラムを循環使用
        this.judges[judgeId].currentNoteIndex = noteIndex;
        this.judges[judgeId].isJudging = true;
        return this.judges[judgeId];
    }

    // 判定を実行
    judge(currentTime, noteIndex) {
        const judgeId = noteIndex % 8;
        const judge = this.judges[judgeId];
        
        // この判定プログラムが担当するノーツのタイミング
        const timing = targetTimings[noteIndex];
        const timingDifference = Math.abs(currentTime - timing);

        // 判定処理
        if (timingDifference <= JUDGE_RANGES.PERFECT) {
            return { result: "PERFECT!", color: "#FFD700", score: 100, difference: timingDifference };
        } else if (timingDifference <= JUDGE_RANGES.GREAT) {
            return { result: "GREAT!", color: "#00FF00", score: 80, difference: timingDifference };
        } else if (timingDifference <= JUDGE_RANGES.GOOD) {
            return { result: "GOOD!", color: "#3498db", score: 50, difference: timingDifference };
        } else if (timingDifference <= JUDGE_RANGES.BAD) {
            return { result: "BAD", color: "#FFA500", score: 20, difference: timingDifference };
        }
        return null;
    }

    // 判定終了
    finishJudging(noteIndex) {
        const judgeId = noteIndex % 8;
        this.judges[judgeId].isJudging = false;
        this.judges[judgeId].currentNoteIndex = null;
    }
}

// 判定マネージャーのインスタンスを作成
const noteJudgeManager = new NoteJudgeManager();

// checkTiming関数を修正
function checkTiming() {
    const currentTime = player.getCurrentTime();
    
    if (currentTime - lastJudgeTime < MIN_INPUT_INTERVAL * 0.5) {
        return;
    }
    
    // 未判定のノーツを時系列順に取得
    const unjudgedNotes = targetTimings
        .map((timing, index) => ({ timing, index }))
        .filter(note => !judgedTimings.has(note.timing));
    
    if (unjudgedNotes.length === 0) return;
    
    // 最初の未判定ノーツを取得
    const firstNote = unjudgedNotes[0];
    const timeDiff = Math.abs(currentTime - firstNote.timing);
    
    // 判定範囲内の場合のみ判定を行う
    if (timeDiff <= JUDGE_RANGES.BAD) {
        const judge = noteJudgeManager.assignJudge(firstNote.index);
        const result = noteJudgeManager.judge(currentTime, firstNote.index);
        
        if (result) {
            judgedTimings.add(firstNote.timing);
            handleJudgment(result.result, result.color, result.score, firstNote.timing, timeDiff);
            noteJudgeManager.finishJudging(firstNote.index);
        }
    }
    
    lastJudgeTime = currentTime;
}

// 判定処理の改善
function handleJudgment(text, color, points, timing, difference) {
    const feedback = document.getElementById('feedback');
    
    if (feedbackTimeout) {
        clearTimeout(feedbackTimeout);
    }
    
    feedback.textContent = text;
    feedback.style.color = color;
    score += points;
    successfulHits.add(timing);
    
    // 実際のプレイ時のタイミングを記録
    const currentTime = player.getCurrentTime();
    timingHistory.push({
        time: currentTime.toFixed(3),  // timing ではなく currentTime を記録
        result: text.replace('!', ''),
        difference: (difference * 1000).toFixed(1) + 'ms'
    });
    
    feedbackTimeout = setTimeout(() => {
        feedback.textContent = "";
    }, 3000);
    
    updateTimingLog();
    updateScore();
}

function updateScore() {
    document.getElementById('score-display').textContent = `スコア: ${score}`;
}

// タイミングログの表示を改善
function updateTimingLog() {
    const timingLog = document.getElementById('timing-log');
    let logHTML = '<div class="timing-records">';
    timingHistory.forEach(record => {
        logHTML += `<div class="timing-record ${record.result.toLowerCase()}">
            ${record.result}: ${record.time}秒 
            ${record.difference ? `(${record.difference})` : ''}
        </div>`;
    });
    logHTML += '</div>';
    timingLog.innerHTML = logHTML;
}

// 記録をコピーする関数
function copyTimings() {
    // 現在の記録と前回の記録を結合
    const allTimings = [...previousTimingHistory, ...timingHistory];
    const timings = allTimings.map(record => record.time).join(', ');
    navigator.clipboard.writeText(timings).then(() => {
        alert('記録した時間をクリップボードにコピーしました！');
    });
}

// ボタンのタッチアクション制御を追加
document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('notes-canvas');
    ctx = canvas.getContext('2d');
    
    // デバイスのピクセル密度に対応したCanvas設定
    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        // スマホ向けの最小サイズを設定
        const minWidth = 320;
        const minHeight = 180;
        
        // 画面サイズに応じてスケーリング
        const scale = Math.min(
            window.innerWidth / minWidth,
            window.innerHeight / minHeight
        );
        
        // Canvasのサイズを調整
        canvas.width = Math.max(rect.width, minWidth) * dpr;
        canvas.height = Math.max(rect.height, minHeight) * dpr;
        
        // UIの要素もスケーリング
        const uiElements = document.querySelectorAll('.game-ui');
        uiElements.forEach(element => {
            element.style.transform = `scale(${scale})`;
        });
        
        // 描画コンテキストの調整
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
    }
    
    // 初期化時とリサイズ時にCanvasを調整
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // タッチイベントの改善
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        // 最初のタッチのみを処理
        if (isPlaying && e.touches.length === 1) {
            checkTiming();
        }
    }, { passive: false });
    
    // 既存のボタンのタッチアクション制御
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.style.touchAction = 'manipulation';
    });
});

// アニメーションループ
function animate(currentTime) {
    if (!lastFrameTime) lastFrameTime = currentTime;
    const deltaTime = (currentTime - lastFrameTime) / 1000; // 秒単位の経過時間
    lastFrameTime = currentTime;
    
    if (isPlaying) {
        drawNotes(deltaTime);
    }
    
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// ノーツの描画
function drawNotes(deltaTime) {
    ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    
    const currentTime = player.getCurrentTime();
    
    ctx.save(); // 描画状態を保存
    
    // 4分音符のガイドラインを描画（最初に描画して一番奥に表示）
    const visibleBeats = 12;
    for (let i = -4; i < visibleBeats; i++) {
        const currentBeat = Math.ceil((currentTime - OFFSET) / (60.0000 / BPM));
        const beatTime = OFFSET + ((currentBeat + i) * 60.0000 / BPM);
        const timeUntilBeat = beatTime - currentTime;
        
        // 表示範囲を拡大（-1秒から3秒）
        if (timeUntilBeat > -1 && timeUntilBeat < 3 && beatTime >= OFFSET) {
            const x = JUDGE_LINE_X + (timeUntilBeat * NOTE_SPEED);
            
            // 4拍子の判定（BPMに基づいて直接計算）
            const beatNumber = currentBeat + i;
            const isBarLine = beatNumber % 4 === 0;
            
            // 縦線の描画
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height / window.devicePixelRatio);
            ctx.strokeStyle = isBarLine ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = isBarLine ? 2 : 1;
            ctx.stroke();
        }
    }
    
    // ノーツの描画と判定線通過チェック
    targetTimings.forEach(timing => {
        const timeUntilNote = timing - currentTime;
        
        // MISS判定の条件を改善
        if (timeUntilNote < -JUDGE_RANGES.BAD && !judgedTimings.has(timing)) {
            // 未判定のノーツを時系列順に取得
            const unjudgedNotes = targetTimings
                .filter(t => !judgedTimings.has(t))
                .sort((a, b) => a - b);
            
            // 最も早い未判定ノーツの場合のみMISS判定
            if (unjudgedNotes[0] === timing) {
                judgedTimings.add(timing);
                showMissJudgment(currentTime);
            }
        }
        
        // 表示範囲を拡大（-1秒から3秒）かつ成功していないノーツのみ表示
        if (timeUntilNote > -1 && timeUntilNote < 3 && !successfulHits.has(timing)) {
            const x = JUDGE_LINE_X + (timeUntilNote * NOTE_SPEED);
            const y = canvas.height / window.devicePixelRatio / 2;
            
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.arc(x, y, NOTE_WIDTH/2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    ctx.restore(); // 描画状態を元に戻す
    
    // 判定線の描画（最後に描画して一番手前に表示）
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(JUDGE_LINE_X, 0);
    ctx.lineTo(JUDGE_LINE_X, canvas.height / window.devicePixelRatio);
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

// 判定時のエフェクト
function showHitEffect() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(JUDGE_LINE_X, canvas.height/2, NOTE_WIDTH, 0, Math.PI * 2);
    ctx.fill();
}

// MISS判定を表示する関数
function showMissJudgment(currentTime) {
    const feedback = document.getElementById('feedback');
    
    if (currentTime < FIRST_NOTE_TIME - 0.30) {
        return;
    }
    
    if (feedbackTimeout) {
        clearTimeout(feedbackTimeout);
    }
    
    feedback.textContent = "MISS";
    feedback.style.color = "#FF0000";
    
    feedbackTimeout = setTimeout(() => {
        feedback.textContent = "";
    }, 3000);
    
    // 実際のプレイ時のタイミングを記録
    timingHistory.push({
        time: currentTime.toFixed(3),  // 実際の時間を記録
        result: "MISS"
    });
    
    updateTimingLog();
}

// 画面回転時の処理
window.addEventListener('orientationchange', function() {
    // 回転アニメーション完了後にリサイズ
    setTimeout(resizeCanvas, 100);
});
   