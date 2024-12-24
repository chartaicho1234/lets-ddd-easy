let player;
let targetTimings = [14.93, 15.33, 15.70, 16.10, 16.45, 21.06, 21.41, 21.83, 22.19, 22.56, 39.43, 39.84, 40.21, 40.58, 40.94, 60.03, 60.40, 62.72, 63.08, 63.47, 72.28, 72.68, 74.96, 75.34, 75.70, 83.76, 84.13, 84.53, 84.89, 85.26, 89.85, 90.23, 90.62, 91.01, 91.38, 122.73, 123.12, 125.38, 125.78, 126.18, 135.00, 135.37, 137.67, 138.07, 138.43, 186.97, 187.36, 189.62, 190.02, 190.41, 199.12, 199.53, 201.81, 202.21, 202.62, 210.58, 210.98, 211.38, 211.76, 212.13, 216.71, 217.09, 217.49, 217.89, 218.27]; // 判定したいタイミング（秒）
let score = 0;
let isPlaying = false;
let timingHistory = []; // 記録用の配列を追加
let previousTimingHistory = []; // 前回の記録を保存

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
    const timingLog = document.getElementById('timing-log');
    
    // 最も近いターゲットタイミングを探す
    const nearestTiming = targetTimings.reduce((nearest, timing) => {
        return Math.abs(currentTime - timing) < Math.abs(currentTime - nearest) ? timing : nearest;
    });

    const timingDifference = Math.abs(currentTime - nearestTiming);
    const formattedTime = currentTime.toFixed(2);
    let result;
    
    // 判定（0.5秒以内なら成功）
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
    
    // 記録を配列に追加
    timingHistory.push({
        time: formattedTime,
        result: result
    });
    
    // 記録を表示
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
  