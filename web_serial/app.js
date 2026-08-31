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
const btnSetDotMode = document.getElementById('btn-set-dot-mode');
const selectDotMode = document.getElementById('select-dot-mode');
const rangeBrightness = document.getElementById('range-brightness');
const valBrightnessDisp = document.getElementById('val-brightness-disp');
const rangeSensorTH = document.getElementById('range-sensor-th');
const valSensorTHDisp = document.getElementById('val-sensor-th-disp');
const statusDot = document.getElementById('status-dot');
const logConsole = document.getElementById('log-console');
const valTemp = document.getElementById('val-temp');
const valHum = document.getElementById('val-hum');
const valPress = document.getElementById('val-press');
const valLsL = document.getElementById('val-ls-l');
const valLsR = document.getElementById('val-ls-r');
const valBoardId = document.getElementById('val-board-id');
const valBoardTemp = document.getElementById('val-board-temp');
const toggleGps = document.getElementById('toggle-gps');
const toggleSensor = document.getElementById('toggle-sensor');
const toggleDark = document.getElementById('toggle-dark');
const toggleXfade = document.getElementById('toggle-xfade');
const toggleRotate = document.getElementById('toggle-rotate');
const toggleAP = document.getElementById('toggle-ap');
const selectTimezone = document.getElementById('select-timezone');
const btnSetTimezone = document.getElementById('btn-set-timezone');
const inputScheduleTime = document.getElementById('input-schedule-time');
const btnSetSchedule = document.getElementById('btn-set-schedule');
const btnSetDefault = document.getElementById('btn-set-default');
const btnSetDm = document.getElementById('btn-set-dm');
const inputCustomVal = document.getElementById('input-custom-val');
const btnSetCustomVal = document.getElementById('btn-set-custom-val');
const btnDFU = document.getElementById('btn-set-dfu');

// ==========================================
// イベントリスナーの登録
// ==========================================

// Web Serial接続/切断ボタン
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

// dot mode変更ボタン
btnSetDotMode.addEventListener('click', () => {
    const selectedMode = selectDotMode.value;
    sendJsonCommand({
        cmd: "SET_DOT_MODE",
        mode: selectedMode
    });
    appendLog(`[送信] ドットモード設定: ${selectedMode}`);
});

// 輝度スライダーの変更イベント
rangeBrightness.addEventListener('change', () => {
    const brightnessVal = parseInt(rangeBrightness.value, 10);
    sendJsonCommand({
        cmd: "SET_BRIGHTNESS",
        val: brightnessVal
    });
    appendLog(`[送信] 輝度変更: ${brightnessVal}`);
});

// 輝度スライダーの数値表示リアルタイム更新
rangeBrightness.addEventListener('input', () => {
    valBrightnessDisp.textContent = rangeBrightness.value;
});

// センサー感度スライダーの変更イベント
rangeSensorTH.addEventListener('change', () => {
    const sensorTHVal = parseInt(rangeSensorTH.value, 10);
    sendJsonCommand({
        cmd: "SET_SENSOR_TH",
        val: sensorTHVal
    });
    appendLog(`[送信] センサー感度変更: ${sensorTHVal}`);
});

// センサー感度スライダーの数値表示リアルタイム更新
rangeSensorTH.addEventListener('input', () => {
    valSensorTHDisp.textContent = rangeSensorTH.value;
});

// トグル切り替えイベント
toggleGps.addEventListener('change', () => {
    const isEnabled = toggleGps.checked;

    sendJsonCommand({
        cmd: "SET_GPS",
        enabled: isEnabled
    });

    appendLog(`[送信] GPS同期機能: ${isEnabled ? "ON" : "OFF"}`);
});

toggleSensor.addEventListener('change', () => {
    const isEnabled = toggleSensor.checked;

    sendJsonCommand({
        cmd: "SET_SENSOR",
        enabled: isEnabled
    });

    appendLog(`[送信] センサー有効: ${isEnabled ? "ON" : "OFF"}`);
});

