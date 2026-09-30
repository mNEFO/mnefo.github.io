// ==========================================
// グローバル変数
// ==========================================
let port = null;
let reader = null;
let writer = null;
let isConnected = false;
let rxBuffer = ""; // 受信バッファ（行分割用）
// 受信した全レコードを保持する配列
let allWeatherRecords = [];
// 現在選択中の表示期間 ('1d', '1w', '1m', 'all')
let currentRange = 'all';
// 秒数定義
const SECONDS_1D = 86400;
const SECONDS_1W = 86400 * 7;
const SECONDS_1M = 86400 * 30;

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
const valUptime = document.getElementById('val-uptime');
const valStorage = document.getElementById('val-storage');
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
const btnSendManualDisplay = document.getElementById('btn-send-manual-display');
const btnFetchRecords = document.getElementById('btn-fetch-records');
const btnExportCsv = document.getElementById('btn-export-csv');
window.addEventListener('DOMContentLoaded', initCharts);

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

// 送信ボタン押下時
btnSendManualDisplay.addEventListener('click', () => {
    const tubeUnits = document.querySelectorAll('.tube-unit');
    const digits = [];
    const dots = []; // 各管のドット状態（ビットマスクまたは配列）

    tubeUnits.forEach(unit => {
        const valInput = unit.querySelector('.tube-val');
        const dotL = unit.querySelector('.dot-l').checked;
        const dotR = unit.querySelector('.dot-r').checked;

        // 数値 (0〜10)
        let num = parseInt(valInput.value, 10);
        if (isNaN(num) || num < 0) num = 10;
        if (num > 10) num = 10;
        digits.push(num);

        // ドットフラグ (例: bit0 = L, bit1 = R)
        const dotMask = (dotL ? 1 : 0) | (dotR ? 2 : 0);
        dots.push(dotMask);
    });

    // RP2350 へJSON送信
    sendJsonCommand({
        cmd: "SET_MANUAL_DISP",
        digits: digits, // [1, 2, 3, 4, 5, 6, 7, 8]
        dots: dots      // [0, 1, 3, ...] (0:なし, 1:左, 2:右, 3:両方)
    });

    appendLog(`[送信] 任意表示: [${digits.join(',')}]`);
});

document.querySelectorAll('.btn-range').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // アクティブ表示の切り替え
        document.querySelectorAll('.btn-range').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        // 範囲を適用
        const range = e.target.getAttribute('data-range');
        applyChartRange(range);
    });
});

