// ボタンクリックなどのユーザーアクションに応じて実行
async function connectToSerialPort() {
  try {
    // シリアルポートを選択するダイアログを表示
    // 注意: このメソッド呼び出しはユーザーアクションから1～5秒以内に行う必要がある
    const port = await navigator.serial.requestPort();

    // ポートを開く（ボーレートなどのオプションを指定）
    await port.open({ baudRate: 9600 });

    console.log("シリアルポートに接続しました！");
    return port;
  } catch (error) {
    console.error("接続エラー:", error);
  }
}

const logEl = document.getElementById('log');
while (port.readable) {
  reader = port.readable.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      logEl.textContent += new TextDecoder().decode(value);
    }
  } catch (error) {
    console.error(error);
  } finally {
    reader.releaseLock();
  }
}

// 安全な実装例
document.getElementById("connectButton").addEventListener("click", async () => {
  // まずユーザーアクティベーションが有効な間にAPIを呼び出す
  const port = await connectToSerialPort();

  // その後で時間のかかる処理を実行
  await someHeavyProcessing();

  // 以降の処理...
});

async function writeToSerialPort(port, data) {
  const writer = port.writable.getWriter();

  // テキストデータをUint8Array（バイト配列）に変換
  const encoder = new TextEncoder();
  const dataArrayBuffer = encoder.encode(data);

  // データを書き込む
  await writer.write(dataArrayBuffer);

  // writerを解放（他の処理でも書き込めるようにする）
  writer.releaseLock();
}

async function writeBinaryToSerialPort(port, binaryData) {
  const writer = port.writable.getWriter();

  // バイナリデータの例（コマンドバイト列）
  // 例: [0x02, 0x10, 0x03] のようなバイト列
  const data = new Uint8Array(binaryData);

  // バイナリデータを書き込む
  await writer.write(data);

  writer.releaseLock();
}

async function readFromSerialPort(port) {
  const reader = port.readable.getReader();

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        // 読み取りが完了した（ポートが閉じられたなど）
        break;
      }

      // 受信したデータ（Uint8Array）をテキストに変換
      const decoder = new TextDecoder();
      const text = decoder.decode(value);

      console.log("受信データ(テキスト):", text);
      // ここで受信データを処理する
    }
  } catch (error) {
    console.error("読み取りエラー:", error);
  } finally {
    reader.releaseLock();
  }
}

async function readBinaryFromSerialPort(port) {
  const reader = port.readable.getReader();

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      // value は Uint8Array
      console.log("受信バイナリデータ:", value);

      // バイト列を直接処理する例
      for (let i = 0; i < value.length; i++) {
        // 各バイトに対する処理
        const byte = value[i];
        console.log(`バイト ${i}: ${byte.toString(16)}`); // 16進数で表示

        // 特定のコマンドバイトを検出する例
        if (byte === 0x02) {
          console.log("開始バイトを検出");
        } else if (byte === 0x03) {
          console.log("終了バイトを検出");
        }
      }
    }
  } catch (error) {
    console.error("読み取りエラー:", error);
  } finally {
    reader.releaseLock();
  }
}

async function closeSerialPort(port) {
  await port.close();
  console.log("シリアルポートを閉じました");
}
