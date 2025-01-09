let player;
let targetTimings = [2.600, 2.982, 3.364, 3.938, 4.320, 4.702, 4.893, 5.657, 6.039, 6.422, 6.995, 7.377, 7.759, 7.950, 8.715, 9.097, 9.479, 10.052, 10.434, 10.817, 11.008, 11.772, 12.154, 12.536, 13.110, 13.492, 13.874, 14.065, 14.829, 15.020, 15.211, 15.594, 15.785, 15.976, 16.167, 16.358, 16.740, 16.931, 17.122, 17.313, 17.504, 17.887, 18.269, 18.651, 19.224, 19.606, 19.989, 20.944, 21.135, 21.326, 21.708, 21.899, 22.090, 22.282, 22.473, 22.855, 23.046, 23.237, 23.428, 23.619, 24.001, 24.383, 24.766, 25.339, 25.721, 26.103, 38.141, 38.524, 38.906, 39.288, 39.479, 39.670, 40.052, 40.243, 40.434, 40.625, 40.817, 41.199, 41.390, 41.581, 41.772, 41.963, 42.345, 42.727, 43.110, 43.683, 44.065, 44.447, 48.460, 48.842, 49.224, 49.797, 50.180, 50.562, 54.575, 54.957, 55.339, 55.912, 56.294, 56.676, 59.925, 60.116, 60.307, 62.600, 62.791, 62.982, 63.173, 63.364, 72.154, 72.345, 72.536, 74.829, 75.020, 75.211, 75.403, 75.594, 82.090, 82.377, 82.664, 82.855, 83.046, 83.237, 83.619, 83.810, 84.001, 84.383, 84.575, 84.766, 84.957, 85.148, 85.530, 85.721, 85.912, 86.103, 86.294, 86.676, 87.059, 87.441, 88.014, 88.396, 88.778, 89.734, 89.925, 90.116, 90.498, 90.689, 90.880, 91.071, 91.262, 91.645, 91.836, 92.027, 92.218, 92.409, 92.791, 93.173, 93.555, 94.129, 94.511, 94.893, 106.931, 107.313, 107.696, 111.135, 111.517, 111.899, 112.473, 112.855, 113.237, 117.250, 117.632, 118.014, 118.587, 118.969, 119.352, 122.600, 122.791, 122.982, 125.275, 125.466, 125.657, 125.848, 126.039, 134.829, 135.020, 135.211, 137.504, 137.696, 137.887, 138.078, 138.269, 173.810, 174.192, 174.575, 175.148, 175.530, 175.912, 179.925, 180.307, 180.689, 181.262, 181.645, 182.027, 186.804, 186.995, 187.186, 189.479, 189.670, 189.861, 190.052, 190.243, 199.033, 199.224, 199.415, 201.708, 201.899, 202.090, 202.282, 202.473, 208.969, 209.256, 209.543, 209.734, 209.925, 210.116, 210.498, 210.689, 210.880, 211.262, 211.454, 211.645, 211.836, 212.027, 212.409, 212.600, 212.791, 212.982, 213.173, 213.555, 213.938, 214.320, 214.893, 215.275, 215.657, 216.613, 216.804, 216.995, 217.377, 217.568, 217.759, 217.950, 218.141, 218.524, 218.715, 218.906, 219.097, 219.288, 219.670, 220.052, 220.434, 221.008, 221.390, 221.772];
let score = 0;
let isPlaying = false;
let timingHistory = [];
let previousTimingHistory = [];
let canvas;
let ctx;
let lastFrameTime = 0;
let currentVersion = 'v2';
let isYouTubeAPIReady = false;
let isPlayerReady = false;
let animationFrameId = null;
let recordedTimesArray = [];
let timingOffset = 0; // スライダーの値

const NOTE_SPEED = 300;
const NOTE_WIDTH = 20;
const NOTE_HEIGHT = 20;
const JUDGE_LINE_X = 100;
const BPM = 157;
const OFFSET = 2.6;
const BEAT_INTERVAL = 60.0000 / BPM;
const JUDGE_RANGES = {
    PERFECT: 0.05,  // ±50ms
    GREAT: 0.10,    // ±100ms
    GOOD: 0.20,     // ±200ms
    BAD: 0.30       // ±300ms
};
const MIN_INPUT_INTERVAL = 0.1; // 100ms

