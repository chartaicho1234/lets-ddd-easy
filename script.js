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
    
    // UI表示をリセット
    document.getElementById("start-button").textContent = "練習開始！";
    document.getElementById("feedback").textContent = "";
    updateScore();
    updateTimingLog();

    // 動画を未再生状態に戻す
    setTimeout(() => {
        player.cueVideoById('NX0GAXLvKFQ');
        document.getElementById("start-button").disabled = false;
    }, 100);
}

function restartGame() {
    score = 0;
    timingHistory = [];
    updateScore();
    updateTimingLog();
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
        checkTiming();
    }
});

function checkTiming() {
    const currentTime = player.getCurrentTime();
    const feedback = document.getElementById('feedback');
    
    const nearestTiming = targetTimings.reduce((nearest, timing) => {
        return Math.abs(currentTime - timing) < Math.abs(currentTime - nearest) ? timing : nearest;
    });

    const timingDifference = Math.abs(currentTime - nearestTiming);
    const formattedTime = currentTime.toFixed(3);
    let result;
    
    showHitEffect(); // クリック時にエフェクトを表示
    
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
}

function updateScore() {
    document.getElementById('score-display').textContent = `スコア: ${score}`;
}

// 記録を表示する関数
function updateTimingLog() {
    const timingLog = document.getElementById('timing-log');
    let logHTML = '<div class="timing-records">';
    timingHistory.forEach(record => {
        logHTML += `<div class="timing-record ${record.result.toLowerCase()}">${record.result}: ${record.time}秒</div>`;
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
        
        // Canvasの実サイズをデバイスピクセル密度に合わせる
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        // 表示サイズは維持
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        
        // 描画コンテキストのスケールを調整
        ctx.scale(dpr, dpr);
        
        // タッチデバイスでの描画を滑らかにする
        ctx.imageSmoothingEnabled = true;
    }
    
    // 初期化時とリサイズ時にCanvasを調整
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // タッチイベントの追加（スマホ対応）
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault(); // デフォルトの動作を防止
        if (isPlaying) {
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const currentTime = player.getCurrentTime();
    
    // 4分音符のガイドラインを描画（最初に描画して一番奥に表示）
    const visibleBeats = 12;
    for (let i = 0; i < visibleBeats; i++) {
        // 現在時刻から次の拍を計算
        const currentBeat = Math.ceil((currentTime - OFFSET) / (60.0000 / BPM));
        const beatTime = OFFSET + ((currentBeat + i) * 60.0000 / BPM);
        const timeUntilBeat = beatTime - currentTime;
        
        // オフセット時間より前は描画しない条件を追加
        if (timeUntilBeat > 0 && timeUntilBeat < 3 && beatTime >= OFFSET) {
            const x = JUDGE_LINE_X + (timeUntilBeat * NOTE_SPEED);
            
            // 4拍子の判定（BPMに基づいて直接計算）
            const beatNumber = currentBeat + i;
            const isBarLine = beatNumber % 4 === 0;
            
            // 縦線の描画
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.strokeStyle = isBarLine ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = isBarLine ? 2 : 1;
            ctx.stroke();
        }
    }
    
    // ノーツの描画（次に描画）
    targetTimings.forEach(timing => {
        const timeUntilNote = timing - currentTime;
        if (timeUntilNote > 0 && timeUntilNote < 3) {
            const x = JUDGE_LINE_X + (timeUntilNote * NOTE_SPEED);
            const y = canvas.height / 2;
            
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.arc(x, y, NOTE_WIDTH/2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    // 判定線の描画（最後に描画して一番手前に表示）
    ctx.beginPath();
    ctx.moveTo(JUDGE_LINE_X, 0);
    ctx.lineTo(JUDGE_LINE_X, canvas.height);
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// 判定時のエフェクト
function showHitEffect() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(JUDGE_LINE_X, canvas.height/2, NOTE_WIDTH, 0, Math.PI * 2);
    ctx.fill();
}
  