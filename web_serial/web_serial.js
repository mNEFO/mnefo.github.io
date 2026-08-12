// ポートの選択とオープン
const port = await navigator.serial.requestPort();
await port.open({ baudRate: 115200 }); // USB CDCなのでボーレート指定はダミーで機能します

// 受信ストリーム（テキストデコード ＋ 改行分割）
const textDecoder = new TextDecoderStream();
const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
const reader = textDecoder.readable
  .pipeThrough(new TransformStream(new LineBreakTransformer()))
  .getReader();

// 受信ループ
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  if (value) {
    const response = JSON.parse(value);
    console.log("RP2350からの応答:", response);
  }
}