// YouTube Player APIの準備
function onYouTubeIframeAPIReady() {
    console.log('YouTube API Ready');
    isYouTubeAPIReady = true;
    initializeYouTubePlayer();
}

// YouTubeプレイヤーの初期化
function initializeYouTubePlayer() {
    if (!isYouTubeAPIReady) {
        console.warn('YouTube API is not ready yet');
        return;
    }

    player = new YT.Player('player', {
        videoId: 'NX0GAXLvKFQ',
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'rel': 0,
            'fs': 0,
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

// プレイヤーの準備完了時に呼ばれる
function onPlayerReady(event) {
    console.log('Player Ready Event');
    isPlayerReady = true;
    document.getElementById("start-button").disabled = false;
}

// プレイヤーの状態変更時に呼ばれる
function onPlayerStateChange(event) {
    console.log('Player State Changed:', event.data);
    if (event.data == YT.PlayerState.PLAYING) {
        isPlaying = true;
        document.getElementById("start-button").textContent = "リズムに合わせてクリック！";
        // アニメーションが停止している場合は再開
        if (!animationFrameId) {
            startAnimation();
        }
    } else if (event.data == YT.PlayerState.ENDED) {
        isPlaying = false;
        document.getElementById("start-button").textContent = "もう一度遊ぶ";
        previousTimingHistory = [...timingHistory];
        stopAnimation();  // アニメーションを停止
    } else {
        isPlaying = false;
        document.getElementById("start-button").textContent = "練習開始！";
        stopAnimation();  // アニメーションを停止
    }
}

// プレイヤーの準備状態を確認する関数
function checkPlayerReady() {
    return isPlayerReady && player && typeof player.getPlayerState === 'function';
}

// スタートボタンのイベントリスナーを修正
const startButton = document.getElementById("start-button");

startButton.addEventListener("mousedown", function(event) {
    handleStartButtonEvent(event);
});

startButton.addEventListener("touchstart", function(event) {
    handleStartButtonEvent(event);
});

function handleStartButtonEvent(event) {
    if (!checkPlayerReady()) {
        console.log('Waiting for player to be ready...');
        return;
    }

    if (!isPlaying) {
        if (player.getPlayerState() === YT.PlayerState.ENDED) {
            restartGame();
        } else {
            player.playVideo();
            score = 0;
            timingHistory = [];
            updateScore();
            updateTimingLog();
            startAnimation();
        }
    } else {
        if (currentVersion === 'record') {
            recordTiming();
        } else {
            checkTiming();
        }
    }
}

// タイミング判定用の関数
document.addEventListener('keydown', function(event) {
    if (event.code === 'Space' && isPlaying) {
        checkTiming();
    }
});

// キャンバスの初期化と設定
function initializeCanvas() {
    const canvas = document.getElementById('notes-canvas');
    const dpr = window.devicePixelRatio || 1;
    
    // キャンバスのコンテナサイズを取得
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    
    // 両バージョンで共通の固定高さを設定
    const fixedHeight = 160;
    
    // スタイルの設定
    canvas.style.width = '100%';
    canvas.style.height = `${fixedHeight}px`;
    canvas.style.maxWidth = '100vw';
    
    // 実際のキャンバスサイズを設定
    canvas.width = containerWidth * dpr;
    canvas.height = fixedHeight * dpr;
    
    // コンテキストの設定
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    // 描画エリアをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // キャンバスの位置を中央に調整
    canvas.style.margin = '0 auto';
    canvas.style.display = 'block';
    
    return ctx;
}

// アニメーション管理
function startAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    function animate(currentTime) {
        if (!lastFrameTime) lastFrameTime = currentTime;
        const deltaTime = (currentTime - lastFrameTime) / 1000;
        lastFrameTime = currentTime;
        
        if (isPlaying) {
            drawNotes(deltaTime);
        }
        
        animationFrameId = requestAnimationFrame(animate);
    }
    
    animationFrameId = requestAnimationFrame(animate);
}

function stopAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// 共通の描画処理
function drawNotesCommon(ctx, currentTime) {
    const canvas = ctx.canvas;
    const dpr = window.devicePixelRatio || 1;
    
    // 描画エリアをクリア
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    // 描画状態を保存
    ctx.save();
    
    // 描画エリアを全体に拡大
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    
    // リズム線の描画
    const visibleBeats = 12;
    for (let i = -4; i < visibleBeats; i++) {
        const currentBeat = Math.ceil((currentTime - OFFSET) / (60.0000 / BPM));
        const beatTime = OFFSET + ((currentBeat + i) * 60.0000 / BPM);
        const timeUntilBeat = beatTime - currentTime;
        
        const shouldDrawBeat = (timeUntilBeat > -1 && timeUntilBeat < 3 && beatTime >= OFFSET);

        if (shouldDrawBeat) {
            const x = JUDGE_LINE_X + (timeUntilBeat * NOTE_SPEED);
            
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.strokeStyle = (currentBeat + i) % 4 === 0 ? 
                'rgba(255, 255, 255, 0.8)' : 
                'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = (currentBeat + i) % 4 === 0 ? 2 : 1;
            ctx.stroke();
        }
    }

    // ノーツの描画
    targetTimings.forEach(timing => {
        const adjustedTiming = timing + timingOffset;
        const timeUntilNote = adjustedTiming - currentTime;
        const shouldDraw = (timeUntilNote > -1 && timeUntilNote < 3 && !judgedTimings.has(timing));

        if (shouldDraw) {
            const x = JUDGE_LINE_X + (timeUntilNote * NOTE_SPEED);
            const y = height / 2;
            
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.arc(x, y, NOTE_WIDTH/2, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // 判定線の描画
    ctx.beginPath();
    ctx.moveTo(JUDGE_LINE_X, 0);
    ctx.lineTo(JUDGE_LINE_X, height);
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 描画状態を復元
    ctx.restore();
}

// 初期のdrawNotes関数（v1のデフォルト実装）を修正
window.drawNotes = function(deltaTime) {
    if (!isPlaying) return;

    const canvas = document.getElementById('notes-canvas');
    const ctx = canvas.getContext('2d');
    const currentTime = player.getCurrentTime();

    // 共通描画処理を呼び出し
    drawNotesCommon(ctx, currentTime);
};

// v2用のNoteJudgeManagerクラス
class NoteJudgeManager {
    constructor() {
        this.judges = Array.from({ length: 8 }, (_, index) => ({
            id: index,
            currentNoteIndex: null,
            isJudging: false
        }));
    }

    assignJudge(noteIndex) {
        const judgeId = noteIndex % 8;
        this.judges[judgeId].currentNoteIndex = noteIndex;
        this.judges[judgeId].isJudging = true;
        return this.judges[judgeId];
    }

    judge(currentTime, noteIndex) {
        const judgeId = noteIndex % 8;
        const judge = this.judges[judgeId];
        
        const timing = targetTimings[noteIndex] + timingOffset;
        const timingDifference = Math.abs(currentTime - timing);

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

    finishJudging(noteIndex) {
        const judgeId = noteIndex % 8;
        this.judges[judgeId].isJudging = false;
        this.judges[judgeId].currentNoteIndex = null;
    }
}

// MISS判定の共通処理
function checkMissedNotes(currentTime) {
    targetTimings.forEach(timing => {
        const adjustedTiming = timing + timingOffset;
        const timeUntilNote = adjustedTiming - currentTime;
        if (timeUntilNote < -JUDGE_RANGES.BAD && !judgedTimings.has(timing)) {
            const unjudgedNotes = targetTimings
                .filter(t => !judgedTimings.has(t))
                .sort((a, b) => a - b);
            
            if (unjudgedNotes[0] === timing) {
                judgedTimings.add(timing);
                showMissJudgment(currentTime);
            }
        }
    });
}

// MISS判定表示用の関数
function showMissJudgment(currentTime) {
    const feedback = document.getElementById('feedback');
    feedback.textContent = "MISS";
    feedback.style.color = "#FF0000";
    
    timingHistory.push({
        time: currentTime.toFixed(3),
        result: 'MISS',
        difference: 'Over ' + (JUDGE_RANGES.BAD * 1000).toFixed(0) + 'ms'
    });
    
    updateTimingLog();
}

// v2の判定システムを適用
function applyV2Features() {
    window.noteJudgeManager = new NoteJudgeManager();
    window.judgedTimings = new Set();
    window.successfulHits = new Set();
    window.lastJudgeTime = 0;

    window.drawNotes = function(deltaTime) {
        if (!isPlaying) return;

        const canvas = document.getElementById('notes-canvas');
        const ctx = canvas.getContext('2d');
        const currentTime = player.getCurrentTime();

        checkMissedNotes(currentTime);
        drawNotesCommon(ctx, currentTime);
    };

    window.checkTiming = function() {
        if (!checkPlayerReady() || !isPlaying) return;

        const currentTime = player.getCurrentTime();
        if (currentTime - lastJudgeTime < MIN_INPUT_INTERVAL * 0.5) return;

        const unjudgedNotes = targetTimings
            .map((timing, index) => ({ timing, index }))
            .filter(note => !judgedTimings.has(note.timing));

        if (unjudgedNotes.length === 0) return;

        const firstNote = unjudgedNotes[0];
        const timeDiff = Math.abs(currentTime - (firstNote.timing + timingOffset));

        if (timeDiff <= JUDGE_RANGES.BAD) {
            showHitEffect();
            const result = noteJudgeManager.judge(currentTime, firstNote.index);
            
            if (result) {
                judgedTimings.add(firstNote.timing);
                if (result.result !== "MISS") {
                    successfulHits.add(firstNote.timing);
                }
                updateV2UI(result, firstNote.timing, timeDiff);
                noteJudgeManager.finishJudging(firstNote.index);
            }
        }
        
        lastJudgeTime = currentTime;
    };
}

// ゲームのリセット処理
function resetGameState() {
    stopAnimation();
    
    if (checkPlayerReady()) {
        try {
            player.stopVideo();
            player.seekTo(0);
            setTimeout(() => {
                player.cueVideoById('NX0GAXLvKFQ');
                document.getElementById("start-button").disabled = false;
            }, 100);
        } catch (error) {
            console.error('Error resetting player:', error);
        }
    }
    
    isPlaying = false;
    score = 0;
    timingHistory = [];
    previousTimingHistory = [];
    lastFrameTime = 0;
    
    // ここでrecordedTimesArrayをクリア
    recordedTimesArray = [];
    
    document.getElementById("start-button").textContent = "練習開始！";
    document.getElementById("feedback").textContent = "";
    updateScore();
    updateTimingLog();
    
    // recordedTimesの表示を更新
    updateRecordedTimes();
    
    if (currentVersion === 'v2') {
        window.judgedTimings = new Set();
        window.successfulHits = new Set();
        window.lastJudgeTime = 0;
        window.noteJudgeManager = new NoteJudgeManager();
    } else {
        window.judgedTimings = undefined;
        window.successfulHits = undefined;
        window.lastJudgeTime = undefined;
        window.noteJudgeManager = undefined;
    }
    
    ctx = initializeCanvas();
}

// ゲームの再開処理
function restartGame() {
    if (!checkPlayerReady()) {
        console.warn('Player not ready, cannot restart game');
        return;
    }

    score = 0;
    timingHistory = [];
    updateScore();
    updateTimingLog();
    player.seekTo(0);
    player.playVideo();
    startAnimation();
    drawNotes(0);

    // ノーツの判定状況をリセット
    if (currentVersion === 'v2') {
        window.judgedTimings = new Set();
        window.successfulHits = new Set();
        window.lastJudgeTime = 0;
        window.noteJudgeManager = new NoteJudgeManager();
    }
}

// バージョン切り替え処理
function handleVersionSwitch() {
    if (!checkPlayerReady()) {
        console.warn('Player not ready, waiting...');
        return;
    }

    if (isPlaying && !confirm('ゲーム中です。バージョンを切り替えますか？')) {
        return;
    }

    resetGameState();

    if (currentVersion === 'v2') {
        currentVersion = 'record';
        console.log('Switching to record mode...');
    } else {
        currentVersion = 'v2';
        console.log('Switching to v2...');
        try {
            applyV2Features();
            console.log('v2 features applied successfully');
        } catch (error) {
            console.error('Error applying v2 features:', error);
        }
    }

    updateVersionDisplay();
    showVersionChangeNotification();
    updateDisplayMode(); // 表示モードを更新
}

// バージョン表示の更新
function updateVersionDisplay() {
    const versionSwitch = document.getElementById('version-switch');
    if (versionSwitch) {
        versionSwitch.textContent = currentVersion;
        versionSwitch.title = `Click to switch to ${currentVersion === 'v2' ? 'record' : 'v2'}`;
    }
}

// バージョン切り替え通知
function showVersionChangeNotification() {
    const feedback = document.getElementById('feedback');
    feedback.textContent = `${currentVersion}モードに切り替えました`;
    feedback.style.color = "#3498db";
    setTimeout(() => {
        feedback.textContent = '';
    }, 2000);
}

// スコア更新
function updateScore() {
    document.getElementById('score-display').textContent = `スコア: ${score}`;
}

// タイミングログ更新
function updateTimingLog() {
    const logContainer = document.getElementById('timing-log');
    logContainer.innerHTML = '';
    
    const recentHistory = timingHistory.slice(-10);
    recentHistory.forEach(entry => {
        const logEntry = document.createElement('div');
        logEntry.textContent = `時間: ${entry.time}, 判定: ${entry.result}${entry.difference ? ', 差: ' + entry.difference : ''}`;
        logContainer.appendChild(logEntry);
    });
}

// ヒットエフェクト表示
function showHitEffect() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(JUDGE_LINE_X, canvas.height/2, NOTE_WIDTH, 0, Math.PI * 2);
    ctx.fill();
}

// v2用のUI更新
function updateV2UI(result, timing, difference) {
    const feedback = document.getElementById('feedback');
    
    feedback.textContent = result.result;
    feedback.style.color = result.color;
    
    score += result.score;
    document.getElementById('score-display').textContent = `スコア: ${score}`;
    
    timingHistory.push({
        time: player.getCurrentTime().toFixed(3),
        result: result.result.replace('!', ''),
        difference: (difference * 1000).toFixed(1) + 'ms'
    });
    
    updateTimingLog();
}

// DOMContentLoaded時の初期化
document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('notes-canvas');
    ctx = canvas.getContext('2d');
    
    const versionSwitch = document.getElementById('version-switch');
    if (versionSwitch) {
        versionSwitch.addEventListener('click', handleVersionSwitch);
    }
    
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (isPlaying) {
            checkTiming();
        }
    }, { passive: false });
    
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.style.touchAction = 'manipulation';
    });
    
    initializeCanvas();
    startAnimation();
    applyV2Features();
    updateDisplayMode(); // 初期表示モードを設定

    // スライダーの値が変更されたときの処理
    const timingOffsetSlider = document.getElementById('timing-offset');
    const timingOffsetValue = document.getElementById('timing-offset-value');
    timingOffsetSlider.addEventListener('input', function() {
        timingOffset = parseFloat(timingOffsetSlider.value);
        timingOffsetValue.textContent = timingOffset.toFixed(1);
    });
});