// CSV保存ボタンのクリックイベント
btnExportCsv.addEventListener('click', () => {
    if (!allWeatherRecords || allWeatherRecords.length === 0) {
        alert("保存対象のデータがありません。先にデータを読み込んでください。");
        return;
    }

    // Excel文字化け防止用 BOM (\uFEFF) を先頭に付与
    let csvString = "\uFEFF日時,エポック秒,気温(℃),湿度(%),気圧(hPa)\r\n";

    allWeatherRecords.forEach(r => {
        const date = new Date(r.epoch * 1000);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        const timeStr = `${y}/${m}/${d} ${hh}:${mm}:${ss}`;

        csvString += `"${timeStr}",${r.epoch},${r.temp},${r.hum},${r.press}\r\n`;
    });

    // Blobの生成とダウンロードトリガー
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    // ファイル名（例: sensor_log_20260930_2045.csv）
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    a.href = url;
    a.download = `nixie_sensor_log_${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    appendLog(`[システム] CSVファイルを保存しました (${allWeatherRecords.length} 件)`);
});

// 接続状態連動 (setConnectedState 内に追加)
function updateManualDisplayControls(connected) {
    btnSendManualDisplay.disabled = !connected;
    document.querySelectorAll('.tube-val, .dot-l, .dot-r').forEach(el => { el.disabled = !connected; });
    document.querySelectorAll('.tube-val').forEach(el => { el.value = 0; });
    document.querySelectorAll('.dot-l, .dot-r').forEach(el => { el.checked = false; });
}

// 読み込みボタン押下時
btnFetchRecords.addEventListener('click', () => {
    allWeatherRecords = []; // マスターデータをリセット
    if (btnExportCsv) btnExportCsv.disabled = true; // 読込中は一時無効化
    btnFetchRecords.disabled = true;
    btnFetchRecords.textContent = "読込中...";

    sendJsonCommand({ cmd: "GET_RECORDS" });
    appendLog("[送信] 履歴データ取得リクエスト");
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
async function disconnectSerial() {
    if (reader) {
        await reader.cancel();
        reader = null;
    }
    if (writer) {
        await writer.close();
        writer = null;
    }
    if (port) {
        await port.close();
        port = null;
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

// エポック秒 (秒単位) を「MM/DD HH:mm」形式に変換する関数
function formatEpochToDateTime(epochSec) {
    if (!epochSec) return "";

    // JavaScriptのDateはミリ秒単位のため 1000倍 する
    const date = new Date(Number(epochSec) * 1000);

    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');

    // 例: "09/25 14:30"
    return `${m}/${d} ${hh}:${mm}`;
}

// JSON受信ハンドラ（parseReceivedJson 内に追加）
function handleWeatherRecords(data) {
    if (data.type === "weather_record") {
        // マスター配列にオブジェクトとして蓄積（エポック秒を保持）
        allWeatherRecords.push({
            epoch: Number(data.time || data.epoch),
            temp: data.temp,
            hum: data.hum,
            press: data.press
        });
    }
    else if (data.type === "weather_record_end") {
        applyChartRange(currentRange);

        appendLog(`[受信] 履歴データ ${data.count} 件を受信完了`);
        btnFetchRecords.disabled = false;
        btnFetchRecords.textContent = "履歴データを読み込む";

        // データが存在すればCSV保存ボタンを有効化
        if (btnExportCsv) {
            btnExportCsv.disabled = (allWeatherRecords.length === 0);
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
                if (data.flash_usage !== 0) {
                    valStorage.textContent = `${data.flash_usage} %`;
                }
                if (data.flash_usage === 0) {
                    valStorage.textContent = "0 %";
                }
                if (data.pico_temp) {
                    valBoardTemp.textContent = data.pico_temp.toFixed(1);
                }
                if (data.tuptime) {
                    const years = Math.floor(data.tuptime / 31536000);
                    const months = Math.floor((data.tuptime % 31536000) / 2592000);
                    const days = Math.floor(data.tuptime / 86400);
                    const hours = Math.floor((data.tuptime % 86400) / 3600);
                    const minutes = Math.floor((data.tuptime % 3600) / 60);
                    const seconds = data.tuptime % 60;
                    valUptime.textContent = `${years}年${months}ヶ月${days}日${hours}時間${minutes}分${seconds}秒`;
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
                if (data.dm_custom_val) {
                    inputCustomVal.value = data.dm_custom_val.toFixed(6);
                }
                if (data.photo_digits) {
                    const tubeUnits = document.querySelectorAll('.tube-unit');
                    tubeUnits.forEach((unit, index) => {
                        const valInput = unit.querySelector('.tube-val');

                        if (data.photo_digits[index] !== undefined) {
                            valInput.value = data.photo_digits[index];
                        }
                    });
                }
                if (data.photo_dots) {
                    const tubeUnits = document.querySelectorAll('.tube-unit');
                    tubeUnits.forEach((unit, index) => {
                        const dotL = unit.querySelector('.dot-l');
                        const dotR = unit.querySelector('.dot-r');

                        if (data.photo_dots[index] !== undefined) {
                            const dotMask = data.photo_dots[index];
                            dotL.checked = (dotMask & 1) !== 0;
                            dotR.checked = (dotMask & 2) !== 0;
                        }
                    });
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
        handleWeatherRecords(data);
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

    if (connected) {
        statusDot.classList.add('connected');
    } else {
        statusDot.classList.remove('connected');
        resetUiToDefault();
    }

    if (btnFetchRecords) {
        btnFetchRecords.disabled = !connected;
        btnFetchRecords.textContent = "履歴データを読み込む";
    }

    updateManualDisplayControls(connected);
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
    if (valStorage) valStorage.textContent = "-- %";

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
    if (valUptime) valUptime.textContent = "--年--ヶ月--日--時間--分--秒";

    // ... 既存のリセット処理 ...
    allWeatherRecords = [];
    if (btnExportCsv) btnExportCsv.disabled = true;
}

// ==========================================
// 気象データテレメトリー
// ==========================================

// 最大保持データ数（1秒ごとの更新なら直近1分間）
const MAX_DATA_POINTS = 60;

let chartTempHum = null;
let chartPress = null;

// グラフの初期化関数
function initCharts() {
    const commonScalesX = {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: {
            color: '#888',
            maxTicksLimit: 6, // 画面上に表示する目盛りの最大数（自動で間引き）
            maxRotation: 0,   // ラベルを斜めにせず水平に保つ
            autoSkip: true
        }
    };

    // 1. 温湿度グラフ（左右2軸）
    const ctxTempHum = document.getElementById('chart-temp-hum').getContext('2d');
    chartTempHum = new Chart(ctxTempHum, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: '気温 (℃)',
                    data: [],
                    borderColor: '#ff6b00',
                    backgroundColor: 'rgba(255, 107, 0, 0.1)',
                    yAxisID: 'yTemp',
                    tension: 0.3,
                    pointRadius: 2
                },
                {
                    label: '湿度 (%)',
                    data: [],
                    borderColor: '#00bfff',
                    backgroundColor: 'rgba(0, 191, 255, 0.1)',
                    yAxisID: 'yHum',
                    tension: 0.3,
                    pointRadius: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // リアルタイム描画のためアニメーションOFF
            scales: {
                x: commonScalesX,
                yTemp: {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: '℃', color: '#ff6b00' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#ff6b00' }
                },
                yHum: {
                    type: 'linear',
                    position: 'right',
                    min: 0,
                    max: 100,
                    title: { display: true, text: '%', color: '#00bfff' },
                    grid: { drawOnChartArea: false }, // グリッド線の重複を防ぐ
                    ticks: { color: '#00bfff' }
                }
            },
            plugins: {
                legend: { labels: { color: '#ccc' } }
            }
        }
    });

    // 2. 気圧グラフ
    const ctxPress = document.getElementById('chart-press').getContext('2d');
    chartPress = new Chart(ctxPress, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '気圧 (hPa)',
                data: [],
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                tension: 0.3,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: commonScalesX,
                y: {
                    title: { display: true, text: 'hPa', color: '#2ecc71' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#2ecc71' }
                }
            },
            plugins: {
                legend: { labels: { color: '#ccc' } }
            }
        }
    });
}

// グラフに新しいデータを1点追加する関数
function addSensorDataToChart(timeLabel, temp, hum, press) {
    if (!chartTempHum || !chartPress) return;

    // --- 温湿度更新 ---
    const thLabels = chartTempHum.data.labels;
    thLabels.push(timeLabel);
    chartTempHum.data.datasets[0].data.push(temp);
    chartTempHum.data.datasets[1].data.push(hum);

    if (thLabels.length > MAX_DATA_POINTS) {
        thLabels.shift();
        chartTempHum.data.datasets[0].data.shift();
        chartTempHum.data.datasets[1].data.shift();
    }
    chartTempHum.update();

    // --- 気圧更新 ---
    const pressLabels = chartPress.data.labels;
    pressLabels.push(timeLabel);
    chartPress.data.datasets[0].data.push(press);

    if (pressLabels.length > MAX_DATA_POINTS) {
        pressLabels.shift();
        chartPress.data.datasets[0].data.shift();
    }
    chartPress.update();
}

// 指定範囲でデータを絞り込んでグラフを更新する関数
function applyChartRange(range) {
    currentRange = range;
    if (allWeatherRecords.length === 0) return;

    // 記録されている最後のデータ（最新）のエポック秒を基準にする
    const latestEpoch = allWeatherRecords[allWeatherRecords.length - 1].epoch;
    let thresholdEpoch = 0;

    if (range === '1d') {
        thresholdEpoch = latestEpoch - SECONDS_1D;
    } else if (range === '1w') {
        thresholdEpoch = latestEpoch - SECONDS_1W;
    } else if (range === '1m') {
        thresholdEpoch = latestEpoch - SECONDS_1M;
    } else {
        thresholdEpoch = 0; // 全期間
    }

    // 該当期間内のデータを抽出
    const filtered = allWeatherRecords.filter(r => r.epoch >= thresholdEpoch);

    // ラベルとデータ配列の構築
    const labels = [];
    const temps = [];
    const hums = [];
    const pressures = [];

    filtered.forEach(r => {
        const date = new Date(r.epoch * 1000);
        let label = "";

        if (range === '1d') {
            // 1日の場合は時刻のみ「HH:mm」
            const hh = String(date.getHours()).padStart(2, '0');
            const mm = String(date.getMinutes()).padStart(2, '0');
            label = `${hh}:${mm}`;
        } else {
            // 1週間以上の場合は日付も付与「MM/DD HH:mm」
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const mm = String(date.getMinutes()).padStart(2, '0');
            label = `${m}/${d} ${hh}:${mm}`;
        }

        labels.push(label);
        temps.push(r.temp);
        hums.push(r.hum);
        pressures.push(r.press);
    });

    // グラフへの反映
    if (chartTempHum && chartPress) {
        chartTempHum.data.labels = labels;
        chartTempHum.data.datasets[0].data = temps;
        chartTempHum.data.datasets[1].data = hums;
        chartTempHum.update();

        chartPress.data.labels = labels;
        chartPress.data.datasets[0].data = pressures;
        chartPress.update();
    }
}