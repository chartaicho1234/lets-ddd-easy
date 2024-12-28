let player;
let targetTimings = [14.829, 15.211, 15.594, 15.976, 16.358, 20.944, 21.326, 21.708, 22.090, 22.473, 39.288, 39.670, 40.052, 40.434, 40.817, 59.925, 60.307, 62.600, 62.982, 63.364, 72.154, 72.536, 74.829, 75.211, 75.594, 83.619, 84.001, 84.383, 84.766, 85.148, 89.734, 90.116, 90.498, 90.880, 91.262, 122.600, 122.982, 125.275, 125.657, 126.039, 134.829, 135.211, 137.504, 137.887, 138.269, 186.804, 187.186, 189.479, 189.861, 190.243, 199.033, 199.415, 201.708, 202.090, 202.473, 210.498, 210.880, 211.262, 211.645, 212.027, 216.613, 216.995, 217.377, 217.759, 218.141];
let score = 0;
let isPlaying = false;
let timingHistory = [];
let previousTimingHistory = [];
let canvas;
let ctx;
let lastFrameTime = 0;
let currentVersion = 'v1';
let isYouTubeAPIReady = false;
let isPlayerReady = false;
let animationFrameId = null;

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

// スタートボタンのイベントリスナー
document.getElementById("start-button").addEventListener("click", function() {
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
        checkTiming();
    }
});

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
function drawNotesCommon(ctx, currentTime, version) {
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
        
        const shouldDrawBeat = version === 'v1' ?
            (timeUntilBeat > 0 && timeUntilBeat < 3 && beatTime >= OFFSET) :
            (timeUntilBeat > -1 && timeUntilBeat < 3 && beatTime >= OFFSET);

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
        const timeUntilNote = timing - currentTime;
        const shouldDraw = version === 'v1' ? 
            (timeUntilNote > 0 && timeUntilNote < 3) :
            (timeUntilNote > -1 && timeUntilNote < 3 && !judgedTimings.has(timing));

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
    drawNotesCommon(ctx, currentTime, 'v1');
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
        
        const timing = targetTimings[noteIndex];
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
function checkMissedNotes(currentTime, version) {
    if (version === 'v2') {
        targetTimings.forEach(timing => {
            const timeUntilNote = timing - currentTime;
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

        checkMissedNotes(currentTime, 'v2');
        drawNotesCommon(ctx, currentTime, 'v2');
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
        const timeDiff = Math.abs(currentTime - firstNote.timing);

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

// v1の機能を適用
function applyV1Features() {
    window.drawNotes = function(deltaTime) {
        if (!isPlaying) return;

        const canvas = document.getElementById('notes-canvas');
        const ctx = canvas.getContext('2d');
        const currentTime = player.getCurrentTime();

        drawNotesCommon(ctx, currentTime, 'v1');
    };

    window.checkTiming = function() {
        if (!checkPlayerReady() || !isPlaying) return;

        const currentTime = player.getCurrentTime();
        const feedback = document.getElementById('feedback');
        
        const nearestTiming = targetTimings.reduce((nearest, timing) => {
            return Math.abs(currentTime - timing) < Math.abs(currentTime - nearest) ? timing : nearest;
        });

        const timingDifference = Math.abs(currentTime - nearestTiming);
        const formattedTime = currentTime.toFixed(3);
        let result;
        
        showHitEffect();
        
        if (timingDifference <= 0.5) {
            score += Math.floor((1 - timingDifference) * 100);
            feedback.textContent = "Perfect!";
            feedback.style.color = "green";
            result = "Perfect!";
        } else if (timingDifference <= 1.0) {
            score += 50;
            feedback.textContent = "Good!";
            feedback.style.color = "blue";
            result = "Good!";
        } else {
            feedback.textContent = "Miss!";
            feedback.style.color = "red";
            result = "Miss!";
        }
        
        timingHistory.push({
            time: formattedTime,
            result: result
        });
        
        updateTimingLog();
        updateScore();
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
    
    document.getElementById("start-button").textContent = "練習開始！";
    document.getElementById("feedback").textContent = "";
    updateScore();
    updateTimingLog();
    
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

    if (currentVersion === 'v1') {
        currentVersion = 'v2';
        console.log('Switching to v2...');
        try {
            applyV2Features();
            console.log('v2 features applied successfully');
        } catch (error) {
            console.error('Error applying v2 features:', error);
        }
    } else {
        currentVersion = 'v1';
        console.log('Switching to v1...');
        try {
            applyV1Features();
            console.log('v1 features applied successfully');
        } catch (error) {
            console.error('Error applying v1 features:', error);
        }
    }

    updateVersionDisplay();
    showVersionChangeNotification();
}

// バージョン表示の更新
function updateVersionDisplay() {
    const versionSwitch = document.getElementById('version-switch');
    if (versionSwitch) {
        versionSwitch.textContent = currentVersion;
        versionSwitch.title = `Click to switch to ${currentVersion === 'v1' ? 'v2' : 'v1'}`;
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
});

// 初期のcheckTiming関数（v1のデフォルト実装）
window.checkTiming = function() {
    if (!checkPlayerReady() || !isPlaying) return;

    const currentTime = player.getCurrentTime();
    const feedback = document.getElementById('feedback');
    
    const nearestTiming = targetTimings.reduce((nearest, timing) => {
        return Math.abs(currentTime - timing) < Math.abs(currentTime - nearest) ? timing : nearest;
    });

    const timingDifference = Math.abs(currentTime - nearestTiming);
    const formattedTime = currentTime.toFixed(3);
    let result;
    
    showHitEffect();
    
    if (timingDifference <= 0.5) {
        score += Math.floor((1 - timingDifference) * 100);
        feedback.textContent = "Perfect!";
        feedback.style.color = "green";
        result = "Perfect!";
    } else if (timingDifference <= 1.0) {
        score += 50;
        feedback.textContent = "Good!";
        feedback.style.color = "blue";
        result = "Good!";
    } else {
        feedback.textContent = "Miss!";
        feedback.style.color = "red";
        result = "Miss!";
    }
    
    timingHistory.push({
        time: formattedTime,
        result: result
    });
    
    updateTimingLog();
    updateScore();
};

// resetGameのエイリアスを追加（既存のコードの最後に追加）
function resetGame() {
    resetGameState();
}