// resetGameのエイリアスを追加（既存のコードの最後に追加）
function resetGame() {
    resetGameState();
}

// ノーツ記録モードの処理
function recordTiming() {
    const currentTime = player.getCurrentTime();
    timingHistory.push({
        time: currentTime.toFixed(3),
        result: 'RECORDED'
    });
    recordedTimesArray.push(currentTime.toFixed(3));
    updateTimingLog();
    updateRecordedTimes();
    console.log(`Recorded time: ${currentTime.toFixed(3)} seconds`);
}

// 記録した時間を表示する関数
function updateRecordedTimes() {
    const recordedTimesList = document.getElementById('recorded-times-list');
    recordedTimesList.innerHTML = ''; // 既存の内容をクリア

    recordedTimesArray.forEach(time => {
        const timeEntry = document.createElement('div');
        timeEntry.textContent = `時間: ${time}秒`;
        recordedTimesList.appendChild(timeEntry);
    });
}

// コピーボタンのイベントリスナーを追加
document.getElementById('copy-button').addEventListener('click', function() {
    const timesToCopy = `[${recordedTimesArray.join(', ')}]`;
    navigator.clipboard.writeText(timesToCopy).then(() => {
        console.log('記録した時間をクリップボードにコピーしました。');
        alert('記録した時間をクリップボードにコピーしました。');
    }).catch(err => {
        console.error('クリップボードへのコピーに失敗しました:', err);
    });
});

// 表示モードを更新する関数
function updateDisplayMode() {
    const timingLog = document.getElementById('timing-log');
    const recordedTimes = document.getElementById('recorded-times');

    if (currentVersion === 'record') {
        timingLog.classList.remove('record-mode-only');
        recordedTimes.classList.remove('record-mode-only');
    } else {
        timingLog.classList.add('record-mode-only');
        recordedTimes.classList.add('record-mode-only');
    }
}