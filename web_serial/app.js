// ==========================================
// グローバル変数
// ==========================================
let port = null;
let reader = null;
let writer = null;
let isConnected = false;
let rxBuffer = ""; // 受信バッファ（行分割用）

// ==========================================
// DOM要素の取得
// ==========================================
const btnConnect = document.getElementById('btn-connect');
const btnSyncTime = document.getElementById('btn-sync-time');
const btnSetMode = document.getElementById('btn-set-mode');
const selectMode = document.getElementById('select-mode');
const rangeBrightness = document.getElementById('range-brightness');
const valBrightnessDisp = document.getElementById('val-brightness-disp');
const statusDot = document.getElementById('status-dot');
const logConsole = document.getElementById('log-console');

// センサー表示用エレメント
const valTemp = document.getElementById('val-temp');
const valHum = document.getElementById('val-hum');
const valPress = document.getElementById('val-press');
const valLsL = document.getElementById('val-ls-l');
const valLsR = document.getElementById('val-ls-r');
const valBoardId = document.getElementById('val-board-id');

// ==========================================
// イベントリスナーの登録
// ==========================================

// Web Serial接続・切断ボタン
btnConnect.addEventListener('click', async () => {
    if (isConnected) {
        await disconnectSerial();
    } else {
        await connectSerial();
    }
});

// PC時刻同期ボタン
btnSyncTime.addEventListener('click', () => {
    // 現在のPC時刻（UNIXエポック秒）を取得して送信
    const nowEpochSec = Math.floor(Date.now() / 1000);
    sendJsonCommand({
        cmd: "SET_TIME",
        epoch: nowEpochSec
    });
    appendLog(`[送信] PC時刻同期コマンドを送信しました (${nowEpochSec})`);
});

// 表示モード変更ボタン
btnSetMode.addEventListener('click', () => {
    const selectedMode = selectMode.value;
    sendJsonCommand({
        cmd: "SET_MODE",
        mode: selectedMode
    });
    appendLog(`[送信] 表示モード設定: ${selectedMode}`);
});

// 輝度スライダーの変更イベント
rangeBrightness.addEventListener('change', () => {
    const brightnessVal = parseInt(rangeBrightness.value, 10);
    sendJsonCommand({
        cmd: "SET_BRIGHTNESS",
        val: brightnessVal
    });
    appendLog(`[送信] 輝度変更: ${brightnessVal}%`);
});

// 輝度スライダーの数値表示リアルタイム更新
rangeBrightness.addEventListener('input', () => {
    valBrightnessDisp.textContent = rangeBrightness.value;
});


// ==========================================
// Web Serial 通信処理
// ==========================================

// シリアルポート接続関数
async function connectSerial() {
    if (!("serial" in navigator)) {
        alert("お使いのブラウザはWeb Serial APIに対応していません。ChromeまたはEdgeをご使用ください。");
        return;
    }

    try {
        // ポート選択ダイアログの表示
        port = await navigator.serial.requestPort();
        // USB CDC通信を開く (ボーレートは通常何でもOK)
        await port.open({ baudRate: 115200 });

        // 送信ストリーム準備
        const encoder = new TextEncoderStream();
        encoder.readable.pipeTo(port.writable);
        writer = encoder.writable.getWriter();

        // 接続状態の更新
        setConnectedState(true);
        appendLog("[システム] シリアルポートに接続しました。");

        // 受信ループの開始
        readLoop();

    } catch (error) {
        appendLog(`[エラー] 接続失敗: ${error.message}`);
        console.error(error);
    }
}

// シリアルポート切断関数
async function disconnectSerial() {
    if (reader) {
        await reader.cancel();
    }
    if (writer) {
        await writer.close();
    }
    if (port) {
        await port.close();
    }
    setConnectedState(false);
    appendLog("[システム] 切断しました。");
}

// データ受信ループ（バックグラウンドで常に回る）
async function readLoop() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                // ストリームが閉じられた場合
                reader.releaseLock();
                break;
            }
            if (value) {
                // 受け取った文字列をバッファに追加し、改行区切りでパースする
                rxBuffer += value;
                processBuffer();
            }
        }
    } catch (error) {
        appendLog(`[エラー] 受信エラー: ${error.message}`);
    }
}

// バッファに溜まったデータを改行コード（\n）単位で切り出して処理
function processBuffer() {
    const lines = rxBuffer.split("\n");
    // 最後の要素はまだ途切れている可能性があるためバッファに残す
    rxBuffer = lines.pop();

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.length > 0) {
            parseReceivedJson(trimmedLine);
        }
    }
}

// 受信したJSON文字列のパースと画面への反映
function parseReceivedJson(jsonString) {
    try {
        const data = JSON.parse(jsonString);

        // typeフィールドで処理を分岐
        switch (data.type) {
            case "telemetry":
                // センサー値の更新
                if (data.sht40) {
                    valTemp.textContent = data.sht40.temp.toFixed(1);
                    valHum.textContent = data.sht40.hum.toFixed(1);
                }
                if (data.lps22) {
                    valPress.textContent = data.lps22.press.toFixed(1);
                }
                if (data.ls) {
                    valLsL.textContent = data.ls.left;
                    valLsR.textContent = data.ls.right;
                }
                if (data.board_id) {
                    valBoardId.textContent = data.board_id;
                }
                break;

            case "log":
                // マイコン側からのログ出力
                appendLog(`[RP2350 Log] ${data.msg}`);
                break;

            case "response":
                // 送信コマンドへの応答結果
                appendLog(`[応答] CMD:${data.cmd} Status:${data.status}`);
                break;

            default:
                console.log("未定義のデータタイプ:", data);
        }
    } catch (e) {
        // JSON以外の生の文字列が流れてきた場合はそのままログに出す
        appendLog(`[Raw Serial] ${jsonString}`);
    }
}

// JSONコマンドをRP2350へ送信（末尾に改行コード \n を付与）
async function sendJsonCommand(jsonObject) {
    if (!writer) return;
    const jsonString = JSON.stringify(jsonObject) + "\n";
    await writer.write(jsonString);
    appendLog(jsonString);
}


// ==========================================
// 画面UI制御ユーティリティ
// ==========================================

// 接続状態に応じたボタンやUIの活性/非活性コントロール
function setConnectedState(connected) {
    isConnected = connected;
    btnConnect.textContent = connected ? "切断" : "時計に接続";
    btnSyncTime.disabled = !connected;
    btnSetMode.disabled = !connected;
    selectMode.disabled = !connected;
    rangeBrightness.disabled = !connected;

    if (connected) {
        statusDot.classList.add('connected');
    } else {
        statusDot.classList.remove('connected');
    }
}

// コンソール領域へのログ出力追記
function appendLog(message) {
    const now = new Date().toLocaleTimeString();
    logConsole.textContent += `[${now}] ${message}\n`;
    // 常に最下部へ自動スライド
    logConsole.scrollTop = logConsole.scrollHeight;
}