toggleDark.addEventListener('change', () => {
    const isEnabled = toggleDark.checked;

    sendJsonCommand({
        cmd: "SET_DARK",
        enabled: isEnabled
    });

    appendLog(`[送信] 消灯機能: ${isEnabled ? "ON" : "OFF"}`);
});

toggleXfade.addEventListener('change', () => {
    const isEnabled = toggleXfade.checked;

    sendJsonCommand({
        cmd: "SET_XFADE",
        enabled: isEnabled
    });

    appendLog(`[送信] クロスフェード: ${isEnabled ? "ON" : "OFF"}`);
});

toggleRotate.addEventListener('change', () => {
    const isEnabled = toggleRotate.checked;

    sendJsonCommand({
        cmd: "SET_ROTATE",
        enabled: isEnabled
    });

    appendLog(`[送信] 回転: ${isEnabled ? "ON" : "OFF"}`);
});

toggleAP.addEventListener('change', () => {
    const isEnabled = toggleAP.checked;

    sendJsonCommand({
        cmd: "SET_AP",
        enabled: isEnabled
    });

    appendLog(`[送信] アンチポイズニング: ${isEnabled ? "ON" : "OFF"}`);
});

btnSetTimezone.addEventListener('click', () => {
    const tzOffset = parseInt(selectTimezone.value, 10);
    sendJsonCommand({
        cmd: "SET_TZ",
        offset: tzOffset
    });
    appendLog(`[送信] タイムゾーン設定: UTC${tzOffset >= 0 ? '+' : ''}${tzOffset}`);
});

btnSetSchedule.addEventListener('click', () => {
    const timeVal = inputScheduleTime.value; // "HH:MM" 形式 (例: "03:00")
    if (!timeVal) return;

    const [hourStr, minStr] = timeVal.split(':');
    const hour = parseInt(hourStr, 10);
    const min = parseInt(minStr, 10);

    sendJsonCommand({
        cmd: "SET_SCHEDULE",
        hour: hour,
        min: min
    });

    appendLog(`[送信] 定時実行時刻設定: ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
});

btnSetDefault.addEventListener('click', () => {
    sendJsonCommand({
        cmd: "SET_DEFAULT"
    });
    appendLog(`[送信] デフォルト設定を適用`);
});

btnSetDm.addEventListener('click', () => {
    sendJsonCommand({
        cmd: "SET_DM"
    });
    appendLog(`[送信] 測定を開始`);
});

btnSetCustomVal.addEventListener('click', () => {
    const rawVal = inputCustomVal.value;
    const numVal = parseFloat(rawVal);

    // バリデーション（数値であること & 0 〜 9.9999999 の範囲内）
    if (isNaN(numVal) || numVal < 0 || numVal > 9.999999) {
        alert("0.000000 〜 9.999999 の範囲で入力してください。");
        return;
    }

    sendJsonCommand({
        cmd: "SET_VALUE",
        val: numVal
    });

    appendLog(`[送信] パラメータ設定: ${numVal.toFixed(7)}`);
});

// DFU mode
btnDFU.addEventListener('click', async () => {
    if (!port) return;

    if (!confirm('ファームウェアアップデートモードに移行しますか？\n接続が切断されます。')) return;

    try {
        // 1. 現在のポートを保持しておく
        const targetPort = port;

        // 2. 現在の接続を完全に切断する（後述の重要ポイント）
        await disconnect();

        // ポート解放待ち（OS側の処理待ち）
        await new Promise(r => setTimeout(r, 500));

        // 3. 1200bpsでオープン (1200bps Touch)
        appendLog('ブートローダ起動シーケンス: 1200bps Open');

        // タイミングによっては "The port is already open" になることがあるためリトライ処理を入れると親切
        for (let i = 0; i < 3; i++) {
            try {
                await targetPort.open({ baudRate: 1200 });
                break;
            } catch (e) {
                if (i === 2) throw e;
                appendLog(`Open retry ${i + 1}...`);
                await new Promise(r => setTimeout(r, 500));
            }
        }

        // 4. DTR信号の操作 (DTRをON→OFFすることでリセットトリガーとなる)
        await targetPort.setSignals({ dataTerminalReady: true });
        await new Promise(r => setTimeout(r, 200));
        await targetPort.setSignals({ dataTerminalReady: false });

        // 5. クローズしてリセット発動
        await targetPort.close();

        alert('デバイスをリセットしました。RPI-RP2ドライブに.uf2ファイルをコピーしてください。');
        elBtnConnect.disabled = false;
        elBtnFirmwareUpdate.disabled = true;

    } catch (e) {
        console.error(e);
        alert('エラーが発生しました: ' + e.message);
    }
});

// USBケーブルが物理的に抜かれた場合の自動処理
if ("serial" in navigator) {
    navigator.serial.addEventListener('disconnect', (event) => {
        if (event.target === port) {
            setConnectedState(false);
            appendLog("[システム] USBデバイスが物理的に取り外されました。");
            disconnectSerial();
        }
    });
}

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
        sendJsonCommand({
            cmd: "CONNECTED",
        });

        // 受信ループの開始
        readLoop();

    } catch (error) {
        appendLog(`[エラー] 接続失敗: ${error.message}`);
        console.error(error);
    }
}

// シリアルポート切断関数
// async function disconnectSerial() {
//     if (reader) {
//         await reader.cancel();
//     }
//     if (writer) {
//         await writer.close();
//     }
//     if (port) {
//         await port.close();
//     }
//     setConnectedState(false);
//     appendLog("[システム] 切断しました。");
// }
async function disconnect() {
    try {
        if (reader) {
            await reader.cancel();
            await readableStreamClosed.catch(() => { });
            reader = null;
        }
        if (writer) {
            await writer.close();
            await writableStreamClosed;
            writer = null;
        }
        if (port) {
            await port.close();
            port = null;
        }
        setConnectedState(false);
        appendLog("[システム] 切断しました。");
    } catch (e) {
        appendLog('Disconnect error:', e);
    }
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
                if (data.tz !== undefined) {
                    selectTimezone.value = data.tz.toString();
                }
                if (data.brightness) {
                    valBrightnessDisp.textContent = data.brightness;
                    rangeBrightness.value = data.brightness;
                }
                if (data.sensor_th) {
                    valSensorTHDisp.textContent = data.sensor_th;
                    rangeSensorTH.value = data.sensor_th;
                }
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
                if (data.pico_temp) {
                    valBoardTemp.textContent = data.pico_temp.toFixed(1);
                }
                if (data.tz) {
                    selectTimezone.value = data.tz.toString();
                }
                if (data.mode) {
                    selectMode.value = data.mode;
                }
                if (data.dot_mode) {
                    selectDotMode.value = data.dot_mode;
                }
                if (data.schedule) {
                    const h = String(data.schedule.hour).padStart(2, '0');
                    const m = String(data.schedule.min).padStart(2, '0');
                    inputScheduleTime.value = `${h}:${m}`;
                }
                if (data.features) {
                    toggleGps.checked = data.features.gps;
                    toggleSensor.checked = data.features.sensor;
                    toggleDark.checked = data.features.dark;
                    toggleXfade.checked = data.features.xfade;
                    toggleRotate.checked = data.features.rotate;
                    toggleAP.checked = data.features.ap;
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
        appendLog(`[RECV Raw Serial] ${jsonString}`);
    }
}

// JSONコマンドをRP2350へ送信（末尾に改行コード \n を付与）
async function sendJsonCommand(jsonObject) {
    if (!writer) return;
    const jsonString = JSON.stringify(jsonObject) + "\n";
    await writer.write(jsonString);
    // appendLog(`[SEND Raw Serial] ${jsonString}`);
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
    rangeSensorTH.disabled = !connected;
    btnSetDotMode.disabled = !connected;
    selectDotMode.disabled = !connected;
    btnDFU.disabled = !connected;

    const toggleGps = document.getElementById('toggle-gps');
    if (toggleGps) {
        toggleGps.disabled = !connected;
    }

    const toggleSensor = document.getElementById('toggle-sensor');
    if (toggleSensor) {
        toggleSensor.disabled = !connected;
    }

    const toggleDark = document.getElementById('toggle-dark');
    if (toggleDark) {
        toggleDark.disabled = !connected;
    }

    const toggleXfade = document.getElementById('toggle-xfade');
    if (toggleXfade) {
        toggleXfade.disabled = !connected;
    }

    const toggleRotate = document.getElementById('toggle-rotate');
    if (toggleRotate) {
        toggleRotate.disabled = !connected;
    }

    const toggleAP = document.getElementById('toggle-ap');
    if (toggleAP) {
        toggleAP.disabled = !connected;
    }

    if (selectTimezone) selectTimezone.disabled = !connected;
    if (btnSetTimezone) btnSetTimezone.disabled = !connected;
    if (selectDotMode) selectDotMode.disabled = !connected;
    if (btnSetDotMode) btnSetDotMode.disabled = !connected;
    if (selectMode) selectMode.disabled = !connected;
    if (btnSetMode) btnSetMode.disabled = !connected;
    if (inputScheduleTime) inputScheduleTime.disabled = !connected;
    if (btnSetSchedule) btnSetSchedule.disabled = !connected;
    if (btnSetDefault) btnSetDefault.disabled = !connected;
    if (btnSetDm) btnSetDm.disabled = !connected;
    if (inputCustomVal) inputCustomVal.disabled = !connected;
    if (btnSetCustomVal) btnSetCustomVal.disabled = !connected;
    if (btnDFU) btnDFU.disabled = !connected;

    if (connected) {
        statusDot.classList.add('connected');
    } else {
        statusDot.classList.remove('connected');
        resetUiToDefault();
    }
}

// コンソール領域へのログ出力追記
function appendLog(message) {
    const now = new Date().toLocaleTimeString();
    logConsole.textContent += `[${now}] ${message}\n`;
    // 常に最下部へ自動スライド
    logConsole.scrollTop = logConsole.scrollHeight;
}

// 切断時に表示をデフォルト状態へ戻す関数
function resetUiToDefault() {
    // センサー表示を初期化
    if (valTemp) valTemp.textContent = "--.-";
    if (valHum) valHum.textContent = "--.-";
    if (valPress) valPress.textContent = "----.-";
    if (valLsL) valLsL.textContent = "--";
    if (valLsR) valLsR.textContent = "--";

    // Board ID などの初期化（要素がある場合）
    const valBoardId = document.getElementById('val-board-id');
    if (valBoardId) valBoardId.textContent = "----------------";
    if (valBoardTemp) valBoardTemp.textContent = "--.-"

    // コントロール類の値を初期値に戻したい場合（任意）
    if (selectMode) selectMode.value = "clock";
    if (selectTimezone) selectTimezone.value = "9";
    if (rangeBrightness) {
        rangeBrightness.value = 25;
        if (valBrightnessDisp) valBrightnessDisp.textContent = "25";
    }
    if (rangeSensorTH) {
        rangeSensorTH.value = 6;
        if (valSensorTHDisp) valSensorTHDisp.textContent = "6";
    }
    if (selectDotMode) selectDotMode.value = "right";
    if (inputScheduleTime) inputScheduleTime.value = "03:00";
    if (inputCustomVal) inputCustomVal.value = "1.000000";
    const toggleGps = document.getElementById('toggle-gps');
    if (toggleGps) toggleGps.checked = false;
    const toggleSensor = document.getElementById('toggle-sensor');
    if (toggleSensor) toggleSensor.checked = false;
    const toggleDark = document.getElementById('toggle-dark');
    if (toggleDark) toggleDark.checked = false;
    const toggleXfade = document.getElementById('toggle-xfade');
    if (toggleXfade) toggleXfade.checked = false;
    const toggleRotate = document.getElementById('toggle-rotate');
    if (toggleRotate) toggleRotate.checked = false;
    const toggleAP = document.getElementById('toggle-ap');
    if (toggleAP) toggleAP.checked = false;